const AWS = require('aws-sdk')
const metadata = require('./metadata') // Reads an image's metadata
const stitcher = require('./stitcher') // Reads S3 folder and stitches all the files together
const variants = require('./variants') // Creates the large and preview images
const image360 = require('./image-360') // Creates a 360 thumbnail
const imageFlat = require('./image-flat') // Creates a non 360 thumbnail
const db = require("./database") // Calls a Lambda function if provided, supplies the result to this function


exports.handler = (event, context, callback) => {
    const bucket = event.bucket = process.env.BUCKET_NAME // S3 bucket where the chunks are
    const fields = event[`body-json`]
    const directory = fields.directory // S3 directory in the bucket where the chunks are
    const database = process.env.DATABASE // Optional Lambda arn to invoke after everything is completed. Supplies the results
    const region = process.env.AUTH_REGION // Optional region for the above arn

    /* Finishes the process */
    var finish = () => {

        // Aggregate the results
        const results = {
            meta: event.imageData.meta,
            originalImage: event.imageData.Location,
            largeImage: event.imageData.variants.large,
            smallImage: event.imageData.variants.small,
            thumbnailImage: event.imageData.thumbnail,
            thumbnailWidth: event.imageData.thumbnailWidth,
            thumbnailHeight: event.imageData.thumbnailHeight,
            fields: fields
        }

        if (database){
            return db(region, database, results, callback) // If lambda function is supplied, call it
        }else{
            return callback(null, results) // otherwise call success
        }
    }

    /* Uploads a thumb to S3 */
    var uploadThumb = (thumbData) => {
        console.log("thumbData", thumbData)

        // set S3 params 
        var s3Upload = new AWS.S3({
            params: {
                Bucket: bucket,
                Key: `${directory}thumb.jpg`,
                Body: thumbData.buffer,
                ACL: `public-read`
            },
            options: { partSize: 5 * 1024 * 1024, queueSize: 10 }   // 5 MB
        })

        s3Upload.upload()
            .send(function (err, data) {
                if (err) {
                    console.log(`S3 thumb upload fail`, err)
                    return callback(err)
                }

                console.log(`S3 thumb upload success`, data)

                // set thumbnail data
                event.imageData.thumbnail = data.Location
                event.imageData.thumbnailWidth = thumbData.width
                event.imageData.thumbnailHeight = thumbData.height

                // If variants are done as well, call finish
                if (event.imageData.variants) {
                    finish()
                }
            })
    }

    var run = ()=>{
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
    }

    run()
};