const AWS = require('aws-sdk')

exports.handler = (event, context, callback) => {

    AWS.config.update({ region: process.env.REGION });

    var body = event.body

    try {
        body = JSON.parse(body)
    } catch (error) {
        return callback(null, {
            "isBase64Encoded": false,
            "statusCode": 400,
            "headers": { "Content-type": "application/json" },
            "body": JSON.stringify({ error: "invalid data" })
        })
    }

    const TABLE_NAME = body.table
    const ITEMS = body.data

    if (!TABLE_NAME) {
        return callback(null, {
            "isBase64Encoded": false,
            "statusCode": 400,
            "headers": { "Content-type": "application/json" },
            "body": JSON.stringify({ error: "invalid table name" })
        })
    }

    if (!ITEMS || !ITEMS.length) {
        return callback(null, {
            "isBase64Encoded": false,
            "statusCode": 400,
            "headers": { "Content-type": "application/json" },
            "body": JSON.stringify({ error: "invalid data items" })
        })
    }

    var itemParams = {}
    var success = {}
    var error = {}
    var total = 0

    ITEMS.forEach(element => {
        switch (TABLE_NAME) {
            case `swg-users`:
                if (!itemParams[`swg-users`]) {
                    itemParams[`swg-users`] = {}
                }

                if (element.userFollowings.length) {
                    if (!itemParams[`swg-activity-following`]) {
                        itemParams[`swg-activity-following`] = {}
                    }

                    if (!itemParams[`swg-activity-following`][element.id]) {
                        itemParams[`swg-activity-following`][element.id] = {
                            "id": element.id.toString()
                        }
                    }

                    element.userFollowers.forEach(follower => {
                        itemParams[`swg-activity-following`][element.id.toString()][follower.follower.id] = new Date().getTime()
                        total++
                    })
                }

                if (element.userFollowers.length) {
                    if (!itemParams[`swg-activity-following`]) {
                        itemParams[`swg-activity-following`] = {}
                    }


                    element.userFollowings.forEach(user => {
                        if (!itemParams[`swg-activity-following`][user.user.id]) {
                            itemParams[`swg-activity-following`][user.user.id] = {
                                id: user.user.id.toString()
                            }
                        }

                        itemParams[`swg-activity-following`][user.user.id.toString()][element.id] = new Date().getTime()

                        total++
                    })
                }

                itemParams[`swg-users`][element.id] = {
                    "id": element.id.toString(),
                    "name": element.name.toString(),
                    "a": new Date().getTime(),
                    "b": new Date().getTime()
                }

                total++

                break;

            default:
                break;
        }
    });

    for (var t in itemParams) {
        if (itemParams[t]) {
            for (var i in itemParams[t]) {
                if (itemParams[t][i]) {
                    var params = {
                        TableName: t,
                        Item: itemParams[t][i]
                    }

                    var docClient = new AWS.DynamoDB.DocumentClient()
                    docClient.put(params, function (err, data) {
                        if (err) {
                            error[`${t}-${i}`] = err
                            console.log(err, params)
                        } else {
                            success[`${t}-${i}`] = data
                            console.log(data, params)
                        }

                        console.log(Object.keys(error).length + Object.keys(success).length, total)

                        if (Object.keys(error).length + Object.keys(success).length === total) {

                            var results = { error: error, results: success }

                            callback(null, {
                                "isBase64Encoded": false,
                                "statusCode": 200,
                                "headers": { "Content-type": "application/json" },
                                "body": JSON.stringify(results)
                            })
                        }
                    });
                }
            }
        }
    }
};