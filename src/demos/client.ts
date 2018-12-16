const createClient = require('../client');

const client = createClient();

client.get('alorg://demo-service/health_check').then(response => console.log(response.payload, response.headers));
