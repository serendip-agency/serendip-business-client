var gulp = require('gulp');
var ts = require('gulp-typescript');
var clean = require('gulp-clean');
var child = require('child_process');
var moment = require('moment');
var fs = require('fs');
var mocha = require('gulp-mocha');

var paths = {
    dist: 'dist',
    logs: 'logs/*',
    tsSources: 'src/**/*.ts'
};


var server;
var serverLog = fs.createWriteStream('./logs/' + moment().format('YYYY-MM-DD HH-mm') + '.log', { flags: 'a' });

var run = function () {

    if (server)
        if (server.kill)
            server.kill();

    server = child.spawn('node', [
        'bin/server.js',
        '--dir=www/localhost',
    ],
        { stdio: 'inherit' });


    return Promise.resolve();

};


gulp.task('test', ['ts'], function () {
    return gulp.src(['test/*.js'], { read: false })
        .pipe(mocha({
            reporter: 'spec'
        }));
});

gulp.task('upload', ['release'], function () {

    // TO DO
    return gulp.src('path/to/file')
        .pipe(gulpDeployFtp({
            remotePath: '/tmp',
            host: 'localhost',
            port: 21,
            user: 'foo',
            pass: 'bar'
        }));


});


gulp.task('cleanLogs', function () {

    return gulp.src(paths.logs, { read: false })
        .pipe(clean());

});

// clean dist folder
gulp.task('clean', function (cb) {

    return gulp.src(paths.dist, { read: false })
        .pipe(clean());

});


// compile typescripts
gulp.task('ts', function () {

    return gulp.src(paths.tsSources)
        .pipe(ts({
            noImplicitAny: false,
            target: 'es2017',
            sourceMap: true,
            module: 'CommonJS',
            baseUrl: ".",
            paths: {
                "*": [
                    "node_modules/*",
                    "src/types/*"
                ]
            }
        }))
        .pipe(gulp.dest(paths.dist));

});

// whats typescripts , compile and then run
gulp.watch(paths.tsSources, ['run']);
gulp.watch('bin/**.js', run);



// clean before build
gulp.task('preBuild', ['clean']);

// clean and compile
gulp.task('build', ['preBuild', 'ts'], function () {


    return Promise.resolve();

});


// compile and run node process 
gulp.task('run', ['ts'], run);


gulp.task('default',
    [
        'build',
        'run'
    ], function () {
        return Promise.resolve();


    });