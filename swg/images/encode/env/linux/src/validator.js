const _get = function (el, path, emptyVal) {
    path = [el].concat(path.split("."))

    var result = path.reduce(function (accumulator, currentValue) {
        if (currentValue) {
            return accumulator[currentValue]
        } else {
            return accumulator
        }

    })

    if (!result) {
        return emptyVal
    }

    return result
}

module.exports = (data)=>{
    var model = _get(data, "Model", "").toLowerCase()
    var software = _get(data, "Software", "").toLowerCase()
    var make = _get(data, "Make", "").toLowerCase()
    var Description = _get(data, "ImageDescription", _get(data, "Description"))
    var MakerNote = _get(data, "MakerNote")
    var isValid = (model.indexOf("nvidia") > -1 ||
        model.indexOf("ansel") > -1 ||
        model.indexOf("nvcamera") > -1 ||
        software.indexOf("nvidia") > -1 ||
        software.indexOf("ansel") > -1 ||
        software.indexOf("nvcamera") > -1 ||
        make.indexOf("nvidia") > -1 ||
        make.indexOf("ansel") > -1 ||
        make.indexOf("nvcamera") > -1
    )

    return isValid
}