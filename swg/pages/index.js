const https = require('https')

exports.handler = (event, context, callback) => {
    var body = ``
    var head = `
        <style>
            html, body{margin:0px; width:100%; height: 100%; background: #323232; font: 14px sans-serif; color: #dedede;}
            a{color: inherit; text-decoration: none !important;}
        </style>
    `
    var heading = `
        <h1>Welcome to SWG</h1>
        <p><ul>
            <li><a href="/swg/images">Images</a></li>
        </ul></p>
    `

    var finish = function () {
        var html = `<!DOCTYPE html><html><head>${head}</head><body>${body}</body><html>`

        callback(null, {
            "isBase64Encoded": false,
            "statusCode": 200,
            "headers": { "Content-type": "text/html" },
            "body": html
        })
    }

    switch (event.path) {
        case `/swg`:
            body = heading
            finish()
            break

        case `/swg/images`:
            const mysql = require('mysql')
            const connection = mysql.createConnection({
                host: "swg.cpej3cs4whd5.us-east-1.rds.amazonaws.com",
                user: "swgckcreates",
                password: "QTbr5K0!Sp$e",
                database: "swg",
            })

            body = `${heading}<h3>Images</h3><div id="images-container">{{images}}</div>`

            connection.connect(function(connectError){

                if (connectError) {
                    body = body.split(`{{images}}`).join(`<p>Could not connect to the database.</p>`)
                    connection.destroy()
                    return finish()
                }

                connection.query('show tables', function (error, results, fields) {
                    console.log('show tables', error, results)
    
                    if (error) {
                        body = body.split(`{{images}}`).join(`<p>Database error.</p>`)
                        connection.destroy()
                        finish()
                    } else {
                        connection.end(function (err) { 
                            body = body.split(`{{images}}`).join(`<p>images?</p>`)
                            finish()
                         })
                    }
                })
            })


            break

        default:
            body = `Welcome to SWG`
            finish()
    }
}