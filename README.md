# AEJS

Asynchroneous Embedded JavaScript Templates.

## Installation

    $ npm install aejs

## Features

  * Parts of the EJS template can be build asyncroneous
  * Ability to `include` files to build part of the template out of 
  other files
  * Master pages. Declare that the template fills some places in 
  another `master` template.

## Example

	<% 
	var fs = require('fs'); 
	%>
	<div>
	<h1>List of the files in the folder:</h1>
	<%(scope) 
	fs.readdir(locals.dir, function(err, files) {
		for (var i=0; i<files.length; i++) {
			%>
			<p><%= files[i] %></p>
			<%
		}
		scope.finish();
	});
	(scope)%>
	</div>

## Usage

	aejs.renderFile(aejsFileName, args, callback);
	    => callback(err, res) will be called

	aejs.renderString(aejsTemplateString, args, callback);
	    => callback(err, res) will be called

`args` is passed to the compiled template as `locals` argument. 
The example above demonstrate this. It could be rendered with the 
follwoing code:
  
	aejs.renderString(str, { dir: __dirname }, function(err, res) {
		if (err) return console.log('Error: ' + err));
		console.log(res);
	});

## Description

The idea is to extend the embedded javascript templates with the
ability to render parts of the template asynchroneously. In order
to acheve that we extend EJS syntax with the ability to "name" any
scope frgarment.

A named fragment is started with `<%(name) ... %>` and ends with
`<% ... (name)%>`. Everything between the fragment start and end 
goes in it. Starting a fragment declares a javascript local
variable with that name. We must explicitly "signal" that we have
completed putting things in it by calling `name.finish();`.

Don't forget to call `name.finish();` if you name a fragment,
otherwise the rendering of the template will never finish.


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
