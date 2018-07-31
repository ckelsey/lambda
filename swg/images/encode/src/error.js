module.exports = error => {
    if(typeof error === `string`){
        return string
    }

    if (error.toString && error.toString() !== `[object Object]` && error.toString() !== `[object Date]` && error.toString() !== `[object Array]`){
        return error.toString()
    }

    return JSON.stringify(error)
}