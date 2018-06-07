const fs = require('fs')
const filename = require.resolve(`./index.html`)

exports.handler = (event, context, callback) => {
    fs.readFile(filename, 'utf8', (err, html) => {
        if (err) {
            return callback(err)
        }

        callback(null, {
            "isBase64Encoded": false,
            "statusCode": 200,
            "headers": { "Content-type": "text/html" },
            "body": html
        })
    })
}