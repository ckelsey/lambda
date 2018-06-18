const https = require('https')
const url = require('url')

exports.handler = (event, context, callback) => {
    const id = event.queryStringParameters.id

    event.region = process.env.AWS_REGION || `us-east-1`
    event.apiUrl = process.env.API_URL || `https://app.nvidia.com/geforce/image`
    event.imgBase = process.env.IMG_BASE || `https://images.nvidia.com/swgf`
    event.s3Region = process.env.S3_REGION || event.region
    event.bucket = process.env.BUCKET
    event.bucketPath = process.env.BUCKET_PATH
    // event.accessKeyId = process.env.KEY
    // event.secretAccessKey = process.env.SECRET

    function finish(status, body) {
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
            "isBase64Encoded": false,
            "statusCode": status,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-type": "application/json"
            },
            "body": JSON.stringify(body)
        }

        return callback(error, resp)
    }

    function getImageUrl(key){
        return `${event.imgBase}${event.item[key].split(`prod`)[1]}`
    }

    function getImageName(key) {
        return event.item[key].split(`/`).pop()
    }

    if (!id) {
        return finish(400, { "error": "invalid id" })
    }

    var postUrl = new url.parse(`${event.apiUrl}?image_id=${id}`)
    var options = {
        host: postUrl.host,
        protocol: postUrl.protocol,
        path: postUrl.path,
        method: 'GET'
    }

    var postReq = https.request(options, function (resp) {
        let data = ''
        resp.on('data', (chunk) => { data += chunk })
        resp.on('end', () => {

            try {
                data = JSON.parse(data)
            } catch (error) {
                return finish(400, data)
            }

            if (!data.list || !data.list.length) {
                return finish(400, data)
            }

            event.item = data.list[0]

            const urls = {
                original: {
                    path: getImageUrl(`originalPath`),
                    name: getImageName(`originalPath`)
                },
                large: {
                    path: getImageUrl(`lowResolutionImagePath`),
                    name: getImageName(`lowResolutionImagePath`)
                },
                preview: {
                    path: getImageUrl(`lowResolution25ImagePath`),
                    name: getImageName(`lowResolution25ImagePath`)
                },
                thumb: {
                    path: getImageUrl(`thumbnailPath`),
                    name: getImageName(`thumbnailPath`)
                }
            }

            if (process.env.LOCALDEV) {
                require('./save')(urls, event)
                    .then(results => {
                        return finish(200, results)
                    })
                    .catch(err => {
                        return finish(500, err)
                    })
            } else {
                require('./s3')(urls, event)
                    .then(results => {
                        return finish(200, results)
                    })
                    .catch(err => {
                        return finish(500, err)
                    })
            }
        })
    })

    postReq.end()
}