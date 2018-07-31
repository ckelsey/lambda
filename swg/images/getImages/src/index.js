const http = require(`http`);
const https = require(`https`)
const imageUrlPath = `geforce/image/?orderBy=createdDate&records=50&category_id=10&order=asc`
const AWS = require('aws-sdk')

let total = 0
let imageUrls = []
let running = false
let completed = 0
let page = process.env.PAGE

function uploadToS3(option) {
    return new Promise((resolve, reject) => {
        try {
            let filepath = option.filepath
            let s3 = new AWS.S3({
                params: {
                    Bucket: `cklsymedia`,
                    Key: `super_res/${filepath}`,
                    Body: option.buffer,
                    ContentType: `image/${option.format === `jpg` ? `jpeg` : option.format}`,
                    ContentLength: Buffer.byteLength(option.buffer, `binary`),
                    ACL: `public-read`
                },
                options: { partSize: 5 * 1024 * 1024, queueSize: 10 }   // 5 MB
            })

            s3.upload()
                .send(function (error, data) {
                    if (error) {
                        return reject(err)
                    }

                    return resolve(data.Location)
                })
        } catch (error) {
            return reject(err)
        }
    })
}

function handler(event, context, callback) {

    const resolve = (error, result) => {
        let _error = error ? typeof error === `string` ? error : JSON.stringify(error) : null
        let resp = error ? null : typeof result === `string` ? result : JSON.stringify(result)

        return callback(_error, resp)
    }

    const dlImage = () => {
        if (running) {
            return
        }

        if (!imageUrls.length) {
            return resolve(null, completed)
        }

        running = true
        let url = imageUrls.pop()
        const fileName = url.split('swgf/')[1].split(`/`).join(`-`)
        
        let req2 = http.get(url, function (resp2) {
            let imgData = []

            resp2.on('data', (chunk) => {
                imgData.push(chunk)
            })

            resp2.on('error', () => { })

            resp2.on('end', () => {
                let buffer = Buffer.concat(imgData)
                uploadToS3({
                    filepath: fileName,
                    format: fileName.split(`.`)[fileName.split(`.`).length - 1],
                    buffer: buffer
                })
                    .then(() => {
                        running = false
                        completed++
                        console.log(completed)
                        dlImage()
                    })
            })
        }).on('error', () => { })

        req2.end()
    }

    const getImages = () => {
        var req = https.get(`https://app.nvidia.com/${imageUrlPath}&page=${page}`, function (resp) {
            let data = ''

            resp.on('data', (chunk) => {
                data += chunk
            })

            resp.on('error', (error) => {
                resolve(error)
            })

            resp.on('end', () => {
                try {
                    let imagesResults = JSON.parse(data)
                    total = imagesResults.totalResults

                    imagesResults.list.forEach(img => {
                        if (!img || !img.originalPath) {
                            return
                        }

                        imageUrls.push(`http://images.nvidia.com/swgf${img.originalPath.split(`/prod`)[1]}`)

                        dlImage()
                    });

                } catch (e) { }
            })
        })

        req.end()
    }

    getImages()
}

exports.handler = handler