/**
 * THIS FILE IS ONLY FOR RUNNING LOCALLY
 * Creates a server
 */

process.env.LOCALDEV = true

const http = require('http')
const func = require("./index")
const server = http.createServer().listen(8127);

server.on("request", (req, res) => {
    console.log(req.url)

    res.setHeader("Content-Type", "application/json; charset=utf-8")
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    req.on('end', () => {
        // let data = body

        // try { data = JSON.parse(data) } catch (error) { }

        func.handler(null, {}, (error, result) => {
            res.statusCode = 200
            res.write(JSON.stringify({ error, result }))
            res.end()
            return
        })
    })
})