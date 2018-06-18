const url = require(`url`)
const https = require(`https`)
const http = require(`http`)
const AWS = require('aws-sdk')
const Sharp = require('sharp')
const exif = require('./exif-parse')
const validator = require('./validator')
const variants = require('./variants')
const png = require(`./png`)
const path = require('path')
const defaultOptions = [
    {
        "quality": 70,
        "max": 8192,
        "format": "jpg",
        "prefix": "large"
    },
    {
        "quality": 60,
        "scale": 0.3,
        "format": "jpg",
        "prefix": "small"
    },
    {
        "quality": 60,
        "width": 400,
        "format": "jpg",
        "prefix": "thumb",
        "normalize": true
    }
]

exports.handler = (event, context, callback) => {

    // IMAGE NEEDS TO BE FETCHED HERE BECAUSE THERE IS A 6MB LIMIT ON INVOKE
    const imageUrl = event.imageUrl
    const s3Path = event.s3Path
    const region = process.env.AWS_REGION
    const bucketPath = process.env.BUCKET_PATH
    const bucket = process.env.BUCKET_NAME

    event.imageData = {}
    event.imageOptions = event.imageOptions || process.env.IMAGE_OPTIONS || defaultOptions

    try {
        event.imageOptions = JSON.parse(event.imageOptions)
    } catch (error) {}

    var run = (imageBuffer) => {
        event.imageData.buffer = imageBuffer

        Sharp(event.imageData.buffer)
            .metadata()
            .then(meta => {
                
                meta.exif = meta.exif ? exif(meta.exif).image : {}

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

                if (event.imageData.meta.exif.MakerNote) {
                    if (event.imageData.meta.exif.MakerNote.split("360").length > 1) {
                        event.imageData.meta["360"] = 1
                    }

                    if (
                        event.imageData.meta.exif.MakerNote.split("Stereo").length > 1 ||
                        event.imageData.meta.exif.Description === "Stereo"
                    ) {
                        event.imageData.meta["3D"] = 1
                    }

                    if (event.imageData.meta.exif.MakerNote.split("SuperResolution").length > 1) {
                        event.imageData.meta["Super resolution"] = 1
                    }
                }

                variants(event)
                    .then(results => {
                        var urls = {}
                        var responses = []

                        if (process.env.LOCALDEV) {
                            return callback(null, results)
                        }

                        results.imageOptions.forEach(option => {
                            
                            let s3 = new AWS.S3({
                                params: {
                                    Bucket: bucket,
                                    Key: `${bucketPath}/${s3Path}/${key}_${event.imageData.filename}.${event.imageOptions.format}`,
                                    Body: results.imageData.variants[key],
                                    ContentType: `image/${event.imageOptions.format === `jpg` ? `jpeg` : event.imageOptions.format}`,
                                    ContentLength: Buffer.byteLength(results.imageData.variants[key], `binary`),
                                    ACL: `public-read`
                                },
                                options: { partSize: 5 * 1024 * 1024, queueSize: 10 }   // 5 MB
                            })


                            s3.upload()
                                .send(function (err, data) {
                                    if (err) {
                                        urls[key] = {
                                            success: false,
                                            response: err
                                        }
                                    } else {
                                        urls[key] = {
                                            success: true,
                                            response: data.Location
                                        }
                                    }

                                    if (Object.keys(urls).length === sizes.length) {
                                        return callback(null, urls)
                                    }
                                })
                        })

                    }, err => {
                        callback(err)
                    })
            }, err => {
                callback(err)
            })
    }

    if (!imageUrl) {
        return callback(`no image url`)
    }

    let filename = imageUrl.split(`/`)
    filename = filename.pop()
    filename = filename.split(`.`)
    filename.pop()
    filename = filename.join(`.`)
    event.imageData.filename = filename

    let getUrl = new url.parse(imageUrl)
    let getOptions = {
        host: getUrl.host.indexOf(`localhost`) > -1 ? `localhost` : getUrl.host,
        protocol: getUrl.protocol,
        path: getUrl.path,
        port: getUrl.port,
        method: 'GET'
    }

    var httpModule = getOptions.protocol === `https:` ? https : http

    var getReq = httpModule.request(getOptions, function (getResp) {
        let buffers = []

        getResp.on('data', (chunk) => { buffers.push(chunk) })
        getResp.on('end', () => {
            run(Buffer.concat(buffers))
        })
    })

    getReq.end()
};