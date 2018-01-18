const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const isVendorModule = (module) => {
    if (!module.context) {
        return false;
    }

    const nodeModule = module.context.indexOf('node_modules') !== -1;
    const bitwardenModule = module.context.indexOf('@bitwarden') !== -1;
    return nodeModule && !bitwardenModule;
};

module.exports = {
    entry: {
        'popup/app': './src/popup/app/app.js',
        'background': './src/background.ts',
        'content/autofill': './src/content/autofill.js',
        'content/autofiller': './src/content/autofiller.js',
        'content/notificationBar': './src/content/notificationBar.js',
        'content/shortcuts': './src/content/shortcuts.js',
        'notification/bar': './src/notification/bar.js',
        'downloader/downloader': './src/downloader/downloader.ts',
        '2fa/2fa': './src/2fa/2fa.ts',
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                enforce: 'pre',
                loader: 'tslint-loader'
            },
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules\/(?!(@bitwarden)\/).*/
            },
            {
                test: /\.(html)$/,
                loader: 'html-loader'
            },
            {
                test: /.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
                exclude: /loading.svg/,
                use: [{
                    loader: 'file-loader',
                    options: {
                        name: '[name].[ext]',
                        outputPath: 'popup/fonts/',
                        publicPath: '../'
                    }
                }]
            },
            {
                test: /\.(jpe?g|png|gif|svg)$/i,
                exclude: /.*(fontawesome-webfont|glyphicons-halflings-regular)\.svg/,
                use: [{
                    loader: 'file-loader',
                    options: {
                        name: '[name].[ext]',
                        outputPath: 'popup/images/',
                        publicPath: '../'
                    }
                }]
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin([
            path.resolve(__dirname, 'build/*')
        ]),
        new webpack.optimize.CommonsChunkPlugin({
            name: 'popup/vendor',
            chunks: ['popup/app'],
            minChunks: isVendorModule
        }),
        new webpack.optimize.CommonsChunkPlugin({
            name: 'vendor',
            chunks: ['background'],
            minChunks: isVendorModule
        }),
        new HtmlWebpackPlugin({
            template: './src/popup/index.html',
            filename: 'popup/index.html',
            chunks: ['popup/vendor', 'popup/app', 'fonts']
        }),
        new HtmlWebpackPlugin({
            template: './src/background.html',
            filename: 'background.html',
            chunks: ['vendor', 'background']
        }),
        new HtmlWebpackPlugin({
            template: './src/notification/bar.html',
            filename: 'notification/bar.html',
            chunks: ['notification/bar']
        }),
        new HtmlWebpackPlugin({
            template: './src/downloader/index.html',
            filename: 'downloader/index.html',
            chunks: ['downloader/downloader']
        }),
        new HtmlWebpackPlugin({
            template: './src/2fa/index.html',
            filename: '2fa/index.html',
            chunks: ['2fa/2fa']
        }),
        new CopyWebpackPlugin([
            './src/manifest.json',
            { from: './src/_locales', to: '_locales' },
            { from: './src/edge', to: 'edge' },
            { from: './src/safari', to: 'safari' },
            { from: './src/images', to: 'images' },
            { from: './src/content/autofill.css', to: 'content' }
        ])
    ],
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        alias: {
            jslib: path.join(__dirname, 'node_modules/@bitwarden/jslib/src')
        }
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'build')
    }
};
