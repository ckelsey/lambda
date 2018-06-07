const https = require('https')
const url = require('url')
const AWS = require('aws-sdk')

exports.handler = (event, context, callback) => {
    const id = event.queryStringParameters.id
    const bucket = process.env.BUCKET_NAME
    const bucketPath = process.env.BUCKET_PATH
    const config = {
        "accessKeyId": "AKIAJX34UWOGLB2YN7TA",
        "secret": "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",
        "region": "us-east-2",
        "bucket": "ckcuploads"
    }

    function finish(status, body){
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

    if (!id) {
        return finish(400, { "error": "invalid id" })
    }
    var postUrl = new url.parse(`https://app.nvidia.com/geforce/image/?image_id=${id}`)
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

            const urls = {
                original: {
                    path: `https://images.nvidia.com/swgf${data.list[0].originalPath.split(`prod`)[1]}`,
                    name: data.list[0].originalPath.split(`/`)[data.list[0].originalPath.split(`/`).length - 1]
                },
                large: {
                    path: `https://images.nvidia.com/swgf${data.list[0].lowResolutionImagePath.split(`prod`)[1]}`,
                    name: data.list[0].lowResolutionImagePath.split(`/`)[data.list[0].lowResolutionImagePath.split(`/`).length - 1]
                },
                preview: {
                    path: `https://images.nvidia.com/swgf${data.list[0].lowResolution25ImagePath.split(`prod`)[1]}`,
                    name: data.list[0].lowResolution25ImagePath.split(`/`)[data.list[0].lowResolution25ImagePath.split(`/`).length - 1]
                },
                thumb: {
                    path: `https://images.nvidia.com/swgf${data.list[0].thumbnailPath.split(`prod`)[1]}`,
                    name: data.list[0].thumbnailPath.split(`/`)[data.list[0].thumbnailPath.split(`/`).length - 1]
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
                    var buffers = []
                    getResp.on('data', (chunk) => { buffers.push(chunk) })
                    getResp.on('end', () => {
                        let buffer = Buffer.concat(buffers)
                        let putOptions = {
                            Bucket: bucket,
                            Key: `${bucketPath}/${id}/${urls[key].name}`,
                            ContentType: urls[key].name.substr(urls[key].name.length - 3) === `png` ? `image/png` : `image/jpeg`,
                            ContentLength: Buffer.byteLength(buffer, `binary`),
                            Body: buffer,
                            ACL: `public-read`
                        }

                        s3.putObject(putOptions, (putErr, putRes)=>{
                            if(putErr){
                                return finish(400, { error: putErr })
                            }

                            results[key] = putRes

                            if (Object.keys(results).length === Object.keys(urls).length){
                                return finish(200, results)
                            }
                        });
                    })
                })

                getReq.end()
            }

            for(var p in urls){
                if(urls[p]){
                    upload(p)
                }
            }
        })
    })

    postReq.end()
}