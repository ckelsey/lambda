const path = require('path')
const SRC_DIR = path.resolve(__dirname, 'env/linux/src')
const OUT_DIR = path.resolve(__dirname, 'env/linux/build')

// const nodeModules = {};
// fs.readdirSync('node_modules')
//     .filter(item => ['.bin'].indexOf(item) === -1)  // exclude the .bin folder
//     .forEach((mod) => {
//         nodeModules[mod] = 'commonjs ' + mod;
//     });

const config = {
    entry: {
        index: path.resolve(SRC_DIR, 'index.js')
    },
    // aws-sdk is already available in the Node.js Lambda environment
    //  so it should not be included in function bundles
    externals: [
        'aws-sdk'
    ],
    output: {
        path: OUT_DIR,
        filename: '[name].js',
        library: '[name]',
        libraryTarget: 'commonjs'
    },
    target: 'node',
    module: {
        rules: [
            {
                use: 'babel-loader',
                test: /\.js$/,
                exclude: /node_modules/
            },
            {
                test: /\.node$/,
                use: 'node-loader'
            }
        ]
    }
}

module.exports = config