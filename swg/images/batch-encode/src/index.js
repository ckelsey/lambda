
const mysql = require('mysql')
const ERROR = require('./error')
const executeQuery = require('./executeQuery')
const parseResults = require('./parseResults')
const encodeImage = require('./encodeImage')
const sourceS3Bucket = process.env.S3_BUCKET || `https://s3.amazonaws.com/swgf.nvidia.com/`
const encoder = process.env.ENCODER
let connection
let imageOptions = {}

function handler(event, context, callback) {
    let completed = []
    let results
    let errors = []
    let databaseUpdates = {}
    let dbUpdateErrors = []

    const resolve = (error, result) => {
        if (connection) {
            connection.end()
        }

        let message = {
            "isBase64Encoded": false,
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-type": "application/json"
            },
            "body": typeof result === `string` ? result : JSON.stringify(result)
        }

        let _error = error ? typeof error === `string` ? error : JSON.stringify(error) : null
        let resp = error ? null : message

        return callback(_error, resp)
    }

    const isComplete = () => {
        
        let dbUpdateCount = Object.keys(databaseUpdates).length
        let encodeCount = errors.length + completed.length
        let expectedCount = Object.keys(results.results).length

        if (encodeCount === expectedCount && !dbUpdateCount) {
            return resolve(null, { completed, errors, dbUpdateErrors })
        }
    }

    const addCompleted = (res) => {
        completed.push(res)
        return isComplete()
    }

    const addError = (res) => {
        console.log(res)
        errors.push(res)
        return isComplete()
    }

    const updateDbRecord = (dbUpdate)=>{
        if (dbUpdate && dbUpdate.newPath) {
            executeQuery(connection, `UPDATE image_dimension SET path = '${dbUpdate.newPath}' WHERE id = ${dbUpdate.id}`)
                .then(() => {
                    delete databaseUpdates[dbUpdate.id]
                    isComplete()
                })
                .catch(error=>{
                    dbUpdateErrors.push({ error: ERROR(error), record: dbUpdate})
                    delete databaseUpdates[dbUpdate.id]
                    isComplete()
                })
        }
    }

    if (!encoder) {
        return resolve(`no encoder set`)
    }

    const config = {
        Host: process.env.RDS_HOST,
        Username: process.env.RDS_USER,
        Password: process.env.RDS_PASSWORD
    }

    if (!config.Host || !config.Username || !config.Password) {
        return resolve(`Invalid database credentials`)
    }

    let _imageOptions = event.imageOptions

    if (!_imageOptions) {
        return resolve(`No image options`)
    }

    try {
        _imageOptions = JSON.parse(decodeURIComponent(_imageOptions))
    } catch (error) { }

    if (!Array.isArray(_imageOptions) || !_imageOptions.length) {
        return resolve(`No image options`)
    }

    _imageOptions.forEach(imageOption => {
        imageOptions[imageOption.name] = imageOption
    })

    connection = mysql.createConnection({
        host: config.Host,
        user: config.Username,
        password: config.Password
    })

    connection.connect(function (error) {
        if (error) {
            return resolve(`DB connection error: ${ERROR(error)}`)
        }

        return executeQuery(connection, `use geforce`)
            .then(() => executeQuery(connection, `SELECT image_dimension.image_id AS image_id, constant.value AS type, image_dimension.id AS id, image_dimension.path AS path FROM image_dimension JOIN constant ON image_dimension.type_id = constant.id`))
            .then(res => parseResults(res.result, imageOptions, sourceS3Bucket))
            .then(_results => {

                results = _results
                // databaseUpdates = results.databaseUpdate

                // if (results.databaseUpdate){
                //     for (let d in results.databaseUpdate) {
                //         updateDbRecord(results.databaseUpdate[d])
                //     }
                // }

                for (let i in results.results) {
                    if (results.results[i]) {
                        encodeImage(results.results[i], encoder)
                            .then(res => {
                                addCompleted(res)
                            })
                            .catch(res => {
                                addError(res)
                            })
                    }
                }
            })
            .catch((res) => {
                return resolve(ERROR(res))
            })
    })
}

exports.handler = handler