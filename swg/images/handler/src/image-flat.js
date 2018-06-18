const sanitizer = require("./sanitize")
const fs = require("fs")
const { createCanvas, Image } = require('canvas')
const sharp = require(`sharp`)

global.document = {
	createElement: function (tag) {
		if (tag === "img") {
			return new Image()
		} else if (tag === "canvas") {
			return new createCanvas()
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
		options.viewWidth = options.viewWidth ? sanitizer.number(options.viewWidth) : options.viewwidth ? sanitizer.number(options.viewwidth) : options.type === "3d" ? options.imageWidth / 2 : options.imageWidth
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

		var img = new Image()
		img.onload = function () {
			var imgWidth = img.width
			var imgHeight = img.height

			if (options.type === "3d"){
				imgWidth = imgWidth / 2
			}

			var canvas = new createCanvas(viewWidth, viewHeight)
			canvas.style = {} // dummy shim to prevent errors during render.setSize

			var ctx = canvas.getContext("2d")
			ctx.drawImage(img, 0, 0, imgWidth, imgHeight, 0, 0, viewWidth, viewHeight)

			var cropCanvas = new createCanvas(w, h)
			cropCanvas.style = {} // dummy shim to prevent errors during render.setSize
			cropCanvas.getContext("2d").drawImage(canvas, -x, -y)

			var buffers = []
			var canvasStream = cropCanvas.jpegStream({ quality: 100 })

			canvasStream.on("data", function (chunk) { buffers.push(chunk) })
			canvasStream.on("end", function () {
				resolve(Buffer.concat(buffers))
			})
		}

		img.src = sourceUrl

	})
}

module.exports = drawFabric