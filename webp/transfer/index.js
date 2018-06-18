const https = require('https')
const url = require('url')
const AWS = require('aws-sdk')

exports.handler = (event, context, callback) => {
    function finish(status, body) {
        var error = status === 200 ? null : body
        var resp = status !== 200 ? null : body
        return callback(error, resp)
    }

    if (!event.list || !event.list.length) {
        return finish(400, event)
    }

    const item = event.list[0]
    const bucket = process.env.BUCKET_NAME
    const bucketPath = process.env.BUCKET_PATH
    const region = process.env.AWS_REGION
    const s3Region = process.env.S3_REGION
    const config = { accessKeyId: process.env.KEY, secretAccessKey: process.env.SECRET }

    const urls = {
        original: {
            path: `https://images.nvidia.com/swgf${item.originalPath.split(`prod`)[1]}`,
            name: item.originalPath.split(`/`)[item.originalPath.split(`/`).length - 1]
        },
        large: {
            path: `https://images.nvidia.com/swgf${item.lowResolutionImagePath.split(`prod`)[1]}`,
            name: item.lowResolutionImagePath.split(`/`)[item.lowResolutionImagePath.split(`/`).length - 1]
        },
        preview: {
            path: `https://images.nvidia.com/swgf${item.lowResolution25ImagePath.split(`prod`)[1]}`,
            name: item.lowResolution25ImagePath.split(`/`)[item.lowResolution25ImagePath.split(`/`).length - 1]
        },
        thumb: {
            path: `https://images.nvidia.com/swgf${item.thumbnailPath.split(`prod`)[1]}`,
            name: item.thumbnailPath.split(`/`)[item.thumbnailPath.split(`/`).length - 1]
        }
    }

    var results = {}
    var s3 = new AWS.S3()
    s3.config.update({ accessKeyId: config.accessKeyId, secretAccessKey: config.secret })

    function upload(key) {
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
                let bucketKey = `${bucketPath}/${event.list[0].id}/${urls[key].name}`
                let putOptions = {
                    Bucket: bucket,
                    Key: bucketKey,
                    ContentType: ext === `jpg` ? `image/jpeg` : `image/${ext}`,
                    ContentLength: Buffer.byteLength(buffer, `binary`),
                    Body: buffer,
                    ACL: `public-read`
                }

                s3.putObject(putOptions, (putErr, putRes) => {

                    if (putErr) {
                        return finish(400, { error: putErr })
                    }

                    results[key] = `https://s3-${s3Region}.amazonaws.com/${bucket}/${bucketKey}`

                    if (Object.keys(results).length === Object.keys(urls).length) {
                        return finish(200, results)
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
}