var http = require('http');
var spn = require('child_process').spawn;


//create a server object:
http.createServer(function (req, res) {
  var output =  spn('node', ['./bin/run']);
  output.stdout.on('data', (data) => {
  console.log(data.toString());
});
  res.end(); //end the response
}).listen(8000); //the server object listens on port 8000