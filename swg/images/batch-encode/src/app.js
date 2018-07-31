/**
 * THIS FILE IS ONLY FOR RUNNING LOCALLY
 * Creates a server
 */

process.env.LOCALDEV = true
process.env.ENCODER = `arn:aws:lambda:us-east-1:005536209483:function:swg-images-encode`

const AWS = require('aws-sdk')
const http = require('http')
const func = require("./index")
const server = http.createServer().listen(8126);

const cognito = 'us-east-1:ff74f0a6-ee1c-4563-b5fa-b1d92c393f14'

AWS.config.update({ region: 'us-east-1' })
AWS.config.credentials = new AWS.CognitoIdentityCredentials({ IdentityPoolId: cognito })

server.on("request", (req, res) => {

    res.setHeader("Content-Type", "application/json; charset=utf-8")
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    let body = ''

    req.on('data', (chunk) => {

        body += chunk

    }).on('end', () => {
        let data = body

        try { data = JSON.parse(data) } catch (error) { }

        process.env.RDS_HOST = data.dbhost
        process.env.RDS_USER = data.dbuser
        process.env.RDS_PASSWORD = data.dbpass

        func.handler(data, {}, (error, result) => {
            res.statusCode = 200
            res.write(JSON.stringify({ error, result }))
            res.end()
            return
        })
    })
})