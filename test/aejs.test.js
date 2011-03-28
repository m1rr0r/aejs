var fs = require('fs');
var assert = require('assert');
var inspect = require('util').inspect;

var aejs = require('../lib/aejs');

var aejsTest = function (expected, template, options, cb) {
    if (!cb) {
        cb = options;
        options = null;
    }

    aejs.renderString(template, options, function (err, res) {
        if (err) return cb(err);
        if (res == expected) return cb(null);
        console.log('Fail: "' + expected + '" == "' + res + '"');
        cb(true);
    });
};

var aejsTestFiles = function (expected, template, options, cb) {
    if (!cb) {
        cb = options;
        options = null;
    }

    fs.readFile(expected, 'utf8', function (eerr, eres) {
        if (eerr) return cb(eerr);

        aejs.renderFile(template, options, function (rerr, rres) {
            if (rerr) return cb(rerr);
            if (rres == eres) return cb(null);
            console.log('Fail: "' + eres + '" == "' + rres + '"');
            cb(true);
        });
    });
};

var test_suite = {
    "static": function (cb) {
        aejsTest("<html></html>", "<html></html>", cb);
    },

    "escape output": function (cb) {
        aejsTest("<html><p>1</p></html>", "<html><% var x = 1; %><p><%= x %></p></html>", cb);
    },

    "unescaped output": function (cb) {
        aejsTest("<html><p>1</p></html>", "<html><% var x = 1; %><p><%- x %></p></html>", cb);
    },

    "direct output using global scope": function (cb) {
        aejsTest("<html><p>opa</p></html>", "<html><% var x = 1; %><p><% global.push('opa'); %></p></html>", cb);
    },

    "for in global scope": function (cb) {
        aejsTest("<html><p>0</p><p>1</p><p>2</p></html>", 
        "<html><% for (var i=0; i<3; i++) { %><p><%= i %></p><% } %></html>", cb);
    },

    "for in own scope": function (cb) {
        aejsTest("<html><p>0</p><p>1</p><p>2</p></html>", 
        "<html><%(s1) for (var i=0; i<3; i++) { %><p><%= i %></p><% } s1.finish(); (s1)%></html>", cb);
    },

    "one async scope": function (cb) {
        aejsTest("<html><p>Ok</p></html>", 
        "<html><%(s1) require('fs').stat(__filename, function(err, res) { %><p>Ok</p><% s1.finish(); }); (s1)%></html>", cb);
    },

    "two async scopes": function (cb) {
        aejsTest("<html><p>Ok1</p><p>Ok2</p></html>", 
        "<% var fs = require('fs'); %><html><%(s1) \
            fs.stat(__filename, function(err, res) { %><p>Ok1</p><% s1.finish(); }); \
            (s1)%><%(s2) \
            fs.stat(__filename, function(err, res) { %><p>Ok2</p><% s2.finish(); }); \
            (s2)%></html>", cb);
    },

    "nested async scopes": function (cb) {
        aejsTest("<html><p>s1 start</p><p>s2 here</p><p>s1 end</p></html>", 
        "<% var fs = require('fs'); %><html><%(s1) \
            fs.stat(__filename, function(err, res) { %><p>s1 start</p><%(s2) \
            fs.stat(__filename, function(err, res) { %><p>s2 here</p><% s2.finish(); }); \
            (s2)%><p>s1 end</p><% \
            s1.finish(); }); \
            (s1)%></html>", cb);
    },

    "include one": function (cb) {
        aejsTestFiles(__dirname + "/include.one-expected.aejs", __dirname + "/include.one-main.aejs", { dir: __dirname}, cb);
    },

    "master one": function (cb) {
        aejsTestFiles(__dirname + "/master-expected.aejs", __dirname + "/master-content1.aejs", { dir: __dirname }, cb);
    },

    "master with include": function (cb) {
        aejsTestFiles(__dirname + "/master-include-expected.aejs", __dirname + "/master-include-content.aejs", { dir: __dirname }, cb);
    }

};

var run = function (tests, cb) {
    var testArr = [];
    for (var test in tests) {
        testArr.push({ name: test, fn: tests[test] });
    }

    var report = {
        total: testArr.length,
        pass: 0,
        fail: 0
    };

    var current = 0;
    var runNext = function () {
        if (current >= testArr.length) return cb(null, report);
        //console.log('Starting ' + testArr[current].name);
        var startTime = new Date();
        testArr[current].fn(function (err, res) {
            var totalTime = new Date() - startTime;
            if (err) {
                report.fail++;
                console.log('Fail: ' + testArr[current].name);
            } else {
                report.pass++;
                console.log('Pass: [' + totalTime + '] ' + testArr[current].name);
            }

            current++;
            runNext();
        });
    };

    runNext();
}

console.log('If the last output line does not show "Ok: ..." some of the tests have failed');
var sub = {
    t1: test_suite["include one"]
};
run(test_suite, function (err, res) {
    console.log('Ok: ' + inspect(res));
});
