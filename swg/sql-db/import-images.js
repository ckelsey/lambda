const AWS = require('aws-sdk')

exports.handler = (event, context, callback) => {

    AWS.config.update({ region: process.env.REGION });

};