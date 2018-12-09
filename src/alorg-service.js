// Example usage:
//
// const createService = require('./alorg-service');
//
// createService('echo-server')
//   .then(service => {
//     service.post('/echo', (stream, requestHeaders, callback) => {
//       stream.setEncoding('utf8');
//       let payload = '';
//       stream.on('data', chunk => {
//         payload += chunk;
//       });
//       stream.on('end', () => {
//         callback(null, payload);
//       });
//     });
//
//     service.get('/greeting', (stream, requestHeaders, callback) => {
//       callback(null, 'hello, world');
//     });
//
//     service.listen();
//   })
//   .catch(error => console.error('caught error', error));

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

const alorgType = dnssd.tcp('_alorg');
const server = http2.createServer();

async function createService(name) {
  const routes = {};
  const port = await portfinder.getPortPromise();
  const advert = new dnssd.Advertisement(alorgType, port, { name });

  // do some custom error logging...
  server.on('error', err => log.error(err));

  // handle requests and route to the correct handler
  server.on('stream', (stream, requestHeaders) => {
    const path = requestHeaders[HTTP2_HEADER_PATH];
    const method = requestHeaders[HTTP2_HEADER_METHOD];

    // log the request
    log.info(`[${method}] ${path}`);

    function callback(error, payload) {
      if (error) {
        const { status, message } = error;
        stream.respond({ [HTTP2_HEADER_STATUS]: status || 500 });
        const errorPayloadBuffer = Buffer.from(typeof message === 'string' ? message : JSON.stringify(message));
        stream.end(errorPayloadBuffer);
        return;
      }

      if (!payload) {
        stream.respond({ [HTTP2_HEADER_STATUS]: 204 }, { endStream: true });
        return;
      }

      const payloadBuffer = Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload));
      stream.respond({
        [HTTP2_HEADER_STATUS]: 200,
        [HTTP2_HEADER_CONTENT_LENGTH]: payloadBuffer.length,
      });
      stream.end(payloadBuffer);
    }

    const handler = routes[`${method}:${path}`];
    if (handler) {
      handler(stream, requestHeaders, callback);
      return;
    }

    log.warn(`no handler for: ${method}:${path}`);
  });

  return {
    handle(method, path, handler) {
      const route = `${method}:${path}`;
      routes[route] = handler;

      log.info(`registered route: ${route}`);
      return true;
    },
    get(path, handler) {
      return this.handle(HTTP2_METHOD_GET, path, handler);
    },
    post(path, handler) {
      return this.handle(HTTP2_METHOD_POST, path, handler);
    },
    listen() {
      advert.start();
      server.listen(port);
      log.info(`advertising: ${name}._alorg._tcp.local.`);
      log.info(`server binding to port: ${port}`);
    },
    server,
  };
}

module.exports = createService;
