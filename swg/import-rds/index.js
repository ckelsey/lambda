const https = require('https')
const url = require('url')
const aws = require('aws-sdk')

exports.handler = (event, context, callback) => {

    var finish = function (status, body) {
        callback(null, {
            "isBase64Encoded": false,
            "statusCode": status,
            "headers": {
                'Content-Type': 'application/json'
            },
            "body": {
                result: typeof body === `string` ? body : JSON.stringify(body)
            }
        })
    }

    var URL = new url.parse(process.env.endpoint)

    var options = {
        host: URL.host,
        protocol: URL.protocol,
        path: URL.path,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    }

    var req = https.request(options, function (resp) {
        let data = ''

        resp.on('data', (chunk) => {
            data += chunk
        })

        resp.on('end', () => {

            var mapped = []

            try {
                data = JSON.parse(data)
            } catch (e) {
                return finish(500, `invalid import data: ${e}`)
            }

            if (
                !data ||
                typeof data === `string` ||
                !data.list ||
                data.list.length === 0
            ) {
                return finish(500, `no import data`)
            }

            data = data.list

            data.forEach(element => {
                mapped.push( {
                    id: element.id,
                    bookmarks: element.bookmarkes,
                    likes: element.likes,
                    category: element.categoryId,
                    created: element.createdDate,
                    game: element.game.id,
                    isInContest: element.isInContest,
                    preview: element.lowResolution25ImagePath,
                    image: element.lowResolutionImagePath,
                    originalImage: element.originalPath,
                    thumbnail: element.thumbnailPath,
                    title: element.title,
                    author: element.user.id,
                    views: element.views
                })
            })

            var lambda = new aws.Lambda({
                region: process.env.dbRegion
            })

            lambda.invoke({
                FunctionName: process.env.dbFunction,
                Payload: JSON.stringify({ 
                    sql: 'INSERT INTO posts SET ?',
                    data: mapped
                }, null, 2)
            }, function (error, results) {
                console.log(error, results)
                if (error) {
                    return finish(500, error)
                }

                console.log(results)

                if (results.Payload) {
                    results.Payload = JSON.parse(results.Payload)

                    return finish(200, results.Payload)
                } else {
                    return finish(500, `no payload`)
                }
            })
        })
    })

    req.end()
}