const AWS = require('aws-sdk')
const documentClient = new AWS.DynamoDB.DocumentClient()

exports.handler = function (event, context, callback) {
    var finish = function (status, body) {
        callback(null, {
            "isBase64Encoded": false,
            "statusCode": status,
            "headers": {
                'Content-Type': 'application/json'
            },
            "body": JSON.stringify({
                result: body
            })
        })
    }

    var get = function (key, def) {
        return !!data[key] && data[key] !== `` ? data[key] : def
    }

    const data = event.data && typeof event.data === `object` ? event.data : event.queryStringParameters ? event.queryStringParameters : {}
    const search = get(`search`)
    const sort = get(`sort`, `created`)
    const filter = get(`filter`)
    const user = get(`user`)
    const game = get(`game`)
    const image = get(`image`)
    const contest = get(`contest`)

    var params = {}
    var method = `query`

    if (image) {

        params.TableName = process.env.dbTable
        params.KeyConditionExpression = `id = :id`
        params.ExpressionAttributeValues = { ':id': parseInt(image) }

    } else if (search) {
        params.TableName = process.env.dbTable
        // params.QueryFilter = {
        //     'title':{
        //         ComparisonOperator: `CONTAINS`,
        //         AttributeValueList: {

        //         }
        //     }
        // }
        // params.FilterExpression = `contains(title, :search)`
        // params.ExpressionAttributeValues = {
        //     ':search': search.toLowerCase()
        // }
        params.IndexName = `title-index`
        params.KeyConditions = {
            'title': {
                ComparisonOperator: `NE`,
                AttributeValueList: [
                    search.toLowerCase()
                ]
            }
        }

        method = `scan`
    }

    console.log(image)

    documentClient[method](params, (error, results) => {
        finish(200, { error, results })
    })

    // var params = {
    //     TableName: process.env.dbTable,
    //     IndexName: `author-index`,
    //     // KeyConditionExpression: `id = :id`,
    //     // ExpressionAttributeValues: {
    //     //     ':id': 4510
    //     // }
    //     // ConditionalOperator: `OR`,
    //     // KeyConditionExpression: `#author = :authorId1, #author = :authorId2`,
    //     KeyConditions: {
    //         'author': {
    //             ComparisonOperator: `EQ`,
    //             AttributeValueList: [
    //                 {
    //                     L: [
    //                         161830811300004770,
    //                         168775368928396260
    //                     ]
    //                 }
    //             ]
    //             // AttributeValueList: {
    //             //     N: `161830811300004770`
    //             //     // N: [
    //             //     //     161830811300004770,
    //             //     //     168775368928396260
    //             //     // ]
    //             // }
    //         }
    //     },
    //     // ExpressionAttributeNames: {
    //     //     '#author': `author` 
    //     // },
    //     // ExpressionAttributeValues: {
    //     //     ':authorId1': 161830811300004770,
    //     //     ':authorId2': 168775368928396260
    //     // }
    // }

    // var params = {
    //     RequestItems: {}
    // }

    // params.RequestItems[process.env.dbTable] = {
    //     Keys: [
    //         { 'id': { 'N': 10902 } },
    //         { 'id': { 'N': 11781 } }
    //     ]
    // }




    // documentClient.query(params, (error, results) => {
    //     finish(200, { error, results })
    // })

    // var ddb = new AWS.DynamoDB()

    // ddb.batchGetItem(params, (error, results) => {
    //     finish(200, { error, results })
    // })
}