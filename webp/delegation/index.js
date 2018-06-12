const AWS = require(`aws-sdk`)
const https = require(`https`)
const url = require(`url`)

exports.handler = (event, context, callback) => {
    console.log(`yo,`, event)
    const s3Path = event.s3Path
    const imageUrl = event.imageUrl
    const imageBuffer = event.imageBuffer

    const region = process.env.AWS_REGION

    const bucketPath = process.env.BUCKET_PATH
    const bucket = process.env.BUCKET_NAME
    const handlerKey = process.env.HANDLER_KEY

    const lambda = new AWS.Lambda({ region })
    const config = {
        "accessKeyId": "AKIAJX34UWOGLB2YN7TA",
        "secret": "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"
    }

    var handlers = {}
    var handlerSizes = []

    function sendToHandler() {
        let handler
        let imageSize = Buffer.byteLength(event.imageBuffer, `binary`)
        console.log(`imageSize`, imageSize, handlerSizes, handlerSizes[handlerSizes.length - 1])

        for (var i = 0; i < handlerSizes.length; i++) {
            console.log(`imageSize2`, handlerSizes[i] > imageSize, typeof handlerSizes[i], handlerSizes[i], typeof imageSize, imageSize)
            if (handlerSizes[i] > (imageSize / (1024 * 1024))) {
                handler = handlers[handlerSizes[i]]
                break
            }
        }

        if (!handler) {
            handler = handlers[handlerSizes[handlerSizes.length - 1]]
        }

        console.log(`Handler selected`, handler)

        var lambda = new AWS.Lambda({ region })

        lambda.invoke({
            FunctionName: handler,
            Payload: JSON.stringify(event, null, 2)
        }, function (error, data) {
            if (error) {
                console.log("Image handle error", error)

                return callback(error)
            }

            if (data.Payload) {
                data.Payload = JSON.parse(data.Payload)

                console.log("Image handled", data.Payload)

                if (data.Payload.error) {
                    return callback(data.Payload.error, null)
                }

                return callback(null, data.Payload)
            } else {
                return callback(`Image handle error`, null)
            }
        })
    }

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

    console.log("HANDLER handlerSizes", handlerSizes)
    console.log("HANDLERS", handlers)

    if (imageBuffer) {
        return sendToHandler()
    }

    if (!imageUrl) {
        return callback(`no image url`)
    }

    let getUrl = new url.parse(imageUrl)
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
            event.imageBuffer = Buffer.concat(buffers)
            return sendToHandler()
        })
    })

    getReq.end()
}