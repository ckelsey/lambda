const path = require('path')
const ERROR = require('./error')

module.exports = (res, imageOptions, sourceS3Bucket)=> {
    try {
        if (!res || !Array.isArray(res) || !res.length) {
            return Promise.reject(`Invalid DB images response ${ERROR(res)}`)
        }

        let results = {}
        let databaseUpdate = {}

        res.forEach(image => {

            if (!results[image.image_id]) {
                results[image.image_id] = {
                    id: image.image_id,
                    imageUrl: ``,
                    imageOptions: []
                }
            }

            let name = path.basename(image.path).split('.').slice(0, -1).join('.')
            let format = path.extname(image.path).split('.')[1]
            let settings

            switch (image.type) {
                case `Original`:
                    results[image.image_id].imageUrl = `${sourceS3Bucket}${image.path}`
                    break
                case `low resolution`:
                    settings = JSON.parse(JSON.stringify(imageOptions.large))
                    break
                case `low resolution 25`:
                    settings = JSON.parse(JSON.stringify(imageOptions.preview))
                    break
                case `thumbnail`:
                    settings = JSON.parse(JSON.stringify(imageOptions.thumb))
                    break
                case `customthumbnail`:
                    settings = JSON.parse(JSON.stringify(imageOptions.thumb))
                    break
            }

            if (settings) {
                settings.format = settings.format || format
                settings.filepath = `${image.path.split(name)[0]}${name}.${settings.format}`
                results[image.image_id].imageOptions.push(settings)

                if (format !== settings.format) {
                    databaseUpdate[image.id] = {
                        newPath: settings.filepath,
                        oldPath: image.path,
                        id: image.id,
                        image_id: image.image_id
                    }
                }
            }
        })

        return Promise.resolve({ results, databaseUpdate })
    } catch (error) {
        return Promise.reject(`DB parse results error: ${ERROR(error)}`)
    }
}