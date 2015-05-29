'use strict';

let gulp = require('gulp');
let nodemon = require('gulp-nodemon');

gulp.task('default', function () {
    nodemon({
        script: 'server.js',
        ext: 'js',
        env: {
            DEBUG: '*',
        },
    });
});
