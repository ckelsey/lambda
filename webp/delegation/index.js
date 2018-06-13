const AWS = require(`aws-sdk`)
const https = require(`https`)
const url = require(`url`)

exports.handler = (event, context, callback) => {
    const s3Path = event.s3Path
    const imageUrl = event.imageUrl

    const region = process.env.AWS_REGION

    const bucketPath = process.env.BUCKET_PATH
    const bucket = process.env.BUCKET_NAME
    const handlerKey = process.env.HANDLER_KEY

    const lambda = new AWS.Lambda({ region })
    const config = { accessKeyId: process.env.KEY, secretAccessKey: process.env.SECRET }

    var handlers = {}
    var handlerSizes = []

    if (!s3Path) {
        return callback(`no s3Path`)
    }

    if (!bucket) {
        return callback(`no bucket`)
    }

    if (!handlerKey) {
        return callback(`no handlerKey`)
    }

    for (var v in process.env) {
        if (process.env[v] && v.indexOf(handlerKey) > -1) {
            var size = parseInt(v.split(handlerKey)[1])

            if (!isNaN(size)) {
                handlerSizes.push(size)
                handlers[size] = process.env[v]
            }
        }
    }

    if (!handlerSizes.length) {
        return callback(`no image handlers`)
    }

    handlerSizes.sort((a, b) => {
        return a > b
    })

    if (!imageUrl) {
        return callback(`no image url`)
    }

    let getUrl = new url.parse(imageUrl)
    let getOptions = {
        host: getUrl.host,
        protocol: getUrl.protocol,
        path: getUrl.path,
        method: 'HEAD'
    }

    var getReq = https.request(getOptions, function (getResp) {
        console.log(getResp.headers)

        let handler
        let imageSize = getResp.headers['content-length']

        for (var i = 0; i < handlerSizes.length; i++) {
            if (handlerSizes[i] > (imageSize / (1024 * 1024))) {
                handler = handlers[handlerSizes[i]]
                break
            }
        }

        if (!handler) {
            handler = handlers[handlerSizes[handlerSizes.length - 1]]
        }

        lambda.invoke({
            FunctionName: handler,
            Payload: JSON.stringify(event, null, 2)
        }, function (error, data) {
            console.log('lambda', error, data)
            return callback(error, data)
        })
        // let buffers = []

        // getResp.on('data', (chunk) => { buffers.push(chunk) })
        // getResp.on('end', () => {
        //     // event.imageBuffer = new Buffer(Buffer.concat(buffers), `binary`).toString(`base64`)
        //     // sendToHandler()
        // })
    })

    getReq.end()
}