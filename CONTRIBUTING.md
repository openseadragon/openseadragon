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

### Project Structure

The OpenSeadragon codebase is organized as follows:

- `src/` - Source code for the core library
- `build/` - Output directory for builds (not checked into git)
- `test/` - Test files and demos
- `images/` - Images that are part of library, used in the UI


### Building from Source

To build, just run (on the command line, in the openseadragon folder):

To build, just run (on the command line, in the openseadragon folder):
    grunt

If you want Grunt to watch your source files and rebuild every time you change one, use:

    grunt watch

To have it watch your source files and also run a server for you to test in:

    grunt dev
=======
  - grunt

If you want Grunt to watch your source files and rebuild every time you change one, use:

   - grunt watch

To have it watch your source files and also run a server for you to test in:

   - grunt dev
>>>>>>> 665bf38869219939278066ac6aa9b96365af6d08

The built files appear in the `build` folder.

If you want to build tar and zip files for distribution (they will also appear in the build folder), use:

    grunt package


### Testing

Our tests are based on [QUnit](https://qunitjs.com/) and [Puppeteer](https://github.com/GoogleChrome/puppeteer); they're both installed when you run `npm install`.

You can run tests using either Grunt or npm commands:

| Task | Grunt Command | npm Command |
|------|--------------|-------------|
| Run all tests | grunt test | npm run test |
| Test specific module | grunt test --module="navigator" | npm run test -- --module="navigator" |
| Interactive testing | grunt dev | npm run dev |

For interactive testing:
1. Run `grunt dev` (or `npm run dev`)
<<<<<<< HEAD
2. Open `http://localhost:8000/test/test.html` in your browser
3. For a basic demo, visit `http://localhost:8000/test/demo/basic.html`

You can also get a report of the tests' code coverage:
    grunt coverage
=======
1. Open `http://localhost:8000/test/test.html` in your browser
1. For a basic demo, visit `http://localhost:8000/test/demo/basic.html`

You can also get a report of the tests' code coverage:
- grunt coverage
>>>>>>> 665bf38869219939278066ac6aa9b96365af6d08

The report shows up at `coverage/html/index.html` viewable in a browser.

### Installing from forked GitHub repo/branch

This project is now compatible with direct installation of forked Github repos/branches via npm/yarn (possible because of the new [prepare](https://docs.npmjs.com/misc/scripts) command).  This enables quick testing of a bugfix or feature addition via a forked repo.  In order to do this:

1. Install the Grunt command line runner (if you haven't already); on the command line, run `npm install -g grunt-cli` (or `yarn global add grunt-cli`)
1. Remove any currently installed openseadragon package via `npm uninstall openseadragon` or `yarn remove openseadragon`
1. Add the specific forked repo/branch by running `npm install git://github.com/username/openseadragon.git#branch-name` or `yarn add git://github.com/username/openseadragon.git#branch-name`. Make sure to replace username and branch-name with proper targets.

During installation, the package should be correctly built via grunt and can then be used via `import Openseadragon from 'openseadragon'` or `var Openseadragon = require('openseadragon')` statements as if the official package were installed.

### Pull Request Workflow

When you're ready to contribute your changes:

1. **Fork the repository** if you haven't already
1. **Create a branch** for your feature or bugfix (`git checkout -b my-new-feature`)
1. **Make your changes** following the code style guidelines
1. **Run the tests** to ensure nothing breaks (`grunt test`)
1. **Commit your changes** (`git commit -am 'Add some feature'`)
1. **Push to your branch** (`git push origin my-new-feature`)
1. **Create a Pull Request** from your fork to the main repository

Please provide a clear description in your pull request that explains:
- What the change does
- Why it's needed
- How it's been tested
- Any related issues (use "Fixes #123" or "Relates to #123" syntax)


### Troubleshooting

#### Common Testing Issues

- **Tests failing in headless mode only**: This can sometimes be related to timing issues. Try running with `--no-headless` flag for debugging
- **Browser compatibility issues**: Ensure you're testing with the supported browsers
- **Timeout errors**: May indicate performance issues or blocking operations in the code

### Development Environment Tips

- **VS Code users**: Install the EditorConfig extension for automatic code style compliance
- **Browser DevTools**: Use the Network panel to debug tile loading issues
- **Debugging**: Open your browser's developer tools (F12) when testing locally
- **Test isolation**: When debugging a specific test, use `?module=moduleName` in the URL query parameters

#### Common Build Issues

- **Missing dependencies**: Run `npm install` to update all dependencies
- **Grunt errors**: Ensure you're using a compatible Node.js version (check package.json)
- **Build failing silently**: Check for JavaScript errors in your browser's console

### Developer Resources

- **API Documentation**: The documentation is available at: https://openseadragon.github.io/docs/.
- **OpenSeadragon Wiki**: Visit our [wiki](https://github.com/openseadragon/openseadragon/wiki) for additional guides
- **Community Support**: Join discussions in [GitHub issues](https://github.com/openseadragon/openseadragon/issues)
- **Demo Gallery**: See [examples](http://openseadragon.github.io/#examples-and-features) of what OpenSeadragon can do
