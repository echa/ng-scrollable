/*global module:false*/
module.exports = function(grunt) {

	'use strict';

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		banner: '/**\n' + ' * <%= pkg.name %> - <%= pkg.description %>\n' +
				' * @version <%= pkg.version %> - ' +
				'built on <%= grunt.template.today("yyyy-mm-dd") %>\n' +
				' * @link <%= pkg.homepage %>\n' +
				' * @license MIT License, Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' + ' */\n',
		clean: {
			files: ['min', ['src/template/*.js']]
		},
		uglify: {
			options: {
				banner: '<%= banner %>',
				mangle: true,
				compress: {
					booleans: true,
					cascade: true,
					comparisons: true,
					conditionals: true,
					dead_code: true,
					drop_console: true,
					if_return: true,
					join_vars: true,
					loops: true,
					properties: true,
					pure_getters: true,
					sequences: true,
					unused: true,
				}
			},
			min: {
				files: {
					'min/ng-scrollable.min.js': ['src/*.js']
				}
			}
		},
		html2js: {
			src: ['src/template/*.html']
		},
		jshint: {
			gruntfile: {
				options: {
					jshintrc: '.jshintrc'
				},
				src: 'Gruntfile.js'
			},
			src: {
				options: {
					jshintrc: '.jshintrc'
				},
				src: 'src/*.js'
			}
		},
		csslint: {
			strict: {
				options: {
					csslintrc: '.csslintrc',
					'import': 2
				},
				src: ['assets/*.css']
			}
		},
		cssmin: {
			options: {
				banner: '<%= banner %>'
			},
			minify: {
				expand: true,
				cwd: 'assets/',
				src: ['*.css'],
				dest: 'min/',
				ext: '.min.css'
			}
		},
		watch: {
			css: {
				files: 'assets/*.css',
				tasks: ['csslint', 'cssmin']
			},
			js: {
				files: 'src/*.js',
				tasks: ['jshint', 'uglify']
			},
			livereload: {
				// Browser live reloading
				// https://github.com/gruntjs/grunt-contrib-watch#live-reloading
				files: [
					'example/*',
					'min/*'
				],
				options: {
					livereload: true
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-csslint');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerTask('default', 'Usage', function () {
		grunt.log.writeln();
		grunt.log.writeln("Usage");
		grunt.log.writeln("grunt lint  - check source files");
		grunt.log.writeln("grunt build - build minified version");
		grunt.log.writeln("grunt serve - build minified version and watch files");
	});

	grunt.registerTask('lint', ['jshint', 'csslint']);
	grunt.registerTask('build', ['clean', 'lint', 'uglify', 'cssmin']);
	grunt.registerTask('serve', ['build', 'watch']);
};
