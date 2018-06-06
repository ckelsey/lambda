const mysql = require('mysql')

exports.handler = (event, context, callback) => {

    const connection = mysql.createConnection({
        host: process.env.endpoint,
        user: process.env.user,
        password: process.env.password,
        database: process.env.db,
    })

    connection.connect(function (connectError) {

        if (connectError) {
            return callback({
                error: connectError,
                results: null,
                fields: null
            })
        }

        connection.query(event.sql, event.data, function (error, results, fields) {

            return callback({
                error,
                results,
                fields
            })
        })
    })

}