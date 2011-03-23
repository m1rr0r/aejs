# AEJS

Asynchroneous Embedded JavaScript Templates.

## Installation - comming soon!

    $ npm install aejs

## Features

  * Parts of the EJS template can be build asyncroneous
  * (comming soon) Support of `include` to implement master pages

## Example

	<% 
	var fs = require('fs'); 
	%>
	<html>
	<body>
	<h1>List of the files in the folder:</h1>
	<%(scope) 
	fs.readdir(locals.dir, function(err, files) {
		for (var i=0; i<files.length; i++) {
			%><p><%= files[i] %></p>
	<%
		}
		s1.finish();
	});
	(scope)%>
	</body>
	</html>

## Usage

	aejs.renderFile(aejsFileName, args, callback);
	    => callback(err, res) will be called

	aejs.renderString(aejsTemplateString, args, callback);
	    => callback(err, res) will be called

`args` is passed to the compiled template as `locals` argument. The example above demonstrate this. It could be rendered with the follwoing code:
  
	aejs.renderString(str, { dir: __dirname }, function(err, res) {
		if (err) return console.log('Error: ' + err));
		console.log(res);
	});

## License 

(The MIT License)

Copyright (c) 2011 Stoyan Krastev &lt;stoyan.krastev@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
