const https = require('https')
const url = require('url')

exports.handler = (event, context, callback) => {
    const data = event.data && typeof event.data === `object` ? event.data : event.queryStringParameters ? event.queryStringParameters : {}
    const path = data.path
    const request = url.parse(path, true)
    const action = request.pathname

    const postUrl = new url.parse(path)
    const options = {
        host: postUrl.host,
        protocol: postUrl.protocol,
        path: postUrl.path,
        method: 'GET'
    }

    var post_req = https.request(options, function (resp) {
        let data = ''
        resp.on('data', (chunk) => { data += chunk })
        resp.on('end', () => {
            callback(null, {
                // "isBase64Encoded": true,
                "isBase64Encoded": false,
                "statusCode": 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-type": `image/${path.indexOf(`.png`) > -1 ? `png` : `jpeg`}`
                },
                // "body": new Buffer(data, 'binary').toString('base64')
                body: data.toString()
            })
        })
    });

    post_req.end();

}