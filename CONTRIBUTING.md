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

All command-line operations for building and testing OpenSeadragon are scripted using [Bun](https://bun.sh/). To get set up:

1. Install Bun (visit [bun.sh](https://bun.sh/) for instructions, or run):
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```
1. Clone the openseadragon repository
1. On the command line, go in to the openseadragon folder
1. Run `bun install`

You're set! All development dependencies should have been installed and the project built automatically. Continue reading for build and test instructions.

### Building from Source

To build, just run (on the command line, in the openseadragon folder):

    bun run build

This creates both the full and minified versions of the library. For a faster development build (without minification):

    bun run build:fast

The built files appear in the `build` folder.

To have Bun watch your source files and rebuild every time you change one, and also run a development server for testing:

    bun run dev

This starts a server at http://localhost:8000 with automatic rebuilding on file changes.

If you want to build tar and zip files for distribution (they will also appear in the `build` folder), use:

    bun run package

Note that the `build` folder is masked with .gitignore; it's just for your local use, and won't be checked in to the repository.

You can also publish the built version to the site-build repository. This assumes you have cloned it next to this repository. The command is:

    bun run publish

... which will delete the existing openseadragon folder, along with the .zip and .tar.gz files, out of the site-build folder and replace them with newly built ones from the source in this repository; you'll then need to commit the changes to site-build.

### Package Manager and Lock Files

This project uses [Bun](https://bun.sh/) as both the JavaScript runtime and package manager. Bun uses its own binary lock file (`bun.lockb`) instead of npm's `package-lock.json`. This is intentional:

- **`bun.lockb`**: Bun's lock file is committed to the repository to ensure reproducible builds
- **`package-lock.json`**: Added to `.gitignore` since we use Bun for package management

If you prefer using npm, you can still run `npm install` and it will work, but for consistency and faster installation, we recommend using Bun.

### Testing

Our tests are based on [QUnit](https://qunitjs.com/) and [Puppeteer](https://github.com/GoogleChrome/puppeteer); they're both installed when you run `bun install`. To run on the command line:

    bun run test

This builds the project and runs all tests in a headless browser.

To test a specific module only (e.g., `navigator`):

    bun run test -- --module="navigator"

> [!TIP]
> The module name can be found in the test file's module definition: `QUnit.module('<name here>', ...`

If you wish to work interactively with the tests or test your changes:

    bun run dev

Then open `http://localhost:8000/test/test.html` in your browser.

Another good page, if you want to interactively test out your changes, is `http://localhost:8000/test/demo/basic.html`.

### Code Coverage

You can generate a code coverage report for the tests:

    bun run coverage

This instruments the source files, runs the tests, and generates both a text summary and an HTML report in the `coverage/` directory.

### TypeScript Definition Checks

The project maintains TypeScript type definitions in `types/index.d.ts`. To validate these:

    bun run dts

This runs both the definition validation and smoke tests. You can also run them individually:

    bun run dts:check   # Validate the type definitions
    bun run dts:smoke   # Run compile tests against the definitions

### Installing from forked Github repo/branch

This project is compatible with direct installation of forked Github repos/branches (possible because of the [prepare](https://docs.npmjs.com/cli/v10/using-npm/scripts#prepare-and-prepublish) script).  This enables quick testing of a bugfix or feature addition via a forked repo.  In order to do this:

1. Ensure you have Bun installed (see First Time Setup above)
1. Remove any currently installed openseadragon package via `bun remove openseadragon` or `npm uninstall openseadragon`
1. Add the specific forked repo/branch by running `bun add git://github.com/username/openseadragon.git#branch-name`. Make sure to replace username and branch-name with proper targets.

During installation, the package will be automatically built and can then be used via `import Openseadragon from 'openseadragon'` or `var Openseadragon = require('openseadragon')` statements as if the official package were installed.

### Async Debugging
Some things like data loading and processing is asynchronous. To debug, you can use ``OpenSeadragon.trace(...)``
method, which does not force synchronization and preserves the original behavior as much as possible.
Note that you should not publish calls to this method in production code.
