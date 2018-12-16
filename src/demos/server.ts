const createService = require('../service');

const server = createService('demo-service');

server.get('/health_check', (stream, callback) => {
  console.log(stream.request.headers);
  // :scheme http
  // :method GET
  // :path /health_check
  callback();
});

server.listen();
