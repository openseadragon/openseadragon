### Contributing

OpenSeadragon is truly a community project; we welcome your involvement!

When contributing, please attempt to match the code style already in the codebase.
However, we are in the process of changing our code style (see issue [#456](https://github.com/openseadragon/openseadragon/issues/456)), so avoid spaces inside parentheses and square brackets. Note that we use four spaces per indentation stop. For easier setup you can also install [EditorConfig](https://editorconfig.org/) if your IDE is supported. For more thoughts on code style, see [idiomatic.js](https://github.com/rwldrn/idiomatic.js/).

When fixing bugs and adding features, when appropriate please also:

* Update related doc comments (we use [JSDoc 3](https://jsdoc.app/))
* Add/update related unit tests

If you're new to the project, check out our [good first issues](https://github.com/openseadragon/openseadragon/issues?labels=good+first+issue&page=1&state=open) for some places to dip your toe in the water.

If you're new to open source in general, check out [GitHub's open source intro guide](https://guides.github.com/activities/contributing-to-open-source/).

### First Time Setup

All command-line operations for building and testing OpenSeadragon are scripted using [Grunt](https://gruntjs.com/) which is based on [Node.js](https://nodejs.org/). To get set up:

1. Install Node, if you haven't already (available at the link above)
1. Install the Grunt command line runner (if you haven't already); on the command line, run `npm install -g grunt-cli`
1. Clone the openseadragon repository
1. On the command line, go in to the openseadragon folder
1. Run `npm install`

You're set, all development dependencies should have been installed and the project built...
continue reading for build and test instructions.

### Building from Source

To build, just run (on the command line, in the openseadragon folder):

    grunt

If you want Grunt to watch your source files and rebuild every time you change one, use:

    grunt watch

To have it watch your source files and also run a server for you to test in:

    grunt dev

The built files appear in the `build` folder.

If you want to build tar and zip files for distribution (they will also appear in the `build` folder), use:

    grunt package

Note that the `build` folder is masked with .gitignore; it's just for your local use, and won't be checked in to the repository.

You can also publish the built version to the site-build repository. This assumes you have cloned it next to this repository. The command is:

    grunt publish

... which will delete the existing openseadragon folder, along with the .zip and .tar.gz files, out of the site-build folder and replace them with newly built ones from the source in this repository; you'll then need to commit the changes to site-build.

### Testing

Our tests are based on [QUnit](https://qunitjs.com/) and [Puppeteer](https://github.com/GoogleChrome/puppeteer); they're both installed when you run `npm install`. To run on the command line:

    grunt test

To test a specific module (`navigator` here) only:

    grunt test --module="navigator"

If you wish to work interactively with the tests or test your changes:

    grunt connect watch

and open `http://localhost:8000/test/test.html` in your browser.

Another good page, if you want to interactively test out your changes, is `http://localhost:8000/test/demo/basic.html`.


> Note: corresponding npm commands for the above are:
>  - npm run test
>  - npm run test -- --module="navigator"
>  - npm run dev

You can also get a report of the tests' code coverage:

    grunt coverage

The report shows up at `coverage/html/index.html` viewable in a browser.

### Installing from forked Github repo/branch

This project is now compatible with direct installation of forked Github repos/branches via npm/yarn (possible because of the new [prepare](https://docs.npmjs.com/misc/scripts) command).  This enables quick testing of a bugfix or feature addition via a forked repo.  In order to do this:

1. Install the Grunt command line runner (if you haven't already); on the command line, run `npm install -g grunt-cli` (or `yarn global add grunt-cli`)
1. Remove any currently installed openseadragon package via `npm uninstall openseadragon` or `yarn remove openseadragon`
1. Add the specific forked repo/branch by running `npm install git://github.com/username/openseadragon.git#branch-name` or `yarn add git://github.com/username/openseadragon.git#branch-name`. Make sure to replace username and branch-name with proper targets.

During installation, the package should be correctly built via grunt and can then be used via `import Openseadragon from 'openseadragon'` or `var Openseadragon = require('openseadragon')` statements as if the official package were installed.
