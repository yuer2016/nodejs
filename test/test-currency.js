var currency = require('./currency');

var http  = require('http');

var fs = require('fs');

var server  = http.createServer(function(request,response){
    getTitle(response);
}).listen(8888,"127.0.0.1");

function getTitle(response){
    fs.readFile('./titles.json',function (err,data){
        if (err) {
            badError(err,response);
        }else{
            getTemplate(JSON.parse(data.toString()),response);
        }
    });
}

function getTemplate(titles,response) {
    fs.readFile('./template.html',function(err,data){
        if(err){
            hadError(err,response);
        }else{
            formatHtml(titles,data.toString(),response);
        }

    });
}

function formatHtml(titles,tmpl,response) {
    var html = tmpl.replace('%',titles.join('</li><li>'));
    response.writeHead(200,{'Content-Type':'text/html'});
    response.end(html);
}

function hadError(err,re) {
    console.log(err);
    response.end('server Error');
}