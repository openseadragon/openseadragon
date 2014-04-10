# OpenSeadragon

An open-source, web-based viewer for zoomable images, implemented in pure JavaScript.

See it in action and get started using it at http://openseadragon.github.io/.

## Stable Builds

See the [GitHub releases page](https://github.com/openseadragon/openseadragon/releases).

## Development

If you want to use OpenSeadragon in your own projects, you can find the latest stable build, API documentation, and example code at http://openseadragon.github.io/. If you want to modify OpenSeadragon and/or contribute to its development, read on.

### First Time Setup

All command-line operations for building and testing OpenSeadragon are scripted using [Grunt](http://gruntjs.com/) which is based on [Node.js](http://nodejs.org/). To get set up:

1. Install Node, if you haven't already (available at the link above)
1. Install the Grunt command line runner (if you haven't already); on the command line, run `npm install -g grunt-cli`
1. Clone the openseadragon repository
1. On the command line, go in to the openseadragon folder
1. Run `npm install`

You're set... continue reading for build and test instructions.

### Building from Source

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

### Testing

Our tests are based on [QUnit](http://qunitjs.com/) and [PhantomJS](http://phantomjs.org/); they're both installed when you run `npm install`. At the moment we don't have much in the way of tests, but we're working to fix that. To run on the command line:

    grunt test

If you wish to work interactively with the tests or test your changes:

    grunt connect watch

and open `http://localhost:8000/test/test.html` in your browser.

Another good page, if you want to interactively test out your changes, is `http://localhost:8000/test/demo/basic.html`.

### Contributing

OpenSeadragon is truly a community project; we welcome your involvement!

When contributing, please attempt to match the code style already in the codebase. Note that we use four spaces per indentation stop. For more thoughts on code style, see https://github.com/rwldrn/idiomatic.js/.

When fixing bugs and adding features, when appropriate please also:

* Update related doc comments (we use [JSDoc 3](http://usejsdoc.org/))
* Add/update related unit tests

If you're new to the project, check out our [good first bug](https://github.com/openseadragon/openseadragon/issues?labels=good+first+bug&page=1&state=open) issues for some places to dip your toe in the water.

If you're new to open source in general, check out [GitHub's open source intro guide](https://guides.github.com/overviews/os-contributing/).

## License

OpenSeadragon is released under the New BSD license.  For details, see the file LICENSE.txt.

[![Build Status](https://secure.travis-ci.org/openseadragon/openseadragon.png?branch=master)](http://travis-ci.org/openseadragon/openseadragon)
