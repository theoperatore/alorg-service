const createClient = require('../client');

const client = createClient();

client.get('alorg://dnd-monster-api/health_check').then(response => console.log(response.payload, response.headers));
