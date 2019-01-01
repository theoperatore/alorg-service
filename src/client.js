const http2 = require('http2');
const dnssd = require('dnssd');
const log = require('./utils/log').clientLogger;

const {
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_STATUS,
  HTTP2_METHOD_POST,
  HTTP2_METHOD_GET,
} = http2.constants;

class AlorgClient {
  // ex: alorg://<service-name>/<path>/<more-path>
  resolveService(alorgUrl) {
    const [alorgPart, servicePathPart] = alorgUrl.split('://');
    if (!alorgPart || alorgPart !== 'alorg') {
      throw new Error('Incorrectly formatted url:', alorgUrl);
    }

    const [serviceName, ...pathParts] = servicePathPart.split('/');
    const serviceFQDN = `${serviceName}._alorg._tcp.local.`;
    return dnssd.resolveService(serviceFQDN).then(service => ({
      path: `/${pathParts.join('/')}` || '/',
      url: `http://${service.addresses[0]}:${service.port}`,
    }));
  }

  async request(method, alorgUrl, options = {}, maybePayload) {
    const { path, url } = await this.resolveService(alorgUrl);
    return new Promise((resolve, reject) => {
      const client = http2.connect(url);
      const requestOptions = Object.assign(
        {},
        {
          [HTTP2_HEADER_METHOD]: method,
          [HTTP2_HEADER_PATH]: path,
        },
        options,
      );
      const stream = client.request(requestOptions);

      stream.setEncoding('utf8');
      stream.on('response', headers => {
        log.debug(`[${method}] ${alorgUrl} ${url} ${path} ${headers[HTTP2_HEADER_STATUS]}`);

        let payload = '';
        stream.on('data', chunk => {
          payload += chunk;
        });
        stream.on('end', () => {
          resolve({ payload, headers });
          stream.close();
          client.close();
        });
      });

      if (maybePayload) {
        const payload = typeof maybePayload === 'string' ? maybePayload : JSON.stringify(maybePayload);
        stream.end(Buffer.from(payload));
      }
    });
  }

  get(path, options = {}, maybePayload) {
    return this.request(HTTP2_METHOD_GET, path, options, maybePayload);
  }

  post(path, options = {}, maybePayload) {
    return this.request(HTTP2_METHOD_POST, path, options, maybePayload);
  }
}

function createClient() {
  return new AlorgClient();
}

module.exports = createClient;
