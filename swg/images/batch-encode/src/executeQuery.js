const ERROR = require('./error')

module.exports = (db, query) => {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(`No database connection`)
        }

        if (!query) {
            return reject(`No database query`)
        }

        return db.query(query, function (error, result, fields) {
            if (error) {
                return reject(`DB query error: ${ERROR(error)}`)
            }

            return resolve({ result, fields })
        })
    })
}