// development config
const merge = require('webpack-merge');
const webpack = require('webpack');


// shared config (dev and prod)
const { resolve } = require('path');
//const { CheckerPlugin } = require('awesome-typescript-loader');
//const StyleLintPlugin = require('stylelint-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

commonConfig = {
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    context: resolve(__dirname, './src'),
    module: {
        rules: [
            {
                test: /\.js$/,
                use: ['babel-loader', 'source-map-loader'],
                exclude: /node_modules/,
            },
            {
                test: /\.tsx?$/,
                use: ['awesome-typescript-loader'],
            },
            {
                test: /\.css$/,
                use: ['style-loader', { loader: 'css-loader', options: { importLoaders: 1 } }],
            },
            {
                test: /\.scss$/,
                loaders: [
                    'style-loader',
                    { loader: 'css-loader', options: { importLoaders: 1 } },
                    'sass-loader',
                ],
            },
            {
                test: /\.(jpe?g|png|gif|svg)$/i,
                loaders: [
                    'file-loader?hash=sha512&digest=hex&name=img/[hash].[ext]',
                    'image-webpack-loader?bypassOnDebug&optipng.optimizationLevel=7&gifsicle.interlaced=false',
                ],
            },
        ],
    },
    plugins: [
        //new CheckerPlugin(),
        //new StyleLintPlugin(),
        new HtmlWebpackPlugin({ template: './test/index.html', }),
    ],

    performance: {
        hints: false,
    },
};

module.exports = merge(commonConfig, {
    mode: 'development',
    entry: [
        './test/index.tsx' // the entry point of our app
    ],
    devServer: {
        hot: true, // enable HMR on the server
    },
    devtool: 'cheap-module-eval-source-map',
    plugins: [
        new webpack.HotModuleReplacementPlugin(), // enable HMR globally
        new webpack.NamedModulesPlugin(), // prints more readable module names in the browser console on HMR updates
    ],
});