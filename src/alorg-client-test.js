const alorgClient = require('./alorg-client');

alorgClient
  .post('alorg://echo-server/echo', { what: 'is up?' })
  .then(response => {
    console.log(response);
  })
  .catch(console.error);
