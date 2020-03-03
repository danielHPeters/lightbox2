'use strict'

const {CheckerPlugin} = require('awesome-typescript-loader')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const path = require('path')

module.exports = {
  entry: {
    lightbox: ['./src/ts/app.ts', './src/sass/lightbox.sass'],
  },
  output: {
    publicPath: '/dist',
    path: path.join(__dirname, './dist'),
    filename: './js/[name].min.js'
  },
  devtool: 'source-map',
  resolve: {
    // Add '.ts' and '.tsx' as a resolvable extension.
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.sass', '.png', '.jpg', '.svg', '.gif']
  },
  module: {
    rules: [
      // all files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
      {
        test: /\.tsx?$/,
        loader: ['awesome-typescript-loader']
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        include: path.join(__dirname, './src/images'),
        loader: 'file-loader',
        options: {
          debug: true,
          name: 'images/[name].[ext]'
        }
      },
      {
        test: /\.sass$/,
        use: ExtractTextPlugin.extract({
          publicPath: '../',
          fallback: 'style-loader',
          use: [
            {
              loader: 'css-loader',
              options: {
                sourceMap: true
              }
            },
            {
              loader: 'resolve-url-loader'
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: true
              }
            }]
        })
      }
    ]
  },
  plugins: [
    new CheckerPlugin(),
    new ExtractTextPlugin({filename: './css/lightbox.css'})
  ]
}
