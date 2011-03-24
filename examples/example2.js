var path = require('path');
var inspect = require('util').inspect;

var aejs = require('../lib/aejs.js');

aejs.renderFile(__dirname + '/example2.aejs', { dir: __dirname}, function (err, res) {
    if (err) return console.log('error: ' + inspect(err));
    console.log(res);
});
