const createService = require('./alorg-service');

createService('echo-server')
  .then(service => {
    service.post('/echo', (stream, requestHeaders, callback) => {
      stream.setEncoding('utf8');
      let payload = '';
      stream.on('data', chunk => {
        payload += chunk;
      });
      stream.on('end', () => {
        callback(null, payload);
      });
    });

    service.get('/greeting', (stream, requestHeaders, callback) => {
      callback(null, 'hello, world');
    });

    service.listen();
  })
  .catch(error => console.error('caught error', error));
