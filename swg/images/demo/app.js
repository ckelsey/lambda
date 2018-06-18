const http = require('http')
const func = require("./index")

var server = http.createServer().listen(8124);

server.on("request", (req, res) => {

    if (req.method === `GET` && req.url.indexOf(`.`) > -1) {
        const fs = require(`fs`)
        const path = require(`path`)

        fs.readFile(path.resolve(`.${req.url}`), `binary`, function (err, file) {
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

            res.writeHead(200, { "Content-Type": mime });
            res.write(file, `binary`);
            res.end();
        })
    } else {
        res.setHeader("Content-Type", "text/html; charset=utf-8")

        let body = ''

        req.on('data', (chunk) => {

            body += chunk

        }).on('end', () => {
            var data = body // or however you need your data

            try {
                data = JSON.parse(data)
            } catch (error) {

            }

            func.handler(data, {}, (err, result) => {
                res.statusCode = 200
                res.write(err || result.body.toString())
                res.end()
            })
        })
    }
})