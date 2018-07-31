const exif = require('./exif-parse')
const png = require(`./png`)
const ERROR = require('./error')

function getMeta(meta) {
    return new Promise((resolve, reject) => {
        try {
            meta.exif = meta.exif ? exif(meta.exif).image : {}

            if (meta.format === `png`) {
                let list = png.splitChunk(imageBuffer.toString('binary'));

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

            if (meta.exif.MakerNote) {
                if (meta.exif.MakerNote.split("360").length > 1) {
                    meta["360"] = 1
                }

                if (
                    meta.exif.MakerNote.split("Stereo").length > 1 ||
                    meta.exif.Description === "Stereo"
                ) {
                    meta["3D"] = 1
                }

                if (meta.exif.MakerNote.split("SuperResolution").length > 1) {
                    meta["Super resolution"] = 1
                }
            }

            return resolve(meta)
        } catch (error) {
            return reject(ERROR(error))
        }
    })
}

module.exports = getMeta