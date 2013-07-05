module.exports = (grunt) ->
  grunt.initConfig

    # JSHint options
    # http://www.jshint.com/options/
    jshint:
      adapter:
        files:
          src: 'lib/*.js'
        options:
          node: true
          strict: false

      options:
        quotmark: 'single'
        camelcase: true
        strict: true
        trailing: true
        curly: true
        eqeqeq: true
        immed: true
        latedef: true
        newcap: true
        noarg: true
        sub: true
        undef: true
        boss: true
        globals: {}

    simplemocha:
      options:
        ui: 'bdd'
        reporter: 'dot'
      unit:
        src: [ 'test/mocha-globals.coffee', 'test/*.spec.coffee' ]

    bump:
      options:
        commitMessage: 'chore: release v%VERSION%'
        pushTo: 'upstream'

  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-simple-mocha'
  grunt.loadNpmTasks 'grunt-bump'
  grunt.loadNpmTasks 'grunt-npm'
  grunt.loadNpmTasks 'grunt-auto-release'

  grunt.registerTask 'test', ['simplemocha']
  grunt.registerTask 'default', ['jshint', 'test']

  grunt.registerTask 'release', 'Build, bump and publish to NPM.', (type) ->
    grunt.task.run [
      "bump:#{type||'patch'}"
      'npm-publish'
    ]
