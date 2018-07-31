# Using s3-zip in combination with AWS Lambda

## Create a lambda function


```javascript
var AWS = require('aws-sdk')
var s3Zip = require('s3-zip')

exports.handler = function (event, context) {
  console.log('event', event)
  

  var region = event.region
  var bucket = event.bucket
  var folder = event.folder
  var files = event.files
  var zipFileName = event.zipFileName

  // Create body stream
  try {

    var body = s3Zip.archive({ region: region, bucket: bucket}, folder, files)
    var zipParams = { params: { Bucket: bucket, Key: folder + zipFileName } }
    var zipFile = new AWS.S3(zipParams)
    zipFile.upload({ Body: body })
      .on('httpUploadProgress', function (evt) { console.log(evt) })
      .send(function (e, r) { 
        if (e) {
          var err = 'zipFile.upload error ' + e
          console.log(err)         
          context.fail(err)
        } 
        console.log(r) 
        context.succeed(r)
      })

  } catch (e) {
    var err = 'catched error: ' + e
    console.log(err)    
    context.fail(err)
  }

}

```

## Invoke the function

```javascript
var AWS = require('aws-sdk')

var region = 'bucket-region'
var bucket = 'name-of-s3-bucket'
var folder = 'name-of-bucket-folder/'
var file1 = 'Image A.png'
var file2 = 'Image B.png'
var file3 = 'Image C.png'
var file4 = 'Image D.png'


AWS.config.update({
  region: region
})

var lambda = new AWS.Lambda()

var files = [file1, file2, file3, file4]
var payload = JSON.stringify({ 
  'region'     : region,
  'bucket'     : bucket,
  'folder'     : folder,
  'files'      :  files,
  'zipFileName': 'bla.zip'
})

var params = {
  FunctionName : 'NAME_OF_YOUR_LAMBDA_FUNCTION', 
  Payload      : payload
}


lambda.invoke(params, function (err, data) {
  if (err) console.log(err, err.stack) // an error occurred
  else     console.log(data)           // successful response
})

```
