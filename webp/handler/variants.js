const Sharp = require(`sharp`)
var AWS = require(`aws-sdk`)

module.exports = event => {
    return new Promise((resolve, reject) => {
        var width = event.imageData.meta.orientation === 6 || event.imageData.meta.orientation === 8 ? event.imageData.meta.height : event.imageData.meta.width
        var height = event.imageData.meta.orientation === 6 || event.imageData.meta.orientation === 8 ? event.imageData.meta.width : event.imageData.meta.height

        if (event.max) {
            if (width > height) {
                if (width > event.max) {
                    height = height * (event.max / width)
                    width = event.max
                }
            } else {
                if (height > event.max) {
                    width = width * (event.max / height)
                    height = event.max
                }
            }
        }

        var largeOptions = {
            quality: event.largeQuality ? parseInt(event.largeQuality) : 60
        }

        var smallOptions = {
            quality: event.smallQuality ? parseInt(event.smallQuality) : 66
        }

        var smallScale = event.smallScale ? parseFloat(event.smallScale) : 3

        event.imageData.variants = {}

        console.log(largeOptions)

        try {
            Sharp(event.imageData.buffer)
                .rotate()
                .resize(width, height)
                .webp(largeOptions)
                .toBuffer((err, data) => {
                    if (err) {
                        return reject(err)
                    }

                    event.imageData.variants.large = data

                    console.log("large")

                    Sharp(event.imageData.buffer)
                        .rotate()
                        .resize(width / smallScale, height / smallScale)
                        .webp(smallOptions)
                        .toBuffer((err, data) => {
                            if (err) {
                                return reject(err)
                            }

                            event.imageData.variants.small = data

                            console.log("small")

                            return resolve(event)

                            // Crop options
                            // let options = {
                            //     orientation: event.imageData.meta.orientation, // if the image is rotated
                            //     imageWidth: event.imageData.meta.width,
                            //     imageHeight: event.imageData.meta.height,
                            //     viewWidth: event.crop.viewWidth, // the viewport of the image in the clients browser
                            //     viewHeight: event.crop.viewHeight, // the viewport of the image in the clients browser
                            //     tilt: event.crop.tilt, // n/a to non 360
                            //     pan: event.crop.pan, // n/a to non 360
                            //     zoom: event.crop.zoom, // n/a to non 360
                            //     x: event.crop.x, // left position of the crop
                            //     y: event.crop.y, // top position of the crop
                            //     width: event.crop.width, // width of the cropped area
                            //     height: event.crop.height, // height of the cropped area
                            //     pixelRatio: event.crop.pixelRatio,  // pixel ratio of the clients browser
                            // }

                            // if (event.imageData.meta[`3D`]) {
                            //     options.type = `3d`
                            // }

                            // console.log("GET THUMB")

                            // if (event.imageData.meta[`360`]) {
                            //     image360(event.imageData.buffer, options)
                            //         .then(uploadThumb)
                            //         .catch(callback)
                            // } else {
                            //     imageFlat(event.imageData.buffer, options)
                            //         .then(uploadThumb)
                            //         .catch(callback)
                            // }
                        })
                })
        } catch (error) {
            console.log(error)
            return reject(error)
        }


    })
}

/*

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
*/