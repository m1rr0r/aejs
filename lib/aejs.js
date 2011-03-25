/*!
* AEJS
* Copyright(c) 2011 Stoyan Krastev <stoyan.krastev@gmail.com>
* MIT Licensed
*/

var events = require('events');
var fs = require('fs');
var inspect = require('util').inspect;

var htmlEncode = function (str) {
    if (typeof str !== 'string') str = str.toString();
    return str
        .replace(/&(?!\w+;)/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};

var jsEscape = function (str) {
    return str;
};

var pushEscape = function (str) {
    return str
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n');
};

var pushEscapeQuote = function (str) {
    return str
        .replace(/"/g, '\\"')
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n');
};

var pushPush = function (fsrc, scope, str) {
    fsrc.push(scope + '.push(' + str + ');');
};

var newScope = function (name) {
    var waitToFinish = 1;

    var result = {
        name: name,
        promise: new (events.EventEmitter),
        buf: [],

        pushScope: function (scope) {
            if (scope.isFinished()) {
                return this.buf.push(scope.render());
            }

            var scopeIndex = this.buf.push(scope) - 1;
            waitToFinish++;
            var thisObj = this;
            scope.promise.once('finish', function () {
                thisObj.buf[scopeIndex] = scope.render();
                thisObj.finish();
            });
        },

        push: function (str) {
            this.buf.push(str);
        },

        render: function () {
            return this.buf.join("");
        },

        isFinished: function () {
            return waitToFinish < 1;
        },

        finish: function () {
            waitToFinish--;
            if (waitToFinish === 0)
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

// returns a function object that would render the template when called
var compile = function (str, options) {
    options = options || {}
    var open = options.open || exports.open || '<%'
    var close = options.close || exports.close || '%>';

    var fsrc = []; // the function source code buffer

    var escape = options.escape || htmlEncode;

    //fsrc.push('var escape = ' + escape.toString() + ';');
    //fsrc.push('var newScope = ' + newScope.toString() + ';');
    fsrc.push(
        'var result = function(locals, cb) {',
        'locals = locals || {}; locals.scope = locals.scope || {};',
        'var include = function(scope, fileName) { renderFile(fileName, locals, scope); };',
        'var masterPageFn = null;',
        'var masterPagePromise = null;',
        'var master = function(fileName) { masterPagePromise = new (require("events").EventEmitter);',
        ' compileFile(fileName, locals, function(err, res) { if (err) return cb(err); else { masterPageFn = res; masterPagePromise.emit("finish"); } }); };',
        'var global = null;',
        'var scope = {};',
        'if (typeof cb === "function") { global = newScope("global"); } else { global = cb || newScope("global"); cb = null; }');

    var scopeStack = ['global'];
    var currentIndex = 0;
    do {
        var openIndex = str.indexOf(open, currentIndex);
        if (openIndex > currentIndex) {
            pushPush(fsrc, scopeStack[scopeStack.length - 1], '"' + pushEscapeQuote(str.slice(currentIndex, openIndex)) + '"');
        }

        if (openIndex < 0) {
            // push the reminder of the text
            if (currentIndex < str.length) {
                pushPush(fsrc, scopeStack[scopeStack.length - 1], '"' + pushEscapeQuote(str.slice(currentIndex)) + '"');
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

            fsrc.push("var " + scopeName + " = scope." + scopeName + " = locals.scope." + scopeName + " || newScope('" + scopeName + "');");
            fsrc.push(scopeStack[scopeStack.length - 1] + ".pushScope(" + scopeName + ");");
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
//        while (str[currentIndex] === '\n' || str[currentIndex] === '\r')
//            currentIndex++;
    }
    while (true);

    fsrc.push(
        'locals.scope = scope;',
        'if (masterPageFn) { return masterPageFn(locals, cb); }',
        'if (masterPagePromise) { masterPagePromise.once("finish", function() { masterPageFn(locals, cb); }); return; }',
        'if (cb) global.promise.once("finish", function(){ cb(null, global.render()); });',
        'global.finish();',
        '}');

        //console.log('=======');
        //console.log(fsrc.join('\n'));
        //console.log('=======');

    eval(fsrc.join(''));

    return result;
};

var renderString = function (str, options, cb) {
    if (!cb) {
        cb = options;
        options = {};
    }

    var pageFn = compile(str, options);
    pageFn(options, cb);
};

var useRenderCache = true;
var alreadyRendered = {};

var renderFile = function (fileName, options, cb) {
    if (!cb) {
        cb = options;
        options = {};
    }

    if (useRenderCache) {
        options = options || {};
        options.cacheKey = options.cacheKey || fileName;

        var doneBefore = alreadyRendered[options.cacheKey];
        if (doneBefore) return doneBefore(options, cb);
    }

    fs.readFile(fileName, 'utf8', function (err, res) {
        if (err) return cb(err);
        renderString(res, options, cb);
    });
};

var compileFile = function (fileName, options, cb) {
    if (!cb) {
        cb = options;
        options = {};
    }

    if (useRenderCache) {
        options = options || {};
        options.cacheKey = options.cacheKey || fileName;

        var doneBefore = alreadyRendered[options.cacheKey];
        if (doneBefore) return doneBefore(options, cb);
    }

    var doneBefore = alreadyRendered[options.cacheKey];
    if (doneBefore) return cb(null, doneBefore);

    fs.readFile(fileName, 'utf8', function (err, res) {
        if (err) return cb(err);
        cb(null, compile(res, options));
    });
};

exports.version = '0.1.0';
exports.compile = compile;
exports.renderString = renderString;
exports.renderFile = renderFile;
