const https = require('https')
const URL = require(`url`)

var html = `<html>
        <head>
            <meta name="keywords" content="Nvidia ansel, Game photos, Nvidia ansel games, Nvidia contest, Geforce contest, Shotwithgeforce  ">
            <meta http-equiv="content-type" content="text/html; charset=UTF-8">
            <meta name="robots" content="NOODP,NOYDIR">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="canonical" href="{{url}}">
            <link rel="shortlink" href="{{url}}">
            <link rel="image_src" href="{{thumb}}" />

            <meta property="og:image" content="{{thumb}}">
            <meta property="og:image:width" content="600">
            <meta property="og:image:height" content="340">
            <meta property="og:title" content="{{title}}">
            <meta property="og:url" content="{{url}}">
            <meta property="og:description" content="{{description}}">
            <meta property="og:type" content="website">
            <meta property="og:site_name" content="NVIDIA">
            <meta property="fb:app_id" content="130554466964019">
            <meta property="og:locale" content="en_US"/>

            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:site" content="@GeForce">
            <meta name="twitter:creator" content="@NVIDIAGeForce">
            <meta name="twitter:title" content="{{title}}">
            <meta name="twitter:url" content="{{url}}">
            <meta name="twitter:description" content="{{description}}">
            <meta name="twitter:image" content="{{thumb}}">

            <meta property="weibo:image" content="{{thumb}}">
            <meta property="weibo:title" content="{{title}}">
            <meta property="weibo:url" content="{{url}}">
            <meta name="weibo:webpage: url" content="{{url}}" />
            <meta name="weibo:webpage: title" content="{{title}}" />
            <meta name="weibo:webpage: description" content="{{description}}" />
            <meta name="weibo:webpage: image" content="{{thumb}}" />

            <meta property="vk:image" content="{{thumb}}">
            <meta property="vk:title" content="{{title}}">
            <meta property="vk:url" content="{{url}}">
    
            {{css}}
            
        </head>
        <body>
            <div id="main-header"></div>
            <div id="page-content"></div>
            {{scripts}}
        </body>
    </html>`

var getImage = (event) => {
    return new Promise((resolve, reject) => {
        console.log(event.queryStringParameters.image_id)

        if (!event.queryStringParameters || !event.queryStringParameters.image_id) {
            return resolve(html)
        }

        var options = {
            host: event.api.host,
            port: 443,
            path: `${event.api.endpoints.images}?image_id=${event.queryStringParameters.image_id}`,
            method: 'GET'
        }

        var post_req = https.request(options, function (resp) {
            let data = ''
            resp.on('data', (chunk) => { data += chunk })
            resp.on('end', () => {
                var json

                try {
                    json = JSON.parse(data)
                } catch (error) {
                    json = false
                }

                console.log("json", json)

                if (json && json.list && json.list[0]) {
                    return resolve(html
                        .split(`{{title}}`).join(json.list[0].title)
                        .split(`{{description}}`).join(json.list[0].user.name)
                        .split(`{{thumb}}`).join(json.list[0].customThumbnailPath)
                        .split(`{{id}}`).join(`?image_id=${event.queryStringParameters.image_id}`))
                }

                resolve(html)
            })
        })

        post_req.end()
    })
}

var getCSS = (event) => {
    var files = event.cssFiles.split(`,`).map(c => c.trim())
    var result = ``

    files.forEach(url => {
        if (!url || url === ``) {
            return
        }
        result += `<link rel="stylesheet" href="${url}" type="text/css">`
    });

    return result
}

var getScripts = (event) => {
    var files = event.scriptFiles.split(`,`).map(c => c.trim())
    var result = ``

    files.forEach(url => {
        if (!url || url === ``){
            return
        }
        result += `<script src="${url}" type="text/javascript"></script>`
    });

    return result
}

exports.handler = (event, context, callback) => {
    event.api = {
        host: process.env.API_HOST,
        endpoints: {
            images: process.env.API_IMAGES_PATH
        }
    }

    event.cssFiles = process.env.CSS ? process.env.CSS : ``
    event.scriptFiles = process.env.JS ? process.env.JS : ``

    event.doc = ``

    var resolve = (doc) => {
        callback(null, {
            "isBase64Encoded": false,
            "statusCode": 200,
            "headers": { "Content-type": "text/html" },
            "body": doc
        })
    }

    var doc = ``
    var thisUrl = `${event.headers[`X-Forwarded-Proto`] || `https`}://${event.headers.Host}${event.path}`
    var queryParams = event.queryStringParameters
    var queryString = ``

    if (queryParams && Object.keys(queryParams).length) {
        queryString = `?`

        for (var q in queryParams) {
            if (queryParams.hasOwnProperty(q) && queryParams[q] !== `` && queryParams[q] !== `undefined` && queryParams[q] !== `null`) {
                queryString += `${q}=${queryParams[q]}`
            }
        }
    } else {
        queryParams = {}
    }

    if (queryParams.image_id) {

    }

    getImage(event)
        .then(res => {
            event.doc = res
                .split(`{{url}}`).join(`${thisUrl}${queryString}`)
                .split(`{{css}}`).join(getCSS(event))
                .split(`{{scripts}}`).join(getScripts(event))

            resolve(event.doc)
        })

}