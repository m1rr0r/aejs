var path = require('path');

var aejs = require('../lib/aejs.js');

aejs.renderFile(path.join(__dirname, 'example1.aejs'), { dir: __dirname}, function (err, res) {
    if (err) return console.log('error: ' + inspect(err));
    console.log(res);
});
