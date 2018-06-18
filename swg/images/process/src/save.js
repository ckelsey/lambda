const https = require('https')
const url = require('url')
const fs = require('fs')
const path = require('path')

module.exports = function (urls, event) {
    return new Promise((resolve, reject) => {
        var results = {}
        
        for (var p in urls) {
            if (urls[p]) {
                (function (k) {
                    var file = fs.createWriteStream(path.join(__dirname, `..`, `test-images`, urls[k].name));
                    var request = https.get(urls[k].path, function (response) {
                        response.pipe(file)
                    })

                    file.on(`finish`, function (err, data) {
                        results[k] = `http://localhost:8125/test-images/${urls[k].name}`

                        if (Object.keys(results).length === Object.keys(urls).length) {
                            return resolve(results)
                        }
                    })
                })(p)
            }
        }
    })
}