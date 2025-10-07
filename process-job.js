const http = require('http');

const jobId = '9b486324-897e-4c4b-ac2a-01928a568add';

const postData = JSON.stringify({
  jobId: jobId
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/queue/process',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'x-internal-key': 'default-internal-key',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error(`Erro na requisição: ${e.message}`);
});

req.write(postData);
req.end();