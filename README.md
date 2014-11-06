# karma-coverage [![Build Status](https://travis-ci.org/karma-runner/karma-coverage.svg?branch=master)](https://travis-ci.org/karma-runner/karma-coverage)

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

## Configuration

The following code shows a simple usage:

```javascript
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
      'src/**/*.js': ['coverage']
    },

    // optionally, configure the reporter
    coverageReporter: {
      type : 'html',
      dir : 'coverage/'
    }
  });
};
```

Example use with a CoffeeScript project:

```javascript
// karma.conf.js
module.exports = function(config) {
  config.set({
    files: [
      'src/**/*.coffee',
      'test/**/*.coffee'
    ],

    // coverage reporter generates the coverage
    reporters: ['progress', 'coverage'],

    preprocessors: {
      // source files, that you wanna generate coverage for
      // do not include tests or libraries
      // (these files will be instrumented by Istanbul via Ibrik unless
      // specified otherwise in coverageReporter.instrumenter)
      'src/**/*.coffee': ['coverage'],

      // note: project files will already be converted to
      // JavaScript via coverage preprocessor.
      // Thus, you'll have to limit the CoffeeScript preprocessor
      // to uncovered files.
      'test/**/*.coffee': ['coffee']
    },

    // optionally, configure the reporter
    coverageReporter: {
      type : 'html',
      dir : 'coverage/'
    }
  });
};
```

Here is an advanced usage of karma-coverage, using severals reporters:

```javascript
// karma.conf.js
module.exports = function(config) {
  config.set({
    files: [
      'src/**/*.js',
      'test/**/*.js'
    ],
    reporters: ['progress', 'coverage'],
    preprocessors: {
      'src/**/*.js': ['coverage']
    },
    coverageReporter: {
      // specify a common output directory
      dir: 'build/reports/coverage',
      reporters: [
        // reporters not supporting the `file` property
        { type: 'html', subdir: 'report-html' },
        { type: 'lcov', subdir: 'report-lcov' },
        // reporters supporting the `file` property, use `subdir` to directly
        // output them in the `dir` directory
        { type: 'cobertura', subdir: '.', file: 'cobertura.txt' },
        { type: 'lcovonly', subdir: '.', file: 'report-lcovonly.txt' },
        { type: 'teamcity', subdir: '.', file: 'teamcity.txt' },
        { type: 'text', subdir: '.', file: 'text.txt' },
        { type: 'text-summary', subdir: '.', file: 'text-summary.txt' },
      ]
    }
  });
});
```

### Options
#### type
**Type:** String

**Description:** Specify a reporter type.

**Possible Values:**
  * `html` (default)
  * `lcov` (lcov and html)
  * `lcovonly`
  * `text`
  * `text-summary`
  * `cobertura` (xml format supported by Jenkins)
  * `teamcity` (code coverage System Messages for TeamCity)

#### dir
**Type:** String

**Description:** This will be used to output coverage reports. When
  you set a relative path, the directory is resolved against the `basePath`.

#### subdir
**Type:** String

**Description**: This will be used in complement of the `coverageReporter.dir`
option to generate the full output directory path. By default, the output
directory is set to `./config.dir/BROWSER_NAME/`, this option allows you to
custom the second part. You can either pass a `string` or a `function` which will be
called with the browser name passed as the only argument.

```javascript
coverageReporter: {
  dir: 'coverage',
  subdir: '.'
  // Would output the results into: .'/coverage/'
}
```

```javascript
coverageReporter: {
  dir: 'coverage',
  subdir: 'report'
  // Would output the results into: .'/coverage/report/'
}
```

```javascript
coverageReporter: {
  dir: 'coverage',
  subdir: function(browser) {
    // normalization process to keep a consistent browser name accross different
    // OS
    return browser.toLowerCase().split(/[ /-]/)[0];
  }
  // Would output the results into: './coverage/firefox/'
}
```

#### file

If you choose the `cobertura`, `lcovonly`, `teamcity`, `text` or `text-summary` reporters, you may set the `file` option to specify an output file.

```javascript
coverageReporter: {
  type : 'text',
  dir : 'coverage/',
  file : 'coverage.txt'
}
```

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

#### instrumenter
Karma-coverage infers the instrumenter regarding of the file extension.
  The `.coffee` files are by default covered using
  [Ibrik](https://github.com/Constellation/ibrik) (an
  [Istanbul](https://github.com/gotwarlost/istanbul) analog for
  CoffeeScript files). It is possible to override this behavior and point out an
  instrumenter for the files matching a specific pattern.
  To do so, you need to declare an object under with the keys represents the
  pattern to match, and the instrumenter to apply. The matching will be done
  using [minimatch](https://github.com/isaacs/minimatch).
  If two patterns match, the last one will take the precedence.

```javascript
coverageReporter: {
  instrumenter: {
    '**/*.coffee': 'istanbul' // Force the use of the Istanbul instrumenter to cover CoffeeScript files
  },
  // ...
}
```

----

For more information on Karma see the [homepage].


[homepage]: http://karma-runner.github.com
[Istanbul]: https://github.com/yahoo/istanbul
