# Contributing

Please read this guide before contributing to this project

### Development workflow

You should clone this repo to your local machine:

````bash
git clone git@github.com:stormpath/stormpath.js.git
````

Then you should install the required dependencies:

````bash
npm install
````

Then you can run the development environment with this command:

````bash
grunt dev
````

That will start a file watcher which will rebuild and test the code as you modify it.
The rebuilt files will be placed in `.tmp/` within the project folder, you should use
those files in your application if you need to depend on your changes immediately.  The `dist/`
folder is only updated when releasing (see below).

[Karma](http://karma-runner.github.io/) is used to run the tests.  If Karma crashes because of a major error you should use
`Ctrl+C` to kill the dev environment, then run again.

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
* Bump the verion numbers in these files:
 * package.json
 * bower.json
 * dist/stormpath.js
 * dist/stormpath.min.js
 * README.md
* Commit those files with a version message
* Tag the repo with the new version
* Push this new commit and take to origin

Once you are POSITIVE that everything is ready for
release you may run the grunt task:

````bash
grunt release
````

Once that task completes you should publish the package to Npm:

````bash
npm publish
````

Bower is updated automatically by the tags that were pushed by the release task