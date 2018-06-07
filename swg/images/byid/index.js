const https = require('https');
const url = require('url');

exports.handler = (event, context, callback) => {
    var id = event.queryStringParameters.id

    if (!id) {
        return callback({
            "isBase64Encoded": false,
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-type": "application/json"
            },
            "body": `{"error":"invalid id"}`
        })
    }
    var postUrl = new url.parse(`https://app.nvidia.com/geforce/image/?image_id=${id}`)
    var options = {
        host: postUrl.host,
        protocol: postUrl.protocol,
        path: postUrl.path,
        method: 'GET'
    }

    console.log(options)

    var post_req = https.request(options, function (resp) {
        let data = ''
        resp.on('data', (chunk) => { data += chunk })
        resp.on('end', () => {
            callback(null, {
                "isBase64Encoded": false,
                "statusCode": 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-type": "application/json"
                },
                "body": data
            })
        })
    });

    post_req.end();
}