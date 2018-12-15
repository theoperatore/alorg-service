# Alorg Service

Create zeroconf microservices on a local network using http/2 and mDNS, and use a simple REST-like querying syntax.

### Installation

```bash
yarn add @theoperatore/alorg-service
```

**requirements:**

| node      |
| --------- |
| `10.14.2` |

### Basic service usage

```js
const alorg = require('@theoperatore/alorg-service');

const serviceName = 'greeting-service';
const service = alorg.createService(serviceName);

// define a route to match GET requests
service.get('/say-hello', (stream, callback) => {
  // log the http2 request headers
  console.log(stream.request.headers);

  // respond with a payload body; no errors
  callback(null, 'hello world');
});

// define a route to match POST requests
service.post('/echo', (stream, callback) => {
  let payload = '';
  stream.setEncoding('utf8');

  stream.on('data', chunk => {
    payload += chunk;
  });

  stream.on('end', () => {
    callback(null, payload);
  });
});

// call this to start listening and broadcasting
service.listen();
```

The `stream` object in the handler is the [NodeJS ServerHttp2Session](https://nodejs.org/docs/latest-v10.x/api/http2.html#http2_class_serverhttp2session) so do whatever you need to to parse any payloads or stream any data. All you need to do is invoke `callback(null, payload)` to end the request stream.

`payload` can either be a `string` or an `object`.

### Basic client usage

```js
const alorg = require('@theoperatore/alorg-service');
const client = alorg.createClient();

// make a GET request to the service defined above (greeting-service)
client.get('alorg://greeting-service/say-hello').then(response => {
  console.log(response.payload, response.headers);
});

// POST some data to the /echo endpoint to the service defined above (greeting-service)
client.post('alorg://greeting-service/echo', { does: 'this even work?' }).then(response => {
  console.log(response.payload, response.headers);
});
```

Currently, there isn't a way to access the underlying `stream` object on a client request. Something for the future!

# License

MIT
