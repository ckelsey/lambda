var fs = require('fs')
var join = require('path').join
var AWS = require('aws-sdk')
var s3Zip = require('s3-zip')
var XmlStream = require('xml-stream')

var region = 'us-east-1'
var bucket = 'cklsymedia'
var folder = 'super_res/'
var s3 = new AWS.S3({ region: region })
var params = {
    Bucket: bucket,
    Prefix: folder
}
// var page = process.env.PAGE
// var count = process.env.COUNT
var zipName = `super_res.zip`

module.exports = function (event, context, callback) {
    console.log(`handle`)
    var filesArray = []
    var files = s3.listObjects(params).createReadStream()
    var xml = new XmlStream(files)
    xml.collect('Key')
    xml.on('endElement: Key', function (item) {
        filesArray.push(item['$text'].substr(folder.length))
    })

    xml
        .on('end', function () {
            zip(filesArray)
        })

    function zip(files) {
        console.log(files)
        var output = fs.createWriteStream(join('/tmp', zipName))

        s3Zip
            .archive({ region: region, bucket: bucket, preserveFolderStructure: true }, folder, files)
            .pipe(output)
            .on(`finish`, () => {
                s3.putObject({
                    "Body": fs.createReadStream(join('/tmp', zipName)),
                    "Bucket": bucket,
                    "Key": zipName,
                    "Metadata": {
                        "Content-Length": String(fs.statSync(join('/tmp', zipName)).size)
                    }
                })
                    .promise()
                    .then(data => {
                        callback(null, data);
                    })
            })
    }
}