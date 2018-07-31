SHOT WITH GEFORCE IMAGE ENCODER
===============================


LAMBDA SETUP
-------------------------------
- Required enviroment variables:
    * BUCKET_NAME: The bucket to put the images in

- The function must be created with a role that has access to write to S3, sample policy below:
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "s3:*",
            "Resource": "*"
        }
    ]
}

- Memory should be set to the maximum(3000MB)
- Timeout should be set to maximum (5min)
- Handler should be set to index.handler
- Runtime should be set to Node.js 8.10


LOCAL SETUP
-------------------------------

