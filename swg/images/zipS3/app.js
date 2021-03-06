/**
 * THIS FILE IS ONLY FOR RUNNING LOCALLY
 * Creates a server
 */

var fs = require('fs')
var AWS = require('aws-sdk')
var XmlStream = require('xml-stream')
const exec = require('child_process').exec
const { spawn } = require('child_process')
var region = 'us-east-1'
var bucket = 'cklsymedia'
var folder = 'super_res'
AWS.config.loadFromPath('./config.json');
var s3 = new AWS.S3({ region: region })
var params = {
    Bucket: bucket,
    Prefix: folder
}

const http = require('http')
const server = http.createServer().listen(8127);

server.on("request", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8")
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.url !== `/`) {
        res.statusCode = 200
        res.end()
        return
    }

    var filesArray = []
    var files = s3.listObjects(params).createReadStream()
    var xml = new XmlStream(files)
    xml.collect('Key')
    xml.on('endElement: Key', function (item) {
        filesArray.push(item['$text'])
    })

    xml
        .on('end', function () {
            getFiles(filesArray)
        })

    function getFiles(files) {
        let completed = 0
        console.log(files.length)

        const doReq = () => {
            var keyPath = files.pop()

            console.log(`keyPath`, keyPath)

            if (!keyPath) {
                res.statusCode = 200
                res.end()
                return
            }

            var filePath = keyPath.split(`/`)[keyPath.split(`/`).length - 1]
            var s3 = new AWS.S3();

            console.log(`getting ${filePath}`)

            s3.getObject(
                { Bucket: "cklsymedia", Key: keyPath },
                function (error, data) {
                    if (error != null) {
                        console.log("Failed to retrieve an object: " + error);
                        completed++
                        doReq()
                    } else {
                        console.log("Loaded " + data.ContentLength + " bytes")

                        fs.writeFileSync(filePath, data.Body)

                        const child = spawn(`/home/ec2-user/gdrive`, [`upload`, `--parent`, `1ixxyJUA-wvpfXIn9Nk2QxNqQJ_mtEULj`, filePath]);

                        child.stdout.on('data', (data) => {
                            console.log(`${data}`);
                        });

                        child.stderr.on('data', (data) => {
                            console.error(`ERROR: ${data}`);
                            completed++
                            console.log(`completed`, completed)
                            exec(`sudo rm -f ${filePath}`, function (err, stdout, stderr) {
                                console.log(err, stdout, stderr)
                                doReq()
                            })
                        });

                        child.on('exit', function (code, signal) {
                            completed++
                            console.log(`completed`, completed)
                            exec(`sudo rm -f ${filePath}`, function (err, stdout, stderr) {
                                console.log(err, stdout, stderr)
                                doReq()
                            })
                        })
                    }
                }
            );
        }

        doReq()
    }
})