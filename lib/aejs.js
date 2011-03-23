/*!
* AEJS
* Copyright(c) 2011 Stoyan Krastev <stoyan.krastev@gmail.com>
* MIT Licensed
*/

var events = require('events');
var fs = require('fs');
var inspect = require('util').inspect;

var jsEscape = function (str) {
    return str;
};

var pushEscape = function (str) {
    return str
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n');
};

var pushPush = function (fsrc, scope, str) {
    fsrc.push(scope + '.push(' + str + ');');
};

var newScope = function () {
    var waitToFinish = 1;
    var finishSignaled = 0;
    var subScopeCount = 0;

    var result = {
        promise: new (events.EventEmitter),
        buf: [],

        startScope: function () {
            var result = newScope();
            this.buf.push(result);
            var scopeIndex = this.buf.length - 1;
            waitToFinish = 2;
            subScopeCount++;
            var thisObj = this;
            result.promise.once('finish', function () {
                thisObj.buf[scopeIndex] = result.render();
                subScopeCount--;
                if (subScopeCount === 0) {
                    thisObj.finish();
                };
            });
            return result;
        },

        push: function (str) {
            this.buf.push(str);
        },

        render: function () {
            return this.buf.join("");
        },

        finish: function () {
            finishSignaled++;
            if (finishSignaled === waitToFinish)
                this.promise.emit('finish');
        }
    };

    return result;
};

var reverseIndexOf = function(str, lookFor, startIndex) {
    for (var i=startIndex; i>-1; i--) {
        if (str[i] === lookFor) return i;
    }
    return -1;
};

var compile = function (str, options) {
    var options = options || {}
    var open = options.open || exports.open || '<%'
    var close = options.close || exports.close || '%>';

    var fsrc = []; // the function source code buffer

    var escape = options.escape || function (str) { return str; };

    fsrc.push('var result = function(locals, cb) {');
    fsrc.push('var escape = ' + escape.toString() + ';');
    fsrc.push('var newScope = ' + newScope.toString() + ';');
    fsrc.push('var global = newScope("global");');

    var scopeStack = ['global'];
    var currentIndex = 0;
    do {
        var openIndex = str.indexOf(open, currentIndex);
        if (openIndex > currentIndex) {
            pushPush(fsrc, scopeStack[scopeStack.length - 1], '"' + pushEscape(str.slice(currentIndex, openIndex)) + '"');
        }

        if (openIndex < 0) {
            // push the reminder of the text
            if (currentIndex < str.length) {
                pushPush(fsrc, scopeStack[scopeStack.length - 1], '"' + pushEscape(str.slice(currentIndex)) + '"');
            }
            break;
        };

        closeIndex = str.indexOf(close, openIndex);
        if (closeIndex < 0) throw new Error('have ' + open + ' without matching ' + close);

        var regionOpenIndex = openIndex + open.length;
        var firstchar = str[regionOpenIndex];

        // Check for new scope start
        if (firstchar == '(') {
            // get the scope name
            var closeBracketIndex = str.indexOf(')', regionOpenIndex + 1);
            if (closeBracketIndex < 0) throw new Error('have "(" without matching ")"');
            var scopeName = str.slice(regionOpenIndex + 1, closeBracketIndex);

            fsrc.push("var " + scopeName + " = " + scopeStack[scopeStack.length - 1] + ".startScope();");
            scopeStack.push(scopeName);

            regionOpenIndex = closeBracketIndex + 1;
        }

        var closeScopeName = null;
        var regionCloseIndex = closeIndex;
        // Check for end scope
        if (str[closeIndex - 1] === ')') {
            var openBracketIndex = reverseIndexOf(str, '(', closeIndex);
            if (openBracketIndex < 0) throw new Error('have ")" without matching "(" before it');
            regionCloseIndex = openBracketIndex;
            closeScopeName = str.slice(openBracketIndex + 1, closeIndex - 1);
        }

        if (firstchar === '=') {
            // push escaped eval
            pushPush(fsrc, scopeStack[scopeStack.length - 1], 'escape(' + pushEscape(str.slice(regionOpenIndex + 1, regionCloseIndex)) + ')');
        } else if (firstchar === '-') {
            // push unexsaped eval
            pushPush(fsrc, scopeStack[scopeStack.length - 1], jsEscape(str.slice(regionOpenIndex + 1, regionCloseIndex)));
        } else {
            var jssrc = jsEscape(str.slice(regionOpenIndex, regionCloseIndex));
            fsrc.push(jssrc);
        }

        if (closeScopeName) {
            var head = scopeStack.pop();
            if (closeScopeName !== head) throw new Error('mixing scopes at ' + closeScopeName + '. expected end scope name ' + head);
        }

        currentIndex = closeIndex + close.length;
        // skip trailing new-lines
        while (str[currentIndex] === '\n' || str[currentIndex] === '\r')
            currentIndex++;
    }
    while (true);

    fsrc.push('global.promise.once("finish", function(){');
    fsrc.push('     cb(null, global.render());');
    fsrc.push('});');
    fsrc.push('global.finish();');
    fsrc.push('}');


    if (options.debug) {
        console.log('===========================');
        console.log(fsrc.join('\n'));
        console.log('===========================');
    }

    eval(fsrc.join(''));

    return result;
};

var renderString = function (str, options, cb) {
    if (!cb) {
        cb = options;
        options = null;
    }

    var pageFn = compile(str, options);
    pageFn(options, cb);
};

var renderFile = function (fileName, options, cb) {
    if (!cb) {
        cb = options;
        options = null;
    }

    fs.readFile(fileName, 'utf8', function (err, res) {
        if (err) return cb(err);
        renderString(res, options, cb);
    });
};

exports.version = '0.1.0';
exports.renderString = renderString;
exports.renderFile = renderFile;
