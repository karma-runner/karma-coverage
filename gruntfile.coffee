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
        src: [ 'test/*.spec.coffee' ]

  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-simple-mocha'

  grunt.registerTask 'test', ['simplemocha']
  grunt.registerTask 'default', ['jshint', 'test']


