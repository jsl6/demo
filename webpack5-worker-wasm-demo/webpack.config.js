const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const isProduction = process.env.NODE_ENV === 'production';

const dist = path.resolve(__dirname, 'dist');

const rules = [
  {
    // 第三方库解析
    test: /\.js$/,
    use: 'babel-loader',
    exclude: /node_modules/,
  },
  {
    test: /\.(le|c)ss$/,
    use: ['style-loader', 'css-loader', 'less-loader'],
    sideEffects: true, // 开启副作用
  },
  {
    // 解析ts文件，业务代码
    // ts => es6 => babel => es5
    test: /\.ts$/,
    use: [
      'babel-loader',
      {
        loader: 'awesome-typescript-loader',
        options: {
          // 不做语法检查，检查交由plugin来处理
          transpileOnly: true,
        },
      },
    ],
    exclude: [/node_modules/, /typings/],
  },
];

const appConfig = {
  entry: './src/main.ts',
  devServer: {
    contentBase: dist,
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: 'static', to: '.' }],
    }),
    new MiniCssExtractPlugin(),
    new HtmlWebpackPlugin({
      template: 'index.html',
    }),
  ],
  resolve: {
    extensions: ['.js'],
  },
  module: {
    rules,
  },
  output: {
    path: dist,
    filename: 'app.js',
  },
};

const workerConfig = {
  entry: './src/worker.ts',
  target: 'webworker',
  plugins: [
    // new WasmPackPlugin({
    //   crateDirectory: path.resolve(__dirname, "./cv-wasm")
    // })
  ],
  resolve: {
    extensions: ['.js', '.wasm', '.ts'],
  },
  module: {
    rules,
  },
  output: {
    path: dist,
    filename: 'worker.js',
  },
};

const moduleConfig = {
  entry: './src/module.ts',
  target: 'webworker',
  plugins: [],
  resolve: {
    extensions: ['.js', '.wasm', '.ts'],
  },
  module: {
    rules,
  },
  output: {
    path: dist,
    filename: 'module.js',
  },
};

const wasmConfig = {
  entry: './src/wasm-util.ts',
  target: 'webworker',
  plugins: [],
  resolve: {
    extensions: ['.js', '.wasm', '.ts'],
  },
  module: {
    rules,
  },
  output: {
    path: dist,
    filename: 'wasm-util.js',
  },
};

module.exports = [appConfig, workerConfig, moduleConfig, wasmConfig];
