const path = require('path');

module.exports = {
  entry: './client/main.js',
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, 'client')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        exclude: /(node_modules|bower_components|\.spec\.js)/,
        use: [
          {
            loader: 'webpack-strip-block',
            options: {
              start: "<no-client>",
              end: "</no-client>"
            }
          }
        ]
      }
    ]
  }
}
