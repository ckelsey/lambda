const https = require('https')
const url = require('url')
const AWS = require('aws-sdk')

module.exports = function (urls, event) {
    return new Promise((resolve, reject) => {
        var results = {}
        var s3 = new AWS.S3()
        // s3.config.update({ accessKeyId: event.accessKeyId, secretAccessKey: event.secretAccessKey })

        var upload = key => {
            let getUrl = new url.parse(urls[key].path)
            let getOptions = {
                host: getUrl.host,
                protocol: getUrl.protocol,
                path: getUrl.path,
                method: 'GET'
            }

            var getReq = https.request(getOptions, function (getResp) {
                let buffers = []
                let ext = urls[key].name.split(`.`).pop()

                getResp.on('data', (chunk) => { buffers.push(chunk) })
                getResp.on('end', () => {
                    let buffer = Buffer.concat(buffers)
                    let bucketKey = `${event.bucketPath}/${event.item.id}/${urls[key].name}`
                    let putOptions = {
                        Bucket: event.bucket,
                        Key: bucketKey,
                        ContentType: ext === `jpg` ? `image/jpeg` : `image/${ext}`,
                        ContentLength: Buffer.byteLength(buffer, `binary`),
                        Body: buffer,
                        ACL: `public-read`
                    }

                    s3.putObject(putOptions, (putErr, putRes) => {

                        if (putErr) {
                            return reject({ error: putErr })
                        }

                        results[key] = `https://s3-${event.s3Region}.amazonaws.com/${event.bucket}/${bucketKey}`

                        if (Object.keys(results).length === Object.keys(urls).length) {
                            return resolve(results)
                        }
                    })
                })
            })

            getReq.end()
        }

        for (var p in urls) {
            if (urls[p]) {
                upload(p)
            }
        }
    })
}