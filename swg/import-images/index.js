const https = require('https')
const url = require('url')
const aws = require('aws-sdk')

exports.handler = (event, context, callback) => {

    aws.config.update({ region: process.env.dbRegion });

    var finish = function (status, body) {
        callback(null, {
            "isBase64Encoded": false,
            "statusCode": status,
            "headers": {
                'Content-Type': 'application/json'
            },
            "body": JSON.stringify({
                result: typeof body === `string` ? body : JSON.stringify(body)
            })
        })
    }

    var query = event.queryStringParameters
    var queryString = []

    for(var q in query){
        if(query[q]){
            queryString.push(`${q}=${query[q]}`)
        }
    }

    var URL = new url.parse(`${process.env.endpoint}?` + queryString.join(`&`))

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

            var completed = []
            var docClient = new aws.DynamoDB.DocumentClient()

            data.list.forEach(element => {
                var item = {
                    // id: { N: element.id.toString() },
                    // bookmarks: { N: element.bookmarkes.toString() },
                    // likes: { N: element.likes.toString() },
                    // category: { N: element.categoryId.toString() },
                    // created: { N: element.createdDate.toString() },
                    // game: { N: element.game.id.toString() },
                    // isInContest: { B: !!element.isInContest },
                    // preview: { S: element.lowResolution25ImagePath},
                    // image: { S: element.lowResolutionImagePath},
                    // originalImage: { S: element.originalPath},
                    // thumbnail: { S: element.thumbnailPath},
                    // title: { S: element.title},
                    // author: { S: element.user.id},
                    // views: { N: element.views.toString() }
                    id: parseInt(element.id),
                    // bookmarks: [],
                    // likes: [],
                    // views: [],
                    // shares: [],
                    // downloads: [],
                    category: parseInt(element.categoryId),
                    created: parseInt(element.createdDate),
                    modified: parseInt(element.createdDate),
                    game: parseInt(element.game.id),
                    isInContest: !!element.isInContest ? 1 : 0,
                    preview: element.lowResolution25ImagePath.toString(),
                    image: element.lowResolutionImagePath.toString(),
                    originalImage: element.originalPath.toString(),
                    thumbnail: element.thumbnailPath.toString(),
                    title: element.title ? element.title.toString() : ``,
                    titleSearch: element.title ? element.title.toLowerCase() : ``,
                    author: parseInt(element.user.id)
                }

                var params = {
                    TableName: process.env.dbTableName,
                    Item: item
                }

                docClient.put(params, function (error, result) {
                    completed.push({ error, result})

                    if (completed.length === data.list.length) {
                        console.log(completed)

                        finish(200, completed)
                    }
                })
            })
        })
    })

    req.end()
}