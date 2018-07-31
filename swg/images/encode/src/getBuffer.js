const url = require(`url`)
const https = require(`https`)
const http = require(`http`)
const ERROR = require('./error')

function getBuffer(urlToGet){
    return new Promise((resolve, reject)=>{
        try {
            let getUrl = new url.parse(urlToGet)
            let getOptions = {
                host: getUrl.host.indexOf(`localhost`) > -1 ? `localhost` : getUrl.host,
                protocol: getUrl.protocol,
                path: getUrl.path,
                port: getUrl.port,
                method: 'GET'
            }

            let httpModule = getOptions.protocol === `https:` ? https : http

            const getReq = httpModule.request(getOptions, function (getResp) {
                let buffers = []

                getResp.on('error', (error) => reject(ERROR(error)))
                getResp.on('data', (chunk) => { buffers.push(chunk) })
                getResp.on('end', () => resolve(Buffer.concat(buffers)))
            })

            getReq.end()
        } catch (error) {
            reject(ERROR(error))
        }
    })
}

module.exports = getBuffer