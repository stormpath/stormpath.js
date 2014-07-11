# Contributing

Please read this guide before contributing to this project.

It is assumed that you are on a Mac/Linux machine and
have [Node.js](http://nodejs.org) and [Grunt](http://gruntjs.com/) installed.


### Getting started

Clone this repo to your local machine:

````bash
git clone git@github.com:stormpath/stormpath.js.git
````

Then install the required dependencies:

````bash
npm install
````


### Building

You can build this library by running:

````bash
grunt build
````

The output of the task is placed in the `tmp/` folder.  The output is a [Browserified](http://browserify.org)
CommonJS bundle.  If you are developing a project which will depend on your development version of this
library you should depend on the output in this tmp directory

### Testing

The tests can be run with:

````bash
grunt test
````

The tests will run inside a Chrome instance, using [Karma](http://karma-runner.github.io/) as the test runner.
The tests also create a temporary webserver on port 8085 to run the integration tests against a
mock API.

### Automated development environment

The automated development environment will automatically run the build and tests as you modify your code.
You can run the development environment with this command:

````bash
grunt dev
````

If Karma crashes because of a major error you should use `Ctrl+C` to kill the dev environment, then run again.
If Karma appears to be exiting for no good reason you should stop the dev environment and
try running the tests manually with `grunt test`

### Making Pull Requests

Please ensure that the tests are passing before making a pull request, and please
add tests if you add new functionality.

Please make all pull requests into the `development` branch, not `master`.

### Making releases

If you are a maintainer of this repository you
can make use of the grunt release task to speed up the release process.  Before running the release task you must have:
* Merged all relevent changes and pull requests into master
* Pulled master to your local machine

The release task will do the following tasks:
* Build the project and place the ouput in the `dist` folder
* Bump the verion numbers in these files:
 * package.json
 * bower.json
 * dist/stormpath.js
 * dist/stormpath.min.js
 * README.md
* Commit those files with a version message
* Tag the repo with the new version
* Push this new commit and tag to origin/master

Once you are POSITIVE that everything is ready for
release you may run the release task:

````bash
grunt release
````

Once that task completes you should publish the package to Npm:

````bash
npm publish
````

Bower is updated automatically by the tags that were pushed by the release task

Finally, you should push the new version to the Stormpath CDN