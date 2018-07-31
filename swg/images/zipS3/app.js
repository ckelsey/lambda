/**
 * THIS FILE IS ONLY FOR RUNNING LOCALLY
 * Creates a server
 */

var fs = require('fs')
var join = require('path').join
var AWS = require('aws-sdk')
var s3Zip = require('s3-zip')
var XmlStream = require('xml-stream')

var region = 'us-east-1'
var bucket = 'cklsymedia'
var folder = 'super_res'
AWS.config.loadFromPath('./config.json');
var s3 = new AWS.S3({ region: region })
var params = {
    Bucket: bucket,
    Prefix: folder
}
// var page = process.env.PAGE
// var count = process.env.COUNT
var zipName = `super_res7.zip`

const http = require('http')
const server = http.createServer().listen(8127);

server.on("request", (req, res) => {
    console.log(req.url)

    res.setHeader("Content-Type", "application/json; charset=utf-8")
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if(req.url !== `/`){
        res.statusCode = 200
        res.end()
        return
    }

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
            zip(filesArray.slice(850,1000))
        })

    function zip(files) {
        console.log(files.length)
        var output = fs.createWriteStream(zipName)

        s3Zip
            .archive({ region: region, bucket: bucket, preserveFolderStructure: true }, folder, files)
            .pipe(output)
            .on(`finish`, () => {
                s3.putObject({
                    "Body": fs.createReadStream(zipName),
                    "Bucket": bucket,
                    "Key": zipName,
                    "Metadata": {
                        "Content-Length": String(fs.statSync(zipName).size)
                    }
                })
                    .promise()
                    .then(data => {
                        res.statusCode = 200
                        res.write(JSON.stringify(data))
                        res.end()
                        return
                    })
            })
    }
})