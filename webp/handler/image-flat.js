const sanitizer = require("./sanitize")
const fs = require("fs")
const Canvas = require("canvas")
const sharp = require(`sharp`)

global.document = {
	createElement: function (tag) {
		if (tag === "img") {
			return new Canvas.Image()
		} else if (tag === "canvas") {
			return new Canvas()
		}
	}
}

/*
options = {
	viewWidth,
	viewHeight,
	tilt,
	pan,
	zoom,
	x,
	y,
	width,
	height,
	pixelRatio,
	type
}
*/

function drawFabric(sourceUrl, options) {
	return new Promise((resolve) => {

		options = options || {}
		options.viewWidth = options.viewWidth ? sanitizer.number(options.viewWidth) : options.viewwidth ? sanitizer.number(options.viewwidth) : options.imageWidth
		options.viewHeight = options.viewHeight ? sanitizer.number(options.viewHeight) : options.viewheight ? sanitizer.number(options.viewheight) : options.imageHeight

		var orientation = options.orientation
		var viewHeight = options.viewHeight
		var viewWidth = options.viewWidth
		var zoom = options.zoom ? sanitizer.number(options.zoom) : options.z ? sanitizer.number(options.z) : 0.5
		var lat = options.tilt ? sanitizer.number(options.tilt) : 0
		var lon = options.pan ? sanitizer.number(options.pan) : 0
		var x = options.x ? sanitizer.number(options.x) : 0
		var y = options.y ? sanitizer.number(options.y) : 0
		var w = options.width ? sanitizer.number(options.width) : viewWidth
		var h = options.height ? sanitizer.number(options.height) : viewHeight
		var pixelRatio = options.pixelRatio ? sanitizer.number(options.pixelRatio) : options.pixelratio ? sanitizer.number(options.pixelratio) : 2

		var img = new Canvas.Image()
		img.onload = function () {
			var loadedImg = img
			var imgWidth = loadedImg.width
			var imgHeight = loadedImg.height
			console.log("imgWidth", orientation, imgWidth, imgHeight)

			if (options.type === "3d"){
				imgWidth = imgWidth / 2
			}

			var canvas = new Canvas(viewWidth, viewHeight)
			canvas.style = {} // dummy shim to prevent errors during render.setSize

			var ctx = canvas.getContext("2d");
			// ctx.scale(zoom * pixelRatio, zoom * pixelRatio);
			// ctx.drawImage(loadedImg, (lon / zoom) / pixelRatio, (lat / zoom) / pixelRatio)
			ctx.drawImage(loadedImg, 0, 0, imgWidth, imgHeight, 0, 0, viewWidth, viewHeight)

			var cropCanvas = new Canvas(w, h)
			cropCanvas.style = {} // dummy shim to prevent errors during render.setSize

			cropCanvas.getContext("2d").drawImage(canvas, -x, -y)

			var scaleWidth = 600
			var scaleFactor = (scaleWidth / w)

			var resizeCanvas = new Canvas(scaleWidth, h * scaleFactor)
			resizeCanvas.style = {} // dummy shim to prevent errors during render.setSize

			resizeCanvas.getContext("2d").drawImage(canvas,
				x, y, w, h,
				0, 0, resizeCanvas.width, resizeCanvas.height)

			var buffers = []
			var canvasStream = resizeCanvas.jpegStream()

			canvasStream.on("data", function (chunk) { buffers.push(chunk) })
			canvasStream.on("end", function () {
				resolve({
					buffer: Buffer.concat(buffers),
					width: resizeCanvas.width,
					height: resizeCanvas.height
				})
			})
		}

		sharp(sourceUrl)
			.rotate()
			.toBuffer({}, (err, data) => {
				if(err){
					return reject(err)
				}

				img.src = data
			})

	})
}

module.exports = drawFabric