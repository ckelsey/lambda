const url = require(`url`)
const https = require(`https`)
const AWS = require('aws-sdk')
const Sharp = require('sharp')
const exif = require('./exif-parse')
const validator = require('./validator')
const variants = require('./variants')
const png = require(`./png`)
// const variants = require('./variants') // Creates the large and preview images
// const image360 = require('./image-360') // Creates a 360 thumbnail
// const imageFlat = require('./image-flat') // Creates a non 360 thumbnail

exports.handler = (event, context, callback) => {
    // IMAGE NEEDS TO BE FETCHED HERE BECAUSE THERE IS A 6MB LIMIT ON INVOKE
    const imageUrl = event.imageUrl
    const s3Path = event.s3Path
    const region = process.env.AWS_REGION
    const bucketPath = process.env.BUCKET_PATH
    const bucket = process.env.BUCKET_NAME

    event.max = process.env.MAXDIMENSION
    event.largeQuality = process.env.LARGE_QUALITY
    event.smallQuality = process.env.SMALL_QUALITY
    event.smallScale = process.env.SMALL_SCALE
    event.imageData = {}

    /* Finishes the process */
    // var finish = (err, data) => {

    //     // Aggregate the results
    //     // const results = {
    //     //     largeImage: event.imageData.variants.large,
    //     //     smallImage: event.imageData.variants.small,
    //     //     thumbnailImage: event.imageData.thumbnail
    //     // }

    //     console.log('event results', event)
    //     return callback(null, event.imageData) // otherwise call success

    //     // if (database){
    //     //     // return db(region, database, results, callback) // If lambda function is supplied, call it
    //     // }else{
    //     //     console.log('results', results)
    //     //     return callback(null, results) // otherwise call success
    //     // }
    // }


    /* Uploads a thumb to S3 */
    // var uploadThumb = (thumbData) => {
    //     console.log("thumbData", thumbData)

    //     // set S3 params 
    //     var s3Upload = new AWS.S3({
    //         params: {
    //             Bucket: bucket,
    //             Key: `${directory}thumb.jpg`,
    //             Body: thumbData.buffer,
    //             ACL: `public-read`
    //         },
    //         options: { partSize: 5 * 1024 * 1024, queueSize: 10 }   // 5 MB
    //     })

    //     s3Upload.upload()
    //         .send(function (err, data) {
    //             if (err) {
    //                 console.log(`S3 thumb upload fail`, err)
    //                 return callback(err)
    //             }

    //             console.log(`S3 thumb upload success`, data)

    //             // set thumbnail data
    //             event.imageData.thumbnail = data.Location
    //             event.imageData.thumbnailWidth = thumbData.width
    //             event.imageData.thumbnailHeight = thumbData.height

    //             // If variants are done as well, call finish
    //             if (event.imageData.variants) {
    //                 finish()
    //             }
    //         })
    // }

    var run = (imageBuffer) => {
        event.imageData.buffer = imageBuffer

        Sharp(event.imageData.buffer)
            .metadata()
            .then(meta => {
                console.log(meta)
                meta.exif = meta.exif ? exif(meta.exif) : {}

                if (meta.format === `png`) {
                    var list = png.splitChunk(imageBuffer.toString('binary'));

                    if (list.forEach) {
                        list.forEach((m) => {
                            if (m.type === "tEXt") {
                                if (m.data.indexOf("Model") > -1) {
                                    meta.exif.Model = m.data.split("Model")[1].split("\u0000").join("")
                                }

                                if (m.data.indexOf("Software") > -1) {
                                    meta.exif.Software = m.data.split("Software")[1].split("\u0000").join("")
                                }

                                if (m.data.indexOf("Source") > -1) {
                                    meta.exif.Source = m.data.split("Source")[1].split("\u0000").join("")
                                }

                                if (m.data.indexOf("MakerNote") > -1) {
                                    meta.exif.MakerNote = m.data.split("MakerNote")[1].split("\u0000").join("")
                                } else if (m.data.indexOf("Make") > -1) {
                                    meta.exif.Make = m.data.split("Make")[1].split("\u0000").join("")
                                }

                                if (m.data.indexOf("Description") > -1) {
                                    meta.exif.Description = m.data.split("Description")[1].split("\u0000").join("")
                                }
                            }
                        })
                    }
                }

                event.imageData.meta = meta

                if (!validator(event.imageData.meta.exif)) {
                    callback({
                        success: false,
                        message: `No Ansel metadata`,
                        results: event
                    })
                }

                console.log(event)

                variants(event)
                    .then(results => {
                        console.log(results)
                        var urls = {}
                        var sizes = [`large`, `small`]

                        sizes.forEach(key => {
                            new AWS.S3({
                                params: {
                                    Bucket: bucket,
                                    Key: `${bucketPath}/${s3Path}/${key}.webp`,
                                    Body: results.imageData.variants[key],
                                    ContentType: `image/webp`,
                                    ContentLength: Buffer.byteLength(results.imageData.variants[key], `binary`),
                                    ACL: `public-read`
                                },
                                options: { partSize: 5 * 1024 * 1024, queueSize: 10 }   // 5 MB
                            }).upload()
                                .send(function (err, data) {
                                    if (err) {
                                        console.log(`S3 ${key} upload fail`, err)
                                        return callback(err)
                                    }

                                    urls[key] = data.Location

                                    console.log(`S3 ${key} upload success`, data)

                                    if (Object.keys(urls).length === sizes.length) {
                                        return callback(null, urls)
                                    }
                                })
                        })

                    }, err => {
                        console.log(err)
                        callback(err)
                    })
            })












        /*
        console.log("START STITCH")

        stitcher(event, (err, data) => {
            if (err) {
                console.log("STITCH ERROR", err)
                return callback(err)
            }

            event.imageData = data // binary image data, will be used thruought the app so as to not have to do a read anymore than is needed

            console.log("GET METADATA")

            metadata(event, (err, meta) => {
                if (err) {
                    console.log("METADATA ERROR", err)
                    return callback(err)
                }

                event.imageData.meta = meta
                event.imageData.variants = null
                event.imageData.thumbnail = null

                console.log("GET VARIANTS")

                variants(event, (err, imgs) => {
                    if (err) {
                        console.log("VARIANTS ERROR", err)
                        return callback(err)
                    }

                    event.imageData.variants = imgs

                    // If thumbnail is finished as well, call finish
                    if (event.imageData.thumbnail) {
                        finish()
                    }
                })

                // Crop options
                let options = {
                    orientation: event.imageData.meta.orientation, // if the image is rotated
                    imageWidth: event.imageData.meta.stats.width,
                    imageHeight: event.imageData.meta.stats.height,
                    viewWidth: fields.viewWidth, // the viewport of the image in the clients browser
                    viewHeight: fields.viewHeight, // the viewport of the image in the clients browser
                    tilt: fields.tilt, // n/a to non 360
                    pan: fields.pan, // n/a to non 360
                    zoom: fields.zoom, // n/a to non 360
                    x: fields.x, // left position of the crop
                    y: fields.y, // top position of the crop
                    width: fields.width, // width of the cropped area
                    height: fields.height, // height of the cropped area
                    pixelRatio: fields.pixelRatio,  // pixel ratio of the clients browser
                }

                if (event.imageData.meta[`3D`]) {
                    options.type = `3d`
                }

                console.log("GET THUMB")

                if (event.imageData.meta[`360`]) {
                    image360(event.imageData.buffer, options)
                        .then(uploadThumb)
                        .catch(callback)
                } else {
                    imageFlat(event.imageData.buffer, options)
                        .then(uploadThumb)
                        .catch(callback)
                }
            })
        })
        */
    }

    if (!imageUrl) {
        return callback(`no image url`)
    }

    let getUrl = new url.parse(imageUrl)
    let getOptions = {
        host: getUrl.host,
        protocol: getUrl.protocol,
        path: getUrl.path,
        method: 'GET'
    }

    console.log(getOptions)

    var getReq = https.request(getOptions, function (getResp) {
        let buffers = []

        getResp.on('data', (chunk) => { buffers.push(chunk) })
        getResp.on('end', () => {
            run(Buffer.concat(buffers))
        })
    })

    getReq.end()
};