var illegalRe = /[<>\\*\|"]/g
var controlRe = /[\x00-\x1f\x80-\x9f]/g
var reservedRe = /^\.+$/
var windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i
var windowsTrailingRe = /[\. ]+$/

function getType(el) {
    if (el === undefined) {
        return 'undefined'
    }

    if (el === null) {
        return 'null'
    }

    if (el === true || el === false) {
        return 'boolean'
    }

    if (typeof el === 'number') {
        return 'number'
    }

    if (Object.prototype.toString.call(el) === '[object Date]' || (el.indexOf && el.indexOf(':') > -1 && new Date(el) !== "Invalid Date" && !isNaN(new Date(el)))) {
        return 'date'
    }

    if (typeof el === 'string') {
        return 'string'
    }

    var string = {}.toString.apply(el)
    if (string === '[object Array]') {
        return 'array'
    }
    if (string === '[object Object]') {
        return 'object'
    }
    if (string === '[object Function]') {
        return 'function'
    }
}

// function isAlphaNumeric(str) {
// 	var code, i, len

// 	for (i = 0, len = str.length; i < len; i++) {
// 		code = str.charCodeAt(i);
// 		if (!(code > 47 && code < 58) && // numeric (0-9)
// 			!(code > 64 && code < 91) && // upper alpha (A-Z)
// 			!(code > 96 && code < 123)) { // lower alpha (a-z)
// 			return false
// 		}
// 	}
// 	return true
// }

// function unicodeEscape(str) {
// 	if (isAlphaNumeric(str)) {
// 		return str
// 	}

// 	return str.replace(/[\s\S]/g, function (character) {
// 		var escape = character.charCodeAt().toString(16),
// 			longhand = escape.length > 2
// 		return '\\' + (longhand ? 'u' : 'x') + ('0000' + escape).slice(longhand ? -4 : -2)
// 	})
// }

function encodeEntities(input) {
    return input.replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
}

function sanitizeString(input) {
    if (typeof input !== "string") {
        return
    }

    if (input === "") {
        return
    }

    // input = input.map((char) => {
    // 	return unicodeEscape(char)
    // })

    // input = input.join("")

    input = input
        .replace(illegalRe, "")
        .replace(controlRe, "")
        .replace(reservedRe, "")
        .replace(windowsReservedRe, "")
        .replace(windowsTrailingRe, "")

    input = encodeEntities(input)

    if (input === "") {
        return
    }

    return input
}

function sanitizeUrl(input) {
    if (typeof input !== "string") {
        return
    }

    if (input === "") {
        return
    }

    input = input
        .replace(illegalRe, "")
        .replace(controlRe, "")
        .replace(reservedRe, "")
        .replace(windowsReservedRe, "")
        .replace(windowsTrailingRe, "")

    if (input === "") {
        return
    }

    input = encodeEntities(input)

    return input
}

function sanitizeNumber(input) {
    if (input % 1 === 0) {
        if (!isNaN(parseInt(input))) {
            return parseInt(input)
        }
    } else if (!isNaN(parseFloat(input))) {
        return parseFloat(input)
    }

    return
}


function sanitizeObject(input) {
    try {
        input = JSON.parse(JSON.stringify(input))

        if (getType(input) !== "object") {
            return
        }

        var keys = Object.keys(input)

        keys.forEach((key) => {
            switch (getType(input[key])) {
                case "object":
                    input[key] = sanitizeObject(input[key])
                    break

                case "array":
                    input[key] = sanitizeArray(input[key])
                    break

                case "string":
                    input[key] = sanitizeUrl(input[key])
                    break

                case "boolean":
                    input[key] = input[key]
                    break

                case "number":
                    input[key] = sanitizeNumber(input[key])
                    break

                case "date":
                    input[key] = new Date(input[key]).getTime()
                    break

                case "undefined":
                case "null":
                case "function":
                    input[key] = false
                    break
            }
        })

        return input

    } catch (e) {
        return
    }

    return
}


function sanitizeArray(input) {
    try {
        input = JSON.parse(JSON.stringify(input))

        if (getType(input) !== "array") {
            return
        }

        input.forEach((el, key) => {
            switch (getType(input[key])) {
                case "object":
                    input[key] = sanitizeObject(input[key])
                    break

                case "array":
                    input[key] = sanitizeArray(input[key])
                    break

                case "string":
                    input[key] = sanitizeUrl(input[key])
                    break

                case "boolean":
                    input[key] = input[key]
                    break

                case "number":
                    input[key] = sanitizeNumber(input[key])
                    break

                case "date":
                    input[key] = new Date(input[key]).getTime()
                    break

                case "undefined":
                case "null":
                case "function":
                    input[key] = false
                    break
            }
        })

        return input

    } catch (e) {
        return
    }

    return
}

function sanitizeEmail(input) {
    if (typeof input !== "string") {
        return
    }

    if (input === "") {
        return
    }

    input = input
        .replace(illegalRe, "")
        .replace(controlRe, "")
        .replace(reservedRe, "")
        .replace(windowsReservedRe, "")
        .replace(windowsTrailingRe, "")

    if (input === "") {
        return
    }

    input = encodeEntities(input)

    return input
}

module.exports = {
    string: sanitizeString,
    url: sanitizeUrl,
    email: sanitizeEmail,
    number: sanitizeNumber,
    object: sanitizeObject,
    array: sanitizeArray
}