/*
- open websocket to process from id
    - gets image data and urls
        - return error if none
    - download images and re-upload to s3
        - return urls to images

    - call lambda function that takes either a url or buffer of original. Also takes paths for uploading to s3
        - url for source
        - buffer for source
        - base path for upload

        - read image size and call appropriate image handler, pass in buffer
            - url for source
            - buffer for source
            - base path for upload

            - env
                - bucket
                - bucket path
                - key id
                - secret

            - get metadata
            - convert original to
                - large and upload to s3
                    - return url
                - preview and upload to s3
                    - return url
                - thumb and upload to s3
                    - return url
*/

const https = require('https')
const url = require('url')
const AWS = require('aws-sdk')
const Sharp = require('sharp')

exports.handler = (event, context, callback) => {
    const eventData = event.queryStringParameters || event
    const s3path = eventData.s3path
    let width = eventData.width
    let height = eventData.height
    const flatten = eventData.flatten
    const imageUrl = eventData.url
    const quality = eventData.quality || 100
    const returnImage = eventData.return_image
    const save = eventData.save

    const bucket = process.env.BUCKET_NAME
    const bucketPath = process.env.BUCKET_PATH
    const s3Domain = process.env.S3_DOMAIN
    const config = { accessKeyId: process.env.KEY, secretAccessKey: process.env.SECRET }

    let s3 = new AWS.S3()
    let results = {}
    s3.config.update(config)

    function finish(status, body, type) {
        var error = status === 200 ? null : {
            "isBase64Encoded": false,
            "statusCode": status,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-type": "application/json"
            },
            "body": JSON.stringify(body)
        }

        var resp = status !== 200 ? null : {
            "isBase64Encoded": type ? true : false,
            "statusCode": status,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-type": type || "application/json"
            },
            "body": type ? body : JSON.stringify(body)
        }

        return callback(error, resp)
    }

    if (!imageUrl) {
        return finish(400, { "error": "invalid imageUrl" })
    }

    function saveImage(imgData) {
        let putOptions = {
            Bucket: bucket,
            Key: `${bucketPath}/${s3path}`,
            ContentType: `image/webp`,
            ContentLength: Buffer.byteLength(imgData, `binary`),
            Body: imgData,
            ACL: `public-read`
        }

        s3.putObject(putOptions, (putErr, putRes) => {
            if (putErr) {
                return finish(400, { error: putErr })
            }

            if (returnImage) {
                return finish(200, new Buffer(imgData, `binary`).toString(`base64`), `image/webp`)
            }

            finish(200, { success: true })
        })
    }

    function preFinish(data) {
        if (save) {
            return saveImage(data)
        }

        if (returnImage) {
            return finish(200, new Buffer(data, `binary`).toString(`base64`), `image/webp`)
        }

        finish(200, { success: true })
    }

    function resizeImage(buffer) {
        const i = Sharp(buffer)
        i
            .metadata()
            .then(metadata => {
                console.log(metadata)
                if (!width && height) {
                    width = metadata.width * (height / metadata.height)
                }

                if (!height && width) {
                    height = metadata.height * (width / metadata.width)
                }

                width = parseInt(width)
                height = parseInt(height)

                console.log(width, height)
                return i
                    .resize(width, height)
                    .webp({
                        quality: quality
                    })
                    .toBuffer()
                    .then((data) => {
                        preFinish(data)
                    })
            })
    }

    function convertImage(buffer) {
        Sharp(buffer)
            .webp({
                quality: quality
            })
            .toBuffer()
            .then((data) => {
                preFinish(data)
            })
    }

    const urlParts = imageUrl.split('/')
    const filename = urlParts.pop()
    let filenameParts = filename.split(`.`)
    const ext = filenameParts.pop()
    const getUrl = new url.parse(imageUrl)

    let getOptions = {
        host: getUrl.host,
        protocol: getUrl.protocol,
        path: getUrl.path,
        method: 'GET'
    }

    var getReq = https.request(getOptions, function (getResp) {
        let buffers = []

        getResp.on('data', (chunk) => { buffers.push(chunk) })

        getResp.on('end', () => {

            let buffer = Buffer.concat(buffers)
            console.log(width, height)
            if (width || height) {
                resizeImage(buffer)
            } else {
                convertImage(buffer)
            }

        })
    })

    getReq.end()
}