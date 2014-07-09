# Contributing

Please read this guide before contributing to this project

### Development workflow

You should clone this repo to your local machine:

`git clone git@github.com:stormpath/stormpath.js.git`

Then you should install the required dependencies:

`npm install`

Then you can run the development environment with this command:

`grunt dev`

That will start a file watcher which will rebuild and test the code as you modify it.
Karma is used to run the tests, if it crashes because of a major error you should use
`Ctrl+C` to kill the dev environment, then run again.

### Making Pull Requests

Please ensure that the tests are running before making a pull request, and please
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
* Commit those files with a version message
* Tag the repo with the new version
* Push this new commit and take to origin

Once you are POSITIVE that everything is ready for
release you may run the grunt task:

`grunt release`

Once that task completes you should publish the package to Npm and Bower,
those tasks are not yet automated by the release task.