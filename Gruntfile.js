	module.exports = function ( grunt ) {

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-recess');

	grunt.initConfig({
		uglify: {
			options: {
				mangle: {
					except: ['jQuery']
				}
			},
			main: {
				files: {
					'static/js/main.min.js': [
						
					],
				}
			}
		},
		watch: {
			scripts: {
				files: ['assets/**/*', 'Gruntfile.js'],
				tasks: [
					'jshint', 
					'concat:main',
					'recess:main'
				],
				options: {
					spawn: false,
					livereload: true
				},
			},
		},
		concat: {
			options: {
				separator: ';',
			},
			main: {
				src: [
					'bower_components/foundation/js/foundation.min.js',
					'bower_components/socket.io-client/dist/socket.io.js',
					'assets/js/**/*.js'
				],
				dest: 'static/js/main.js'
			},
		},
		jshint: {
			all: ['assets/**/*.js'],
		},
		recess: {
			main: {
				options: {
					compile: true
				},
				files: {
					'static/css/main.css': [
						'assets/less/main.less'
					]
				}
			},
			mainbuild: {
				options: {
					compile: true,
					compress: true
				},
				files: {
					'static/css/main.min.css': [
						'assets/less/main.less'
					]
				}
			}
		}
	});

	grunt.registerTask('default', 'watch');
	grunt.registerTask('build', [
		'recess:mainbuild',
		'jshint',
		'uglify:main'
	]);
};