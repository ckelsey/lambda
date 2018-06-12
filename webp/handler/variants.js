const sharp = require(`sharp`)
var AWS = require(`aws-sdk`)

module.exports = (event, callback) => {
    const fields = event[`body-json`]
    const directory = fields.directory
    const bucket = event.bucket
    const imageData = event.imageData
    const ext = fields.ext
    const binary = Buffer.from(imageData.buffer, 'base64')
    const max = 8192

    var width = imageData.meta.orientation === 6 || imageData.meta.orientation === 8 ? imageData.meta.stats.height : imageData.meta.stats.width
    var height = imageData.meta.orientation === 6 || imageData.meta.orientation === 8 ? imageData.meta.stats.width : imageData.meta.stats.height
    var large
    var small
    var largeOptions = {
        quality: 66
    }

    var smallOptions = {
        quality: 33
    }

    if (width > height) {
        if (width > max) {
            height = height * (max / width)
            width = max
        }
    } else {
        if (height > max) {
            width = width * (max / height)
            height = max
        }
    }

    sharp(binary)
        .rotate()
        .resize(width, height)
        .toFormat(`jpeg`)
        .toBuffer(largeOptions, (err, data) => {
            large = data

            sharp(binary)
                .rotate()
                .resize(width / 4, height / 4)
                .toFormat(`jpeg`)
                .toBuffer(smallOptions, (err, data) => {
                    small = data

                    // callback({large, small})

                    var s3Upload = new AWS.S3({
                        params: {
                            Bucket: bucket,
                            Key: `${directory}large.jpg`,
                            Body: large,
                            ACL: `public-read`
                        },
                        options: { partSize: 5 * 1024 * 1024, queueSize: 10 }   // 5 MB
                    })

                    s3Upload.upload()
                        .send(function (err, data) {
                            if (err) {
                                console.log(`S3 large upload fail`, err)
                                return callback(err)
                            }

                            var results = {
                                large: data.Location
                            }

                            console.log(`S3 large upload success`, data)

                            s3Upload = new AWS.S3({
                                params: {
                                    Bucket: bucket,
                                    Key: `${directory}small.jpg`,
                                    Body: small,
                                    ACL: `public-read`
                                },
                                options: { partSize: 5 * 1024 * 1024, queueSize: 10 }   // 5 MB
                            })

                            s3Upload.upload()
                                .send(function (err, data) {
                                    if (err) {
                                        console.log(`S3 small upload fail`, err)
                                        return callback(err)
                                    }

                                    console.log(`S3 small upload success`, data)

                                    results.small = data.Location

                                    callback(null, results)
                                })
                        })
                })
        })
}