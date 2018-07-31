/**
 * Calls the lambda encoder
 */

const AWS = require('aws-sdk')

module.exports = (image, encoder) => {
    return new Promise((resolve, reject) => {
        let region = encoder.split(`lambda:`)[1].split(`:`)[0]
        const lambda = new AWS.Lambda({ region })

        lambda.invoke({
            FunctionName: encoder,
            Payload: JSON.stringify({
                imageUrl: image.imageUrl,
                imageOptions: image.imageOptions
            })
        }, function (error, data) {
            if (error) {
                try {
                    error = JSON.parse(error.errorMessage)
                } catch (error) { }

                return reject({ error, image })
            }

            if (data.StatusCode !== 200) {
                return reject({ error: data.Payload, image })
            }

            try {
                data = JSON.parse(data.Payload)
            } catch (error) {
                return reject({ error: data, image })
            }

            try {
                data = JSON.parse(data.body)
            } catch (error) {
                return reject({ error: data, image })
            }

            resolve(data)
        })
    })
}