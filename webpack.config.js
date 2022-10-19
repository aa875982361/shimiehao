const { resolve } = require('path')
const webpack = require('webpack')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const MinaWebpackPlugin = require('./plugin/MinaWebpackPlugin')
const MinaRuntimePlugin = require('./plugin/MinaRuntimePlugin')
const LodashWebpackPlugin = require('lodash-webpack-plugin')

const debuggable = process.env.BUILD_TYPE !== 'release'

module.exports = {
  context: resolve('src/miniprogram'),
  entry: { main: './app.ts' },
  output: {
    path: resolve('dist'),
    filename: '[name].js',
    publicPath: resolve('dist'),
    globalObject: 'wx',
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
        "@core": resolve(__dirname, './src/miniprogram/core'),
        "@mono-shared": resolve(__dirname, './src/mono-shared/src')
    }
  },
  module: {
    rules: [
      {
        test: /src\/(.*)\.(ts)x?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            experimentalWatchApi: true,
            onlyCompileBundledFiles: true,
          },
        },
        
      },
      {
        test: /\.(less)$/,
        include: /src\/miniprogram/,
        use: [
          {
            loader: 'file-loader',
            options: {
              useRelativePath: true,
              name: '[path][name].wxss',
              context: resolve('src/miniprogram'),
            },
          },
          {
            loader: resolve(__dirname, './loader/change-import-less.js'),
          },
          {
            loader: 'less-loader',
            options: {
              webpackImporter: false,
            },
          }
        ],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin({
      cleanStaleWebpackAssets: false,
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: '**/*',
          to: './',
          filter: resourcePath => !['.ts', '.less'].some(item => resourcePath.endsWith(item)),
        },
      ],
    }),
    new MinaWebpackPlugin({
      scriptExtensions: ['.ts', '.js'],
      assetExtensions: ['.less'],
    }),
    new MinaRuntimePlugin(),
    new LodashWebpackPlugin(),
    new webpack.EnvironmentPlugin({
      NODE_ENV: JSON.stringify(process.env.NODE_ENV) || 'development',
      BUILD_TYPE: JSON.stringify(process.env.BUILD_TYPE) || 'debug',
    }),
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
      name: 'common',
      minChunks: 2,
      minSize: 0,
    },
    runtimeChunk: {
      name: 'runtime',
    },
  },
  mode: debuggable ? 'none' : 'production',
  devtool: debuggable ? 'inline-source-map' : 'source-map',
}
