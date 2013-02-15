# OpenSeadragon 

This project is a fork of the OpenSeadragon project at http://openseadragon.codeplex.com/

## On the Web

http://openseadragon.github.com/

## Building from Source

All command-line operations are scripted using [Grunt](http://gruntjs.com/) which is based on [Node.js](http://nodejs.org/). After installing Node, you will need to run this command once to install the required packages:

    npm install

... then whenever you want to build, just run:

    grunt

If you want Grunt to watch your source files and rebuild every time you change one, use:

    grunt watch

The built files appear in the `build` folder.

If you want to build tar and zip files for distribution, use:

    grunt package

## Testing

Our tests are based on [QUnit](http://qunitjs.com/) and [PhantomJS](http://phantomjs.org/); they're both installed when you run `npm install`. At the moment we don't have much in the way of tests, but we're working to fix that. To run on the command line:

    grunt test

If you wish to work interactively with the tests or test your changes:

    grunt server watch

and open `http://localhost:8000/` in your browser

## Licenses

OpenSeadragon was initially released with a New BSD License ( preserved below ), while work done by Chris Thatcher is additionally licensed under the MIT License.

### Original license preserved below

-------------------------------------
License: New BSD License (BSD)
Copyright (c) 2010, OpenSeadragon
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

* Neither the name of OpenSeadragon nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

### MIT License

--------------------------------------
(c) Christopher Thatcher 2011, 2012. All rights reserved.

Licensed with the MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.