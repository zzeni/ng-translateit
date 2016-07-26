/*

Note: to start watching for changes and autobuilding run `grunt watch`

*/

module.exports = function (grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      options: {
        curly: false,
        eqeqeq: true,
        eqnull: true,
        browser: true,
        globals: {
          jQuery: true
        }
      },
      all: ['Gruntfile.js', 'js/**/*.js', 'test/**/*.js']
    },
    karma: {
      unit: {
        options: {
          frameworks: ['jasmine'],
          singleRun: true,
          browsers: ['PhantomJS'],
          files: [
            'node_modules/angular/angular.js',
            'node_modules/angular-mocks/angular-mocks.js',
            'node_modules/ngstorage/ngStorage.min.js',
            'node_modules/angular-ui-bootstrap/dist/ui-bootstrap-tpls.js',
            'node_modules/angular-aria/angular-aria.min.js',
            'node_modules/angular-animate/angular-animate.min.js',
            'node_modules/angular-material/angular-material.min.js',
            'node_modules/angular-diff-match-patch/angular-diff-match-patch.js',
            'vendor/js/diff_match_patch.js',
            'js/app.js',
            'js/services.js',
            'js/controllers.js',
//            'js/**/*.js',
            'test/**/*.js'
          ]
        }
      }
    }
  });
  
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // Tasks
  grunt.registerTask('test', ['jshint', 'karma']);
  grunt.registerTask('default', []);
};