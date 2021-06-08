var http = require('http');
var spn = require('child_process').exec;
//const readline = require('readline');
var fs = require('fs');

function setenviron(line) {
    console.log(line);
    var keyvals = line.toString().split("=");
    var key = keyvals[0];
    var val = keyvals[1];
    if (key == "SPARQL") {
      process.env.SPARQL = val;
    }
    if (key == "ENDPOINT_SOURCE") {
      console.log("\n\n\nFOUND IT!!\n\n\n");
      process.env.ENDPOINT_SOURCE = val;
    }
    if (key == "ENDPOINT_TARGET") {
      process.env.ENDPOINT_TARGET = val;
    }
    if (key == "CREDENTIALS") {
      process.env.CREDENTIALS = val;
    }
    if (key == "QUERY_PATH") {
      process.env.QUERY_PATH = val;
      process.env.QUERY_FILE_PATH=val + "query";
    }
    if (key == "EXPOSE_PORT") {
      process.env.EXPOSE_PORT = val;
    }
    //code
}
//create a server object:
http.createServer(function (req, res) {
//SPARQL=http://fairdata.systems:7777/sparql
//ENDPOINT_SOURCE=http://fairdata.systems:5000/temp
//ENDPOINT_TARGET=http://fairdata.systems:8890/DAV/home/LDP/Hackathon/
//CREDENTIALS=ldp:ldp
//QUERY_PATH=/tmp/query1622631973.1765444/
//EXPOSE_PORT=5000
  var content = fs.readFileSync('/tmp/.env');
  var lines = content.toString().split("\n");
  lines.forEach(setenviron);
  console.log("processing file complete");
  console.log(process.env);
  var output =  spn('node ./bin/run');
  output.stdout.on('data', (data) => {
      console.log(data.toString());
  });
  res.end();
 }).listen(8000); //the server object listens on port 8000