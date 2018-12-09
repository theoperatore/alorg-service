const http2 = require('http2');
const dnssd = require('dnssd');

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

  async request(method, alorgUrl, maybePayload) {
    const { path, url } = await this.resolveService(alorgUrl);
    return new Promise((resolve, reject) => {
      const client = http2.connect(url);
      const stream = client.request({
        [HTTP2_HEADER_METHOD]: method,
        [HTTP2_HEADER_PATH]: path,
      });

      stream.setEncoding('utf8');
      stream.on('response', headers => {
        console.log('response:', headers[HTTP2_HEADER_STATUS]);
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

      if (method === HTTP2_METHOD_POST) {
        const payload =
          typeof maybePayload === 'string'
            ? maybePayload
            : JSON.stringify(maybePayload);
        stream.end(Buffer.from(payload));
      }
    });
  }

  get(path, maybePayload) {
    return this.request(HTTP2_METHOD_GET, path, maybePayload);
  }

  post(path, maybePayload) {
    return this.request(HTTP2_METHOD_POST, path, maybePayload);
  }
}

module.exports = new AlorgClient();
