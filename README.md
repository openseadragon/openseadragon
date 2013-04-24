# OpenSeadragon 

An open-source, web-based viewer for zoomable images, implemented in pure JavaScript.

See it in action at http://openseadragon.github.io/.

## Stable Builds

See our [releases page](http://openseadragon.github.io/releases/).

## First Time Setup

All command-line operations are scripted using [Grunt](http://gruntjs.com/) which is based on [Node.js](http://nodejs.org/). To get set up:

1. Install Node, if you haven't already (available at the link above)
1. Install the Grunt command line runner (if you haven't already); on the command line, run `npm install -g grunt-cli`
1. Clone the openseadragon repository
1. On the command line, go in to the openseadragon folder
1. Run `npm install`

You're set... continue reading for build and test instructions.

## Building from Source

To build, just run (on the command line, in the openseadragon folder):

    grunt

If you want Grunt to watch your source files and rebuild every time you change one, use:

    grunt watch

The built files appear in the `build` folder.

If you want to build tar and zip files for distribution (they will also appear in the `build` folder), use:

    grunt package

Note that the `build` folder is masked with .gitignore; it's just for your local use, and won't be checked in to the repository.

You can also publish the built version to the site-build repository. This assumes you have cloned it next to this repository. The command is:

    grunt publish

... which will delete the existing openseadragon folder, along with the .zip and .tar.gz files, out of the site-build folder and replace them with newly built ones from the source in this repository; you'll then need to commit the changes to site-build.

## Testing

Our tests are based on [QUnit](http://qunitjs.com/) and [PhantomJS](http://phantomjs.org/); they're both installed when you run `npm install`. At the moment we don't have much in the way of tests, but we're working to fix that. To run on the command line:

    grunt test

If you wish to work interactively with the tests or test your changes:

    grunt connect watch

and open `http://localhost:8000/` in your browser

## Contributing

OpenSeadragon is truly a community project; we welcome your involvement!

When contributing, please attempt to match the code style already in the codebase. Note that we use four spaces per indentation stop. For more thoughts on code style, see https://github.com/rwldrn/idiomatic.js/.

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

[![Build Status](https://secure.travis-ci.org/openseadragon/openseadragon.png?branch=master)](http://travis-ci.org/openseadragon/openseadragon)
