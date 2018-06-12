var AWS = require(`aws-sdk`)

module.exports = (event, callback) => {

    const fields = event[`body-json`]
    const directory = fields.directory
    const bucket = event.bucket
    var ext = `.${fields.ext}`
    var listData = event.listData
    console.log(fields)

    if (!directory) {
        return callback(`no directory`)
    }

    var listParams = {
        Bucket: bucket,
        Delimiter: `/`,
        Prefix: directory
    }

    var s3 = new AWS.S3({
        params: listParams,
        options: { partSize: 5 * 1024 * 1024, queueSize: 10 }   // 5 MB
    })

    var buffers = []

    const getObject = (index) => {
        var getParams = {
            Bucket: listData.Name,
            Key: `${listData.Prefix}${index}`
        }

        s3.getObject(getParams, function (err, data) {
            if (err) {
                console.log(`Stitch get error`, err)
                return callback(err)
            }

            buffers.push(data.Body)

            s3.deleteObject(getParams, function (err, data) { })

            if (index < listData.Contents.length - 1) {
                return getObject(index + 1)
            }

            var buffer = Buffer.concat(buffers)

            var s3Upload = new AWS.S3({
                params: {
                    Bucket: listData.Name,
                    Key: `${listData.Prefix}original${ext}`,
                    Body: buffer,
                    ACL: `public-read`
                },
                options: { partSize: 5 * 1024 * 1024, queueSize: 10 }   // 5 MB
            })

            s3Upload.upload()
                .send(function (err, data) {
                    if (err) {
                        console.log(`S3 original upload fail`, err)
                        return callback(err)
                    }

                    console.log(`S3 original upload success`, data)

                    callback(null, Object.assign(data, { buffer: buffer }))
                })
        })
    }

    getObject(0)
}