const gulp = require('gulp')
const exec = require('child_process').exec
const fs = require('fs')
const baseDir = `./src`
const toWatch = [`${baseDir}/*`]
const { spawn } = require('child_process')
const path = require("path")
const gulpSequence = require('gulp-sequence')

function pack() {
    return new Promise(resolve => {

        const child = spawn(`webpack`, [`--config`, path.join(__dirname, 'webpack.config.js'), `--progress`]);

        child.stdout.on('data', (data) => {
            console.log(`${data}`);
        });

        child.stderr.on('data', (data) => {
            console.error(`${data}`);
        });

        child.on('exit', function (code, signal) {
            exec(`osascript -e 'display notification "Complete" with title "WEBPACK"'`)
            exec(`cp ./build/index.js ./env/mac/index.js`)
            resolve()
        });
    })
}

gulp.task(`pack`, () => {
    console.log(`START WEBPACK`)

    return pack()
})

// gulp.task('moveFiles', function (done) {
//     var total = 0
//     var completed = 0

//     fs.readdir('./env/', function (err, dirs) {
//         var dirsList = []

//         for (var di = 0; di < dirs.length; di++) {
//             if (dirs[di] !== `.DS_Store`){
//                 dirsList.push(dirs[di])
//             }
//         }

//         fs.readdir('./src/', function (err, items) {

//             var itemsList = []

//             for (var ii = 0; ii < items.length; ii++) {
//                 if (items[ii] !== `.DS_Store`) {
//                     itemsList.push(items[ii])
//                 }
//             }

//             total = itemsList.length * dirsList.length

//             for (var d = 0; d < dirsList.length; d++) {
//                 for (var i = 0; i < itemsList.length; i++) {
//                     exec(`cp ${baseDir}/${itemsList[i]} ./env/${dirsList[d]}/src/${itemsList[i]}`, function (err, stdout, stderr) {
//                         completed++

//                         if (completed === total) {
//                             done()
//                         }
//                     })
//                 }
//             }
//         })


//     })
// })

gulp.task("build", function (done) {
    exec(`cd env/linux/src && rm bundle.zip`, function (err, stdout, stderr) {
        exec(`cd env/linux/src && zip -r bundle.zip .`, function (err, stdout, stderr) {
            console.log(err, stdout, stderr)
            done()
        })
    })
})

gulp.task(`server`, (done)=>{
    exec(`pm2 start ./build/index.js --name batchencode`, function (err, stdout, stderr) {
        console.log(err, stdout, stderr)
        done()
    })
})

gulp.task(`server-reload`, (done) => {
    exec(`pm2 restart batchencode`, function (err, stdout, stderr) {
        console.log(err, stdout, stderr)
        done()
    })
})

gulp.task('set-dev-env', function () {
    return process.env.NODE_ENV = 'development';
})

gulp.task(`dev-build`, (done)=>{
    gulpSequence(`set-dev-env`, `pack`, `server`)(done)
})

gulp.task(`dev-reload`, (done) => {
    gulpSequence(`set-dev-env`, `pack`, `server-reload`)(done)
})

gulp.task("dev", ["dev-build"], function () {
    gulp.watch(toWatch, ["dev-reload"]);
})

gulp.task("default", [
    "dev"
], function () { })