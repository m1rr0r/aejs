var express = require('express');
var path = require('path');
var inspect = require('util').inspect;

var aejs = require('../lib/aejs.js');

var locals = { dir: __dirname };

var app = express.createServer();

var send = function (res, templateFileName) {
    aejs.renderFile(__dirname + templateFileName, locals, function (err, render) {
        if (err) return res.send(err.toString());
        res.send(render);
    });
};

app.get('/', function (req, res) {
    send(res, '/example4.aejs');
});

app.get('*', function (req, res) {
    send(res, req.url);
});

console.log('try http://localhost:3000/');
app.listen(3000);

