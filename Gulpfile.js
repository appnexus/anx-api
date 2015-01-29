var gulp = require('gulp');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');

gulp.task('default', ['lint']);

gulp.task('lint', function () {
	return gulp.src('./lib/*.js')
		.pipe(jshint())
		.pipe(jshint.reporter('default'))
		.pipe(jshint.reporter('fail'));
});

function mochaTest() {
	return gulp.src('*/*.mspec.js', {
			read: false
		})
		.pipe(mocha({
			reporter: 'spec'
		}));
}

gulp.task('test', function () {
	return mochaTest();
});

gulp.task('ci-test', ['lint'], function () {
	return mochaTest();
});
