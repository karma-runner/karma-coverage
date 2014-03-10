# karma-coverage [![Build Status](https://travis-ci.org/karma-runner/karma-coverage.png?branch=master)](https://travis-ci.org/karma-runner/karma-coverage)

> Generate code coverage using [Istanbul].

## Installation

The easiest way is to keep `karma-coverage` as a devDependency in your `package.json`.
```json
{
  "devDependencies": {
    "karma": "~0.10",
    "karma-coverage": "~0.1"
  }
}
```

You can simple do it by:
```bash
npm install karma-coverage --save-dev
```

Once you have the dependency installed, you have to include it in your plugin array on your `karma.conf.js` file:

```json
plugins: [
    'karma-jasmine',
    'karma-phantomjs-launcher',
    'karma-coverage'
]
```

## Configuration
Following code shows the default configuration...
```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    files: [
      'src/**/*.js',
      'test/**/*.js'
    ],

    // coverage reporter generates the coverage
    reporters: ['progress', 'coverage'],

    preprocessors: {
      // source files, that you wanna generate coverage for
      // do not include tests or libraries
      // (these files will be instrumented by Istanbul)
      'src/*.js': ['coverage']
    },

    // optionally, configure the reporter
    coverageReporter: {
      type : 'html',
      dir : 'coverage/'
    }
  });
};
```

### Options
#### type
**Type:** String

**Possible Values:**
  * `html` (default)
  * `lcov` (lcov and html)
  * `lcovonly`
  * `text`
  * `text-summary`
  * `cobertura` (xml format supported by Jenkins)
  * `teamcity` (code coverage System Messages for TeamCity)

If you set `type` to `text` or `text-summary`, you may set the `file` option, like this.
```javascript
coverageReporter = {
  type : 'text',
  dir : 'coverage/',
  file : 'coverage.txt'
}
```
If no filename is given, it will write the output to the console.

#### dir
**Type:** String

**Description:** This will be used to output coverage reports. When
  you set a relative path, the directory is resolved against the `basePath`.

#### multiple reporters
You can use multiple reporters, by providing array of options.

```javascript
coverageReporter: {
  reporters:[
    {type: 'html', dir:'coverage/'},
    {type: 'teamcity'},
    {type: 'text-summary'}
  ],
}
```
 
----

For more information on Karma see the [homepage].


[homepage]: http://karma-runner.github.com
[Istanbul]: https://github.com/yahoo/istanbul
