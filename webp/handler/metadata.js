const ExifImage = require("exif").ExifImage
const png = require("png-metadata")
const probe = require('probe-image-size')

const _get = function (el, path, emptyVal) {
    path = [el].concat(path.split("."))

    var result = path.reduce(function (accumulator, currentValue) {
        if (currentValue) {
            return accumulator[currentValue]
        } else {
            return accumulator
        }

    })

    if (!result) {
        return emptyVal
    }

    return result
}

function parseMeta(res, binary) {
    
    for (var m in res) {
        if (res[m] && typeof res[m] !== `string` && typeof res[m] !== `number`) {
            res[m] = String.fromCharCode.apply(null, new Uint16Array(res[m]))
        }

        if (res[m] && typeof res[m] === `string`){
            res[m] = decodeURIComponent(res[m].replace(/\\u[\dA-F]{4}/gi,
                function (match) {
                    return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
                }))
        }
    }

    var result = {}
    var model = _get(res, "Model", "").toLowerCase()
    var Software = _get(res, "Software", "")
    var software = Software.toLowerCase()
    var make = _get(res, "Make", "").toLowerCase()
    var Description = _get(res, "ImageDescription", _get(res, "Description"))
    var MakerNote = _get(res, "MakerNote")
    var isValid = (model.indexOf("nvidia") > -1 ||
        model.indexOf("ansel") > -1 ||
        model.indexOf("nvcamera") > -1 ||
        software.indexOf("nvidia") > -1 ||
        software.indexOf("ansel") > -1 ||
        software.indexOf("nvcamera") > -1 ||
        make.indexOf("nvidia") > -1 ||
        make.indexOf("ansel") > -1 ||
        make.indexOf("nvcamera") > -1
    )

    if (!isValid) {
        return false
    }

    if (
        software === "geforce experience – ansel" ||
        software.indexOf("ansel") > -1
    ) {
        result.game = Description
    } else {
        result.game = Software
    }

    if (MakerNote) {
        if (MakerNote.split("360").length > 1) {
            result["360"] = 1
        }

        if (
            MakerNote.split("Stereo").length > 1 ||
            Description === "Stereo"
        ) {
            result["3D"] = 1
        }

        if (MakerNote.split("SuperResolution").length > 1) {
            result["Super resolution"] = 1
        }
    }

    if (result["360"] && result["3D"]) {
        result["Top bottom"] = 1
    } else if (result["3D"]) {
        result["Left right"] = 1
    }

    result.stats = probe.sync(binary);
    result.orientation = res.Orientation

    return result
}

module.exports = (event, callback) => {
    const fields = event[`body-json`]
    const imageData = event.imageData
    const ext = fields.ext
    const binary = imageData.buffer

    console.log(Buffer.isBuffer(binary))

    if (ext === `jpg`) {

        try {
            new ExifImage({ image: binary }, function (error, exifData) {
                if (error) {
                    return callback(error.message)
                }

                var meta = parseMeta(exifData.image, binary)

                console.log(meta)

                if (!meta) {
                    return callback(`no metadata`)
                }

                return callback(null, meta)
            });
        } catch (error) {
            return callback(error.message)
        }
    } else {

        var list = png.splitChunk(binary.toString('binary'));
        var results = {}

        if (!list.forEach){
            return callback(`No metadata`)
        }

        list.forEach((m) => {
            if (m.type === "tEXt") {
                if (m.data.indexOf("Model") > -1) {
                    results.Model = m.data.split("Model")[1].split("\u0000").join("")
                }

                if (m.data.indexOf("Software") > -1) {
                    results.Software = m.data.split("Software")[1].split("\u0000").join("")
                }

                if (m.data.indexOf("Source") > -1) {
                    results.Source = m.data.split("Source")[1].split("\u0000").join("")
                }

                if (m.data.indexOf("MakerNote") > -1) {
                    results.MakerNote = m.data.split("MakerNote")[1].split("\u0000").join("")
                } else if (m.data.indexOf("Make") > -1) {
                    results.Make = m.data.split("Make")[1].split("\u0000").join("")
                }

                if (m.data.indexOf("Description") > -1) {
                    results.Description = m.data.split("Description")[1].split("\u0000").join("")
                }
            }
        })

        meta = parseMeta(results, binary)

        if (!meta) {
            return callback(`No metadata`)
        }

        return callback(null, meta)
    }
}