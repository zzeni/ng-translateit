/*

Note: to start watching for changes and autobuilding run `grunt watch`

*/

module.exports = function (grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        separator: ';\n'
      },
      dist: {
        src: ['src/app.js',
              'src/initializers/**/*.js',
              'src/resources/**/*.js',
              'src/api.js',
              'src/filters.js',
              'src/directives/**/*.js',
              'src/services/**/*.js',
              'src/controllers/**/*.js'],
        dest: 'dist/<%= pkg.name %>.js'
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      },
      dist: {
        files: {
          'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      }
    },
    ngconstant: {
      options: {
        name: 'config',
        dest: 'dist/config.js',
        wrap: '"use strict";\n\n{%= __ngModule %}',
        space: '  ',
        constants: {
          config: {
            debug: false,
            LANGUAGE_KEYS: ['en', 'es'],
            FB_CLIENT_ID: "562175730613525",
            API_FB_AUTH_URL: "/api/facebook-login",
            GOOGLE_BROWSER_KEY: "AIzaSyANtLSp4B1JZ3wkGA-FpmqpGon4q83gaVY",
            GOOGLE_MAPS_URL: "https://maps.googleapis.com/maps/api/js"
          }
        }
      },
      development: {
        constants: {
          config: {
            ENV: 'development',
            SITE_URL: 'http://localhost:7888/',
            debug: true
          }
        }
      },
      production: {
        constants: {
          config: {
            ENV: 'production',
            SITE_URL: 'http://dev.bemyguide.today:8081/',
          }
        }
      }
    },
    watch: {
      scripts: {
        files: ['src/**/*.js'],
        tasks: ['default'],
        options: {
          spawn: false,
          interrupt: true
        },
      },
    },
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-ng-constant');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Tasks
  grunt.registerTask('config_prod', 'ngconstant:production');
  grunt.registerTask('config', 'ngconstant:development');
  grunt.registerTask('build', ['concat', 'uglify']);
  grunt.registerTask('production', ['config_prod', 'build']);
  grunt.registerTask('default', ['config', 'build']);
};