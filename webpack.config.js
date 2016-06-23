var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
    entry: {
        'index': './index-new.js',
        // 'push-notification-admin': './css/push-notification-admin.css',
        // 'bootstrap': './css/bootstrap.min.css'
    },
    output: {
        filename: "index.min.js"
    },
    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                loaders: ['babel?cacheDirectory'],
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['', '.js', '.jsx']
    },
    plugins: [
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.OccurenceOrderPlugin()
        // new webpack.optimize.UglifyJsPlugin({
        //     compress: {
        //         unused: true,
        //         dead_code: true,
        //         warnings: false,
        //         drop_debugger: true
        //     }
        // })
    ]
};