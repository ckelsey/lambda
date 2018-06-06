const https = require('https');
const url = require('url');

exports.handler = (event, context, callback) => {
    console.log(event)
    var query = decodeURIComponent(event.queryStringParameters.url)

    if (!query) {
        return callback({
            "isBase64Encoded": false,
            "statusCode": 400,
            "body": `{"error":"invalid url"}`
        })
    }

    var postUrl = new url.parse(query)
    var options = {
        host: postUrl.host,
        protocol: postUrl.protocol,
        path: postUrl.path,
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(event.body)
        }
    }

    var post_req = https.request(options, function (resp) {
        let data = ''
        resp.on('data', (chunk) => { data += chunk })
        resp.on('end', () => {
            callback(null, {
                "isBase64Encoded": false,
                "statusCode": 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*"
                },
                "body": data
            })
        })
    });

    post_req.write(event.body);
    post_req.end();
}