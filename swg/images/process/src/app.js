const http = require('http')
const func = require("./index")
const url = require('url')
process.env.LOCALDEV = true

var server = http.createServer().listen(8125);

server.on("request", (req, res) => {
    var parsedURL = url.parse(req.url, true)

    if (req.url.indexOf(`.png`) > -1 || req.url.indexOf(`.jpg`) > -1) {
        const fs = require(`fs`)
        const path = require(`path`)
        const href = url.parse(req.url).href
        const filepath = path.join(__dirname, `..`, href)
        console.log(href, filepath)

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        fs.readFile(filepath, `binary`, function (err, file) {
            if (err) {
                res.writeHead(500, { "Content-Type": "text/plain" });
                res.write(err + "\n");
                res.end();
                return;
            }

            var mime = "text/html"
            var ext = req.url.split(`.`).pop()

            switch (ext) {
                case `png`:
                    mime = `image/png`
                    break
                case `jpg`:
                    mime = `image/jpeg`
                    break
            }

            var size = Buffer.byteLength(file, 'binary')

            res.setHeader('Content-Type', mime);
            res.setHeader('Content-Length', size);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Length');
            res.statusCode = 200
            res.write(file, `binary`);
            res.end();
        })
    } else {
        func.handler({ queryStringParameters: { id: parsedURL.query.id } }, {}, (err, result) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
                res.statusCode = 200
                res.end();
                return;
            }

            res.statusCode = err ? err.statusCode : result.statusCode
            res.write(err ? err.body : result.body ? result.body.toString() : '')
            res.end()
        })
    }
})