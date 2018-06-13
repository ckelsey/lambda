const https = require('https')
const url = require('url')
const AWS = require('aws-sdk')

exports.handler = (event, context, callback) => {
    const id = event.queryStringParameters.id
    const region = process.env.AWS_REGION
    const transferFn = process.env.TRANSFER_FN
    const lambda = new AWS.Lambda({ region })

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

            lambda.invoke({
                FunctionName: transferFn,
                Payload: JSON.stringify(data, null, 2)
            }, function (error, data) {
                return finish(error ? 401 : 200, error || data)
            })
        })
    })

    postReq.end()
}