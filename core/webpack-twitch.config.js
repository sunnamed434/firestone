/* eslint-disable @typescript-eslint/no-var-requires */
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const AngularCompilerPlugin = require('@ngtools/webpack').AngularCompilerPlugin;
const DefinePlugin = require('webpack').DefinePlugin;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

var path = require('path');

var _root = path.resolve(__dirname, '.');

function getRoot(args) {
	args = Array.prototype.slice.call(arguments, 0);
	return path.join.apply(path, [_root].concat(args));
}

const entry = {
	// Keep polyfills at the top so that it's imported first in the HTML
	polyfills: './src/polyfills.ts',
	decktracker: './src/js/modules/decktracker-twitch/main.ts',
};

module.exports = function (env, argv) {
	const plugins = [
		// Define environment variables to export to Angular
		new DefinePlugin({
			'process.env.APP_VERSION': JSON.stringify(env.appversion),
			'process.env.LOCAL_TEST': env.localTest,
		}),

		new AngularCompilerPlugin({
			tsConfigPath: './tsconfig.json',
			entryModule: './src/js/modules/decktracker-twitch/decktracker-twitch.module#DeckTrackerTwitchModule',
			sourceMap: false,
		}),

		new MiniCssExtractPlugin({
			filename: 'app.css',
		}),

		new CopyWebpackPlugin([
			{ from: path.join(process.cwd(), 'src/assets'), to: 'assets', ignore: ['**/twitch*/*'] },
		]),

		buildHtmlWebpackPluginConf('decktracker-twitch.html', 'decktracker'),
	];

	return {
		mode: env.production ? 'production' : 'development',

		entry: entry,

		// https://hackernoon.com/the-100-correct-way-to-split-your-chunks-with-webpack-f8a9df5b7758
		optimization: env.production
			? {
					runtimeChunk: 'single',
					minimize: true,
					minimizer: [
						new TerserPlugin({
							cache: true,
							parallel: true,
							sourceMap: false,
							terserOptions: {
								mangle: false,
								keep_classnames: true,
								keep_fnames: true,
								compress: {
									pure_funcs: ['console.debug'],
								},
							},
						}),
					],
					namedModules: true,
					namedChunks: true,
					splitChunks: {
						chunks: 'all',
						maxInitialRequests: Infinity,
						minSize: 1 * 1000, // Don't split the really small chunks
						cacheGroups: {
							vendor: {
								test: /node_modules/,
								chunks: 'initial',
								name: 'vendor',
								priority: 10,
								enforce: true,
							},
						},
					},
			  }
			: {
					runtimeChunk: 'single',
					splitChunks: {
						chunks: 'all',
						maxInitialRequests: Infinity,
						minSize: 1 * 1000, // Don't split the really small chunks
						cacheGroups: {
							vendor: {
								test: /node_modules/,
								chunks: 'initial',
								name: 'vendor',
								priority: 10,
								enforce: true,
							},
						},
					},
			  },

		target: 'web',

		devtool: env.production ? false : 'inline-source-map',

		// Doesn't work, for some reason the code loaded after refresh is still the old one
		watch: false,

		watchOptions: {
			ignored: ['node_modules', 'test', 'dependencies'],
		},

		output: {
			path: getRoot('dist-twitch'),
			publicPath: './',
			filename: '[name].js',
		},

		resolve: {
			// Having ts before js is important for webpack watch to work
			// However, angular2-indexeddb creates an issue (ts files are packaged alongside js), so
			// you need to remove the .ts files from its node_modules folder
			// See https://github.com/gilf/angular2-indexeddb/issues/67
			extensions: ['.ts', '.js', '.html'],
		},

		module: {
			rules: [
				{
					test: /\.ts$/,
					exclude: [/node_modules/, /test/, /\.worker.ts$/],
					use: ['@ngtools/webpack', 'ts-loader'],
				},
				{
					test: /\.worker.ts$/,
					exclude: [/node_modules/, /test/],
					use: ['ts-loader'],
				},
				{
					test: /\.scss$/,
					exclude: /node_modules/,
					use: ['css-to-string-loader', 'css-loader', 'sass-loader'],
				},
				{
					test: /\.worker\.js$/,
					use: { loader: 'worker-loader' },
				},
			],
		},
		plugins: plugins,
	};
};

const buildHtmlWebpackPluginConf = (filename, chunkName) => {
	// Exclude the other modules. This will still import all the other chunks,
	// thus probably importing some unrelated stuff, but they should be
	// small enough that it should not matter (and we're serving them from
	// the local filesystem, so in the end it doesn't really matter)
	const excludedChunks = Object.keys(entry)
		.filter((chunk) => chunk !== chunkName)
		.filter((chunk) => chunk !== 'polyfills');
	return new HtmlWebpackPlugin({
		filename: filename,
		template: `src/html/${filename}`,
		excludeChunks: excludedChunks,
		chunksSortMode: 'manual',
	});
};
