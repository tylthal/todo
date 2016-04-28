var gulp = require('gulp'),
ts = require('gulp-typescript');

var tsS = ts.createProject('./tsconfig.json', {module: 'commonjs', exclude: ['./node_modules', './client']});
var tsC = ts.createProject('./tsconfig.json', {module: 'system', exclude: ['/node_modules', '/server']});

gulp.task('ts-server', function() {
  return gulp.src(['./server/**/*.ts'])
    .pipe(ts(tsS)).js.pipe(gulp.dest('./server'));
});

gulp.task('ts-client', function() {
  return gulp.src(['./client/**/*.ts'])
    .pipe(ts(tsC)).js.pipe(gulp.dest('./client'));
});

gulp.task('watch', ['ts-server', 'ts-client'], function() {
  gulp.watch('./**/*.ts', ['ts-server', 'ts-client']);
});
