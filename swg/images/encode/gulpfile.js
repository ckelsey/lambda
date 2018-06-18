const gulp = require('gulp')
const exec = require('child_process').exec
const fs = require('fs')
const baseDir = `./src`
const toWatch = [`${baseDir}/*`]

gulp.task('moveFiles', function (done) {
    var total = 0
    var completed = 0

    fs.readdir('./env/', function (err, dirs) {
        var dirsList = []

        for (var di = 0; di < dirs.length; di++) {
            if (dirs[di] !== `.DS_Store`){
                dirsList.push(dirs[di])
            }
        }

        fs.readdir('./src/', function (err, items) {

            var itemsList = []

            for (var ii = 0; ii < items.length; ii++) {
                if (items[ii] !== `.DS_Store`) {
                    itemsList.push(items[ii])
                }
            }

            total = itemsList.length * dirsList.length

            for (var d = 0; d < dirsList.length; d++) {
                for (var i = 0; i < itemsList.length; i++) {
                    exec(`cp ${baseDir}/${itemsList[i]} ./env/${dirsList[d]}/src/${itemsList[i]}`, function (err, stdout, stderr) {
                        completed++

                        if (completed === total) {
                            done()
                        }
                    })
                }
            }
        })


    })
})

gulp.task("build", function (done) {
    exec(`cd env/linux/src && rm imageencode.zip`, function (err, stdout, stderr) {
        exec(`cd env/linux/src && zip -r imageencode.zip .`, function (err, stdout, stderr) {
            console.log(err, stdout, stderr)
            done()
        })
    })
})

gulp.task("dev", ["moveFiles"], function () {
    gulp.watch(toWatch, ["moveFiles"]);
})

gulp.task("default", [
    "dev"
], function () { })