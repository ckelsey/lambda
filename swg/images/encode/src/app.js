process.env.BUCKET_NAME = `cklsymedia`
process.env.LOCALDEV = true

const http = require('http')
const fs = require('fs')
const path = require(`path`)
const url = require('url')
const func = require("./index")
const server = http.createServer().listen(8123);

server.on("request", (req, res) => {

    if (req.url.indexOf(`.png`) > -1 || req.url.indexOf(`.jpg`) > -1) {

        let filename = url.parse(req.url).href
        let filePath = path.join(__dirname, `..`, `..`, `..`, filename)

        fs.readFile(filePath, `binary`, function (err, file) {
            if (err) {
                res.writeHead(500, { "Content-Type": "text/plain" });
                res.write(err + "\n");
                res.end();
                return;
            }

            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            let mime = "text/html"
            let ext = req.url.split(`.`).pop()

            switch (ext) {
                case `png`:
                    mime = `image/png`
                    break
                case `jpg`:
                    mime = `image/jpeg`
                    break
            }

            let size = Buffer.byteLength(file, 'binary')
            console.log(size)

            res.setHeader('Content-Type', mime);
            res.setHeader('Content-Length', size);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Length');
            res.statusCode = 200
            res.write(file, `binary`);
            res.end();
        })
    } else {
        res.setHeader("Content-Type", "application/json; charset=utf-8")
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        let body = ''

        req.on('data', (chunk) => {

            body += chunk

        }).on('end', () => {
            let data = body // or however you need your data

            try {
                data = JSON.parse(data)
            } catch (error) {

            }

            func.handler(data, {}, (result) => {
                let urls = {}

                result.imageOptions.forEach(option => {

                    let filename = `${option.prefix ? `${option.prefix}_` : ``}${option.name ? option.name : event.imageData.filename}`
                    let filePath = path.resolve(__dirname, `..`, `..`, `..`, `images`, `${filename}.${option.format}`)

                    fs.writeFile(filePath, option.buffer, (err) => {
                        if (err) {
                            urls[filename] = {
                                success: false,
                                response: err
                            }
                        } else {
                            urls[filename] = {
                                success: true,
                                response: `http://localhost:8123/images/${filename}.${option.format}`
                            }
                        }

                        if (Object.keys(urls).length === result.imageOptions.length) {
                            res.statusCode = 200
                            res.write(JSON.stringify({ result: urls }))
                            res.end()
                            return
                        }
                    })
                })
            })
        })
    }
})