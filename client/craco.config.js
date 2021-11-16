const { addBeforeLoader, loaderByName } = require('@craco/craco');

module.exports = {
  webpack: {
    alias: {
      fs: 'pdfkit/js/virtual-fs.js',
    },
    configure: (webpackConfig, { env, paths }) => {
      // add before url-loader
      // console.log(JSON.stringify(webpackConfig.module.rules, null, 2))
      const urlLoader = loaderByName('url-loader');

      const loaders = [
        {
          test: /\.afm$/,
          loader: 'raw-loader',
        },
        {
          test: /src[/\\]assets/,
          loader: 'arraybuffer-loader',
        },
        {
          enforce: 'post',
          test: /linebreak[/\\]src[/\\]linebreaker.js/,
          loader: 'transform-loader?brfs',
        },
        {
          enforce: 'post',
          test: /unicode-properties[/\\]index.js$/,
          loader: 'transform-loader?brfs',
        },
        {
          enforce: 'post',
          test: /fontkit[/\\]index.js$/,
          loader: 'transform-loader?brfs',
        },
      ];

      loaders.forEach((l) => addBeforeLoader(webpackConfig, urlLoader, l));

      // console.log(JSON.stringify(webpackConfig.module.rules, null, 2))
      return webpackConfig;
    },
  },
};
