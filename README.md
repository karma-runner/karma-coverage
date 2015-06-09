# karma-coverage

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/karma-runner/karma-coverage)
 [![npm version](https://img.shields.io/npm/v/karma-coverage.svg?style=flat-square)](https://www.npmjs.com/package/karma-coverage) [![npm downloads](https://img.shields.io/npm/dm/karma-coverage.svg?style=flat-square)](https://www.npmjs.com/package/karma-coverage)

[![Build Status](https://img.shields.io/travis/karma-runner/karma-coverage/master.svg?style=flat-square)](https://travis-ci.org/karma-runner/karma-coverage) [![Dependency Status](https://img.shields.io/david/karma-runner/karma-coverage.svg?style=flat-square)](https://david-dm.org/karma-runner/karma-coverage) [![devDependency Status](https://img.shields.io/david/dev/karma-runner/karma-coverage.svg?style=flat-square)](https://david-dm.org/karma-runner/karma-coverage#info=devDependencies)

> Generate code coverage using [Istanbul].

## Installation

The easiest way is to install `karma-coverage` as a `devDependency`,
by running

```bash
npm install karma karma-coverage --save-dev
```

If you need CoffeeScript support, you should also install Ibrik:
```bash
npm install ibrik --save-dev
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
      'src/**/*.coffee': ['coverage'],

      // note: project files will already be converted to
      // JavaScript via coverage preprocessor.
      // Thus, you'll have to limit the CoffeeScript preprocessor
      // to uncovered files.
      'test/**/*.coffee': ['coffee']
    },

    // you need to manually configure Ibrik to instrument CoffeeScript files
    coverageReporter: {
        instrumenters: { ibrik: require('ibrik') },
        instrumenter: {
            'src/**/*.coffee': 'ibrik'
        }
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
  * `json` (json format supported by [`grunt-istanbul-coverage`](https://github.com/daniellmb/grunt-istanbul-coverage))

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

#### check
**Type:** Object

**Description:** This will be used to configure minimum threshold enforcement for coverage results. If the thresholds are not met, karma will return failure. Thresholds, when specified as a positive number are taken to be the minimum percentage required. When a threshold is specified as a negative number it represents the maximum number of uncovered entities allowed.

For example, `statements: 90` implies minimum statement coverage is 90%. `statements: -10` implies that no more than 10 uncovered statements are allowed.

`global` applies to all files together and `each` on a per-file basis. A list of files or patterns can be excluded from enforcement via the `exclude` property. On a per-file or pattern basis, per-file thresholds can be overridden via the `overrides` property.

```javascript
coverageReporter: {
  check: {
    global: {
      statements: 50,
      branches: 50,
      functions: 50,
      lines: 50,
      excludes: [
        'foo/bar/**/*.js'
      ]
    },
    each: {
      statements: 50,
      branches: 50,
      functions: 50,
      lines: 50,
      excludes: [
        'other/directory/**/*.js'
      ],
      overrides: {
        'baz/component/**/*.js': {
          statements: 98
        }
      }
    }
  }
}
```

#### watermarks
**Type:** Object

**Description:** This will be used to set the coverage threshold colors. The first number is the threshold between Red and Yellow. The second number is the threshold between Yellow and Green.

```javascript
coverageReporter: {
  watermarks: {
    statements: [ 50, 75 ],
    functions: [ 50, 75 ],
    branches: [ 50, 75 ],
    lines: [ 50, 75 ]
  }
}
```

#### includeAllSources
**Type:** Boolean

You can opt to include all sources files, as indicated by the coverage preprocessor, in your code coverage data, even if there are no tests covering them. (Default `false`)

```javascript
coverageReporter: {
  type : 'text',
  dir : 'coverage/',
  file : 'coverage.txt',
  includeAllSources: true
}
```

#### sourceStore
**Type:** istanbul.Store

You can opt to specify a source store allowing for external coverage collectors access to the instrumented code.

```javascript
coverageReporter: {
  type : 'text',
  dir : 'coverage/',
  file : 'coverage.txt',
  sourceStore : require('istanbul').Store.create('fslookup')
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
Karma-coverage can infers the instrumenter regarding of the file extension.
  It is possible to override this behavior and point out an
  instrumenter for the files matching a specific pattern.
  To do so, you need to declare an object under with the keys represents the
  pattern to match, and the instrumenter to apply. The matching will be done
  using [minimatch](https://github.com/isaacs/minimatch).
  If two patterns match, the last one will take the precedence.

For example you can use [Ibrik](https://github.com/Constellation/ibrik) (an
  [Istanbul](https://github.com/gotwarlost/istanbul) analog for
  CoffeeScript files) with:

```javascript
coverageReporter: {
  instrumenters: { ibrik : require('ibrik') }
  instrumenter: {
    '**/*.coffee': 'ibrik'
  },
  // ...
}
```

You can pass options additional options to specific instrumenter with:

```javascript
var to5Options = { experimental: true };

// [...]

coverageReporter: {
  instrumenters: { isparta : require('isparta') },
  instrumenter: {
    '**/*.js': 'isparta'
  },
  instrumenterOptions: {
    isparta: { to5 : to5Options }
  }
}
```


----

For more information on Karma see the [homepage].


[homepage]: http://karma-runner.github.com
[Istanbul]: https://github.com/gotwarlost/istanbul
