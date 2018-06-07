const https = require('https')
const url = require('url')
const AWS = require('aws-sdk')
const Sharp = require('sharp')

exports.handler = (event, context, callback) => {
    const width = event.queryStringParameters.width
    const height = event.queryStringParameters.height
    const flatten = event.queryStringParameters.flatten
    const imageUrl = event.queryStringParameters.url
    const bucket = process.env.BUCKET_NAME
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
            "isBase64Encoded": false,
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

    const urlParts = imageUrl.split('/')
    const filename = urlParts.pop()
    const ext = filename.split(`.`)[filename.split(`.`).length - 1]
    // const s3Path = urlParts.join(`/`)
    // const getUrl = new url.parse(`${s3Domain}/${bucket}/${s3Path}/${filename}`)
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

            // sharp(buffer)
            //     .resize(320, 240)
            //     .toBuffer()
            //     .then((data)=>{
            //         finish(200, data, ext === `png` ? `image/png` : `image/jpeg`)
            //     })

            // Determine file size
            // Delegate based on file size

            // Determine type

            // Render large webp
            // Upload large

            // Render preview webp
            // Upload preview

            // Render thumb webp
            // Upload thumb
            
        })
    })

    getReq.end()
}