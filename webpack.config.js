const path = require('path');
const { getWebpackEntryObjByMiniprogramRoot } = require('./webpack-plugins/utils');

const miniprogramRootPath = path.resolve("./src/miniprogram")

module.exports = {
    context: miniprogramRootPath,
    entry: getWebpackEntryObjByMiniprogramRoot(miniprogramRootPath),
    output: {
        path: path.resolve("dist"),
        filename: "[name].js",
    },
    module: {
        rules: [{
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
        }]
    },
    resolve: {
        extensions: [ '.tsx', '.ts', '.js' ]
    },
    mode: "development",
    plugins: [
    ]
};