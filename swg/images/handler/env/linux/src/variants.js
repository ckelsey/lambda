const Sharp = require(`sharp`)
const image360 = require('./image-360')
const imageFlat = require('./image-flat')

module.exports = event => {
    return new Promise((resolve, reject) => {
        var width = event.imageData.meta.Orientation === 6 || event.imageData.meta.Orientation === 8 ? event.imageData.meta.height : event.imageData.meta.width
        var height = event.imageData.meta.Orientation === 6 || event.imageData.meta.Orientation === 8 ? event.imageData.meta.width : event.imageData.meta.height
        var completed = 0

        var finish = () => {
            resolve(event)
        }

        var process = (option, sourceBuffer) => {
            sourceBuffer = sourceBuffer || event.imageData.buffer

            Sharp(sourceBuffer)
                .rotate()
                .resize(option.width, option.height)
                .toFormat(option.format, option.parameters)
                .toBuffer((err, data) => {
                    if (err) {
                        option.error = err
                    }

                    option.buffer = data
                    completed++

                    if (completed === event.imageOptions.length) {
                        finish()
                    }
                })
        }

        var normalize = (option) => {
            return new Promise((res, rej) => {
                // Crop options
                option.crop = option.crop || {}
                let params = {
                    orientation: event.imageData.meta.Orientation, // if the image is rotated
                    imageWidth: event.imageData.meta.width,
                    imageHeight: event.imageData.meta.height,
                    viewWidth: option.crop.viewWidth, // the viewport of the image in the clients browser
                    viewHeight: option.crop.viewHeight, // the viewport of the image in the clients browser
                    tilt: option.crop.tilt, // n/a to non 360
                    pan: option.crop.pan, // n/a to non 360
                    zoom: option.crop.zoom, // n/a to non 360
                    x: option.crop.x, // left position of the crop
                    y: option.crop.y, // top position of the crop
                    width: option.crop.width, // width of the cropped area
                    height: option.crop.height, // height of the cropped area
                    pixelRatio: option.crop.pixelRatio,  // pixel ratio of the clients browser
                }

                if (event.imageData.meta[`3D`]) {
                    params.type = `3d`
                }

                if (event.imageData.meta[`360`]) {
                    image360(event.imageData.buffer, params)
                        .then(src => {
                            if (params.type === `3d`) {
                                option.height = Math.floor(option.height / 2)
                            }

                            process(option, src)
                        })
                        .catch(err => {
                            completed++
                            option.error = err
                        })
                } else {

                    imageFlat(event.imageData.buffer, params)
                        .then(src => {
                            if (params.type === `3d`) {
                                option.width = Math.floor(option.width / 2)
                            }

                            process(option, src)
                        })
                        .catch(err => {
                            completed++
                            option.error = err
                        })
                }
            })
        }

        if (!event.imageOptions.forEach){
            return reject('invalid image options')
        }

        event.imageOptions.forEach(option => {

            if (option.width && !option.height) {
                option.height = height * (option.width / width)
            }

            if (option.height && !option.width) {
                option.width = width * (option.height / height)
            }

            if (!option.width) {
                option.width = width
            }

            if (!option.height) {
                option.height = height
            }

            if (option.scale) {
                option.width = parseFloat(option.scale) * option.width
                option.height = parseFloat(option.scale) * option.height
            }

            if (option.max) {
                if (option.width > option.height) {
                    if (option.width > option.max) {
                        option.height = option.height * (option.max / option.width)
                        option.width = option.max
                    }
                } else {
                    if (option.height > option.max) {
                        option.width = option.width * (option.max / option.height)
                        option.height = option.max
                    }
                }
            }

            // MUST BE INTEGERS
            option.width = parseInt(option.width)
            option.height = parseInt(option.height)

            option.format = option.format || `jpg`
            option.parameters = {}

            if (option.quality) {
                option.parameters.quality = parseInt(option.quality)
            }

            if (option.hasOwnProperty(`compressionLevel`)) {
                option.parameters.compressionLevel = parseInt(option.compressionLevel)
            }

            if (option.chromaSubsampling) {
                option.parameters.chromaSubsampling = option.chromaSubsampling
            }

            if (option.progressive) {
                option.parameters.progressive = option.progressive
            }

            if (option.normalize || option.crop) {
                normalize(option)
                    .then(source => {
                        process(option, source)
                    })
            } else {
                process(option)
            }
        })
    })
}