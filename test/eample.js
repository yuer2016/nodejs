const http = require('http');

http.createServer((request,response) => {

  response.writeHead(200,{'Content-Type':'text/plain'});

  response.end('vs code in node js \n');

}).listen(8080);

console.log('Server running at http://127.0.0.1:8080/');
