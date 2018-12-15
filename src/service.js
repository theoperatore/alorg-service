const http2 = require('http2');
const dnssd = require('dnssd');
const portfinder = require('portfinder');
const log = require('./utils/log').serviceLogger;

const {
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP2_METHOD_POST,
  HTTP2_METHOD_GET,
} = http2.constants;

function createService(name) {
  const alorgType = dnssd.tcp('_alorg');
  const server = http2.createServer();

  const routes = {};

  // do some custom error logging...
  server.on('sessionError', err => log.error(err));
  server.on('error', err => log.error(err));

  // handle requests and route to the correct handler
  server.on('stream', (stream, requestHeaders) => {
    const path = requestHeaders[HTTP2_HEADER_PATH];
    const method = requestHeaders[HTTP2_HEADER_METHOD];

    function callback(error, payload) {
      if (error) {
        const { status, message } = error;
        const outStatus = status || 500;
        stream.respond({ [HTTP2_HEADER_STATUS]: outStatus });
        const errorPayloadBuffer = Buffer.from(typeof message === 'string' ? message : JSON.stringify(message));
        stream.end(errorPayloadBuffer);

        log.info(`[${method}] ${path} ${outStatus}`);
        return;
      }

      if (!payload) {
        stream.respond({ [HTTP2_HEADER_STATUS]: 204 }, { endStream: true });
        log.info(`[${method}] ${path} ${204}`);
        return;
      }

      const out = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const payloadBuffer = Buffer.from(out);

      stream.respond({
        [HTTP2_HEADER_STATUS]: 200,
        [HTTP2_HEADER_CONTENT_LENGTH]: payloadBuffer.length,
      });
      stream.end(payloadBuffer);
      log.info(`[${method}] ${path} ${200}`);
    }

    const handler = routes[`${method}:${path}`];
    if (handler) {
      // attach parsed headers for this request
      // so users can use them;
      stream.request = {
        // TODO: allow for path params and inject them here
        //       need to find a better way to register routes...
        // params: {},
        headers: requestHeaders,
      };

      handler(stream, callback);
      return;
    }

    log.info(`[${method}] ${path} ${404}`);
    stream.respond({ [HTTP2_HEADER_STATUS]: 404 }, { endStream: true });
  });

  return {
    request(method, path, handler) {
      const route = `${method}:${path}`;
      routes[route] = handler;

      log.info(`registered route: ${route}`);
      return true;
    },
    get(path, handler) {
      return this.request(HTTP2_METHOD_GET, path, handler);
    },
    post(path, handler) {
      return this.request(HTTP2_METHOD_POST, path, handler);
    },
    async listen(cb) {
      const port = await portfinder.getPortPromise();
      const advert = new dnssd.Advertisement(alorgType, port, { name });
      advert.start();
      server.listen(port);
      log.info(`advertising: ${name}._alorg._tcp.local.`);
      log.info(`server binding to port: ${port}`);
      cb && typeof cb === 'function' && cb();
    },
    server,
  };
}

module.exports = createService;
