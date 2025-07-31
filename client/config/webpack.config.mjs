'use strict';

import * as fs from 'fs';
import { fileURLToPath } from 'url';
import isWsl from 'is-wsl';
import * as path from 'path';
import webpack from 'webpack';
import resolve from 'resolve';
import PnpWebpackPlugin from 'pnp-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin';
import InlineChunkHtmlPlugin from 'react-dev-utils/InlineChunkHtmlPlugin.js';
import TerserPlugin from 'terser-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
/* import OptimizeCSSAssetsPlugin from 'optimize-css-assets-webpack-plugin'; */
import safePostCssParser from 'postcss-safe-parser';
import {WebpackManifestPlugin} from 'webpack-manifest-plugin';
import InterpolateHtmlPlugin from 'react-dev-utils/InterpolateHtmlPlugin.js';
import WorkboxWebpackPlugin from 'workbox-webpack-plugin';
import ModuleScopePlugin from 'react-dev-utils/ModuleScopePlugin.js';
import getCSSModuleLocalIdent from 'react-dev-utils/getCSSModuleLocalIdent.js';

import paths from './paths.cjs';
import modules from './modules.cjs';
import getClientEnvironment from './env.cjs';
import createEnvironmentHash from './webpack/persistentCache/createEnvironmentHash.js';

import ModuleNotFoundPlugin from 'react-dev-utils/ModuleNotFoundPlugin.js';
import ForkTsCheckerWebpackPlugin from 'react-dev-utils/ForkTsCheckerWebpackPlugin.js';
import ESLintPlugin from 'eslint-webpack-plugin';
import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';
import postcssFlexbugsFixes from 'postcss-flexbugs-fixes';
import postcssPresetEnv from 'postcss-preset-env';
import postcssNormalize from 'postcss-normalize';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const appPackageJson = await import(paths.appPackageJson,{assert:{type:'json'}}).then(module => module.default);

// Source maps are resource heavy and can cause out of memory issue for large source files.
const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false';
// Some apps do not need the benefits of saving a web request, so not inlining the chunk
// makes for a smoother build process.
const shouldInlineRuntimeChunk = process.env.INLINE_RUNTIME_CHUNK !== 'false';

const imageInlineSizeLimit = parseInt(process.env.IMAGE_INLINE_SIZE_LIMIT || '10000');

// Check if TypeScript is setup
const useTypeScript = fs.existsSync(paths.appTsConfig);

// style files regexes
const cssRegex = /\.css$/;
const cssModuleRegex = /\.module\.css$/;
const sassRegex = /\.(scss|sass)$/;
const sassModuleRegex = /\.module\.(scss|sass)$/;
const lessRegex = /\.less$/;

// This is the production and development configuration.
// It is focused on developer experience, fast rebuilds, and a minimal bundle.
export default function(webpackEnv) {
  const isEnvDevelopment = webpackEnv === 'development';
  const isEnvProductionProfile = false;
  const isEnvProduction = webpackEnv === 'production';

  // Webpack uses `publicPath` to determine where the app is being served from.
  // It requires a trailing slash, or the file assets will get an incorrect path.
  // In development, we always serve from the root. This makes config easier.
  const publicPath = isEnvProduction ? paths.servedPath : isEnvDevelopment && '/';
  // Some apps do not use client-side routing with pushState.
  // For these, "homepage" can be set to "." to enable relative asset paths.
  const shouldUseRelativeAssetPaths = publicPath === './';

  // `publicUrl` is just like `publicPath`, but we will provide it to our app
  // as %PUBLIC_URL% in `index.html` and `process.env.PUBLIC_URL` in JavaScript.
  // Omit trailing slash as %PUBLIC_URL%/xyz looks better than %PUBLIC_URL%xyz.
  const publicUrl = isEnvProduction ? publicPath.slice(0, -1) : isEnvDevelopment && '';
  // Get environment variables to inject into our app.
  const env = getClientEnvironment(publicUrl);
  console.log(`your env my liege: ${JSON.stringify(env.raw)}`);
  // common function to get style loaders
  const getStyleLoaders = (cssOptions, preProcessor) => {
    const loaders = [
      isEnvDevelopment && 'style-loader',
      isEnvProduction && {
        loader: MiniCssExtractPlugin.loader,
        options: shouldUseRelativeAssetPaths ? { publicPath: '../../' } : {}
      },
      {
        loader: 'css-loader',
        options: cssOptions
      },
      {
        loader: 'postcss-loader',
        options: {
          postcssOptions: {
            ident: 'postcss',
            plugins: [
              postcssFlexbugsFixes,
              [
                postcssPresetEnv,
                {
                  autoprefixer: {
                    flexbox: 'no-2009',
                  },
                  stage: 3,
                },
              ],
              postcssNormalize,
            ],
          },
          sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment, // Adjust based on your environment flags
        },
      }      
    ].filter(Boolean);
    if (preProcessor) {
      loaders.push(
        {
          loader: 'resolve-url-loader',
          options: {
            sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
            root: paths.appSrc,
          }
        },
        {
          loader: preProcessor,
          options: {
            sourceMap: true
          }
        }
      );
    }
    return loaders;
  };
  return {
    target: ['browserslist'],
    stats: 'errors-warnings',
    mode: isEnvProduction ? 'production' : isEnvDevelopment && 'development',
    // Stop compilation early in production
    bail: isEnvProduction,
    devtool: isEnvProduction
      ? shouldUseSourceMap
        ? 'source-map'
        : false
      : isEnvDevelopment && 'cheap-module-source-map',
    // These are the "entry points" to our application.
    // This means they will be the "root" imports that are included in JS bundle.
    entry: paths.appIndexJs,
    output: {
      // The build folder.
      path: paths.appBuild,
      // Add /* filename */ comments to generated require()s in the output.
      pathinfo: isEnvDevelopment,
      // There will be one main bundle, and one file per asynchronous chunk.
      // In development, it does not produce real files.
      filename: isEnvProduction ? 'static/js/[name].[contenthash:8].js' : isEnvDevelopment && 'static/js/bundle.js',
      // There are also additional JS chunk files if you use code splitting.
      chunkFilename: isEnvProduction ? 'static/js/[name].[contenthash:8].chunk.js' : isEnvDevelopment && 'static/js/[name].chunk.js',
      // We inferred the "public path" (such as / or /my-project) from homepage.
      // We use "/" in development.
      publicPath: publicPath,
      // Point sourcemap entries to original disk location (format as URL on Windows)
      devtoolModuleFilenameTemplate: isEnvProduction
        ? (info) => path.relative(paths.appSrc, info.absoluteResourcePath).replace(/\\/g, '/')
        : isEnvDevelopment &&
          ((info) => path.resolve(info.absoluteResourcePath).replace(/\\/g, '/')),
      // Configure output asset filenames to include content hashes for caching purposes.
      // assetModuleFilename: 'static/media/[name].[hash][ext]',
      // Enable cleaning of the output directory on every build.
      clean: true,
      // Unique name for Webpack runtime and chunk data.
      uniqueName: `webpackJsonp${appPackageJson.name.replace(/@/g, '').replace(/\//g, '')}`,
    },
    cache: {
      type: 'filesystem',
      version: createEnvironmentHash(env.raw),
      cacheDirectory: paths.appWebpackCache,
      store: 'pack',
      buildDependencies: {
        defaultWebpack: ['webpack/lib/'],
        config: [fileURLToPath(import.meta.url)],
        tsconfig: [paths.appTsConfig, paths.appJsConfig].filter(f =>
          fs.existsSync(f)
        ),
      },
    },
    optimization: {
      minimize: isEnvProduction,
      minimizer: [
        // This is only used in production mode
        new TerserPlugin({
          terserOptions: {
            parse: {
              // We want terser to parse ecma 8 code. However, we don't want it
              // to apply any minification steps that turns valid ecma 5 code
              // into invalid ecma 5 code. This is why the 'compress' and 'output'
              // sections only apply transformations that are ecma 5 safe
              // https://github.com/facebook/create-react-app/pull/4234
              ecma: 8
            },
            compress: {
              ecma: 5,
              warnings: false,
              // Disabled because of an issue with Uglify breaking seemingly valid code:
              // https://github.com/facebook/create-react-app/issues/2376
              // Pending further investigation:
              // https://github.com/mishoo/UglifyJS2/issues/2011
              comparisons: false,
              // Disabled because of an issue with Terser breaking valid code:
              // https://github.com/facebook/create-react-app/issues/5250
              // Pending further investigation:
              // https://github.com/terser-js/terser/issues/120
              inline: 2
            },
            mangle: {
              safari10: true
            },
            output: {
              ecma: 5,
              comments: false,
              // Turned on because emoji and regex is not minified properly using default
              // https://github.com/facebook/create-react-app/issues/2488
              ascii_only: true
            },
            // sourceMap: shouldUseSourceMap
          },
          // Use multi-process parallel running to improve the build speed
          // Default number of concurrent runs: os.cpus().length - 1
          // Disabled on WSL (Windows Subsystem for Linux) due to an issue with Terser
          // https://github.com/webpack-contrib/terser-webpack-plugin/issues/21
          parallel: !isWsl,
          // Enable file caching
          // cache: true,
        }),
        // This is only used in production mode
        // OptimizeCSSAssetsPlugin removed: not compatible with webpack 5
      ],
      // Automatically split vendor and commons
      // https://twitter.com/wSokra/status/969633336732905474
      // https://medium.com/webpack/webpack-4-code-splitting-chunk-graph-and-the-splitchunks-optimization-be739a861366
      // splitChunks: {
      //   chunks: 'all',
      //   name: (module, chunks, cacheGroupKey) => {
      //     // Implement logic to generate a unique name for each chunk
      //     // For example, combine the cacheGroupKey and a unique identifier
      //     return `${cacheGroupKey}-${chunks.map(c => c.name).join('~')}`;
      //   },
      // },
      // Keep the runtime chunk separated to enable long term caching
      // https://twitter.com/wSokra/status/969679223278505985
      // runtimeChunk: true
    },
    resolve: {
      // This allows you to set a fallback for where Webpack should look for modules.
      // We placed these paths second because we want `node_modules` to "win"
      // if there are any conflicts. This matches Node resolution mechanism.
      // https://github.com/facebook/create-react-app/issues/253
      modules: ['node_modules', paths.appNodeModules].concat(modules.additionalModulePaths || []),
      // These are the reasonable defaults supported by the Node ecosystem.
      // We also include JSX as a common component filename extension to support
      // some tools, although we do not recommend using it, see:
      // https://github.com/facebook/create-react-app/issues/290
      // `web` extension prefixes have been added for better support
      // for React Native Web.
      extensions: paths.moduleFileExtensions
        .map((ext) => `.${ext}`)
        .filter((ext) => useTypeScript || !ext.includes('ts')),
      alias: {
        // Support React Native Web
        // https://www.smashingmagazine.com/2016/08/a-glimpse-into-the-future-with-react-native-for-web/
        'react-native': 'react-native-web',
        // Allows for better profiling with ReactDevTools
        ...(isEnvProductionProfile && {
          'react-dom$': 'react-dom/profiling',
          'scheduler/tracing': 'scheduler/tracing-profiling',
        }),
        ...(modules.webpackAliases || {}),
      },
      plugins: [
        // Adds support for installing with Plug'n'Play, leading to faster installs and adding
        // guards against forgotten dependencies and such.
        PnpWebpackPlugin,
        // Prevents users from importing files from outside of src/ (or node_modules/).
        // This often causes confusion because we only process files within src/ with babel.
        // To fix this, we prevent you from importing files out of src/ -- if you'd like to,
        // please link the files into your node_modules/ and let module-resolution kick in.
        // Make sure your source files are compiled, as they will not be processed in any way.
        new ModuleScopePlugin(paths.appSrc, [
          paths.appPackageJson

        ])
      ],
      // Some libraries import Node modules but don't use them in the browser.
      // Tell Webpack to provide empty mocks for them so importing them works.
      fallback: {
        // Provide empty mocks for Node modules
        "module": false,
        "dgram": false,
        "dns": "mock", // Use a mock module or false to simulate an empty module
        "fs": false,
        "http2": false,
        "net": false,
        "tls": false,
        "child_process": false,
        "url": require.resolve('url/'),
        "path": require.resolve('path-browserify')
      },
    },
    resolveLoader: {
      plugins: [
        // Also related to Plug'n'Play, but this time it tells Webpack to load its loaders
        // from the current package.
        PnpWebpackPlugin.moduleLoader(import.meta.url)
      ]
    },
    module: {
      strictExportPresence: true,
      rules: [
        // Goog
        {
          test: /\.(js|mjs|jsx|ts|tsx)$/,
          include: path.join(paths.appSrc, 'blockly'),
          loader: path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'goog-loader/index.cjs'), // Ensure this is a path to your custom loader
          enforce: 'pre'
        },
        shouldUseSourceMap && {
          enforce: 'pre',
          exclude: /@babel(?:\/|\\{1,2})runtime/,
          test: /\.(js|mjs|jsx|ts|tsx|css)$/,
          loader: 'source-map-loader',
        },
        {
          // "oneOf" will traverse all following loaders until one will
          // match the requirements. When no loader matches it will fall
          // back to the "file" loader at the end of the loader list.
          oneOf: [
            // "url" loader works like "file" loader except that it embeds assets
            // smaller than specified limit in bytes as data URLs to avoid requests.
            // A missing `test` is equivalent to a match.
            {
              test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
              type: 'asset',
              parser: {
                dataUrlCondition: {
                  maxSize: imageInlineSizeLimit // Define 'imageInlineSizeLimit' appropriately
                }
              }
            },
            {
              test: /\.svg$/,
              use: [
                {
                  loader: require.resolve('@svgr/webpack'),
                  options: {
                    prettier: false,
                    svgo: false,
                    svgoConfig: {
                      plugins: [{ removeViewBox: false }],
                    },
                    titleProp: true,
                    ref: true,
                  },
                },
                {
                  loader: require.resolve('file-loader'),
                  options: {
                    name: 'static/media/[name].[hash].[ext]',
                  },
                },
              ],
              issuer: {
                and: [/\.(ts|tsx|js|jsx|md|mdx)$/],
              },
            },
            // Process application JS with Babel.
            // The preset includes JSX, Flow, TypeScript, and some ESnext features.
            {
              test: /\.(js|cjs|mjs|jsx|ts|tsx)$/,
              include: paths.appSrc,
              use: {
                loader: 'babel-loader',
                options: {
                  babelrc: false,
                  configFile: false,
                  customize: require.resolve('babel-preset-react-app/webpack-overrides.js'),
                  presets: [
                    require.resolve('babel-preset-react-app/dependencies.js'),
                    '@babel/preset-react', '@babel/preset-env', '@babel/preset-typescript'
                  ],
                  plugins: [
                    // [
                    //   '@babel/plugin-transform-runtime', 
                    //   {
                    //     "corejs": 3,
                    //     "helpers": true,
                    //     "regenerator": true,
                    //     "useESModules": true
                    //   }
                    // ]
                  ],
                  cacheDirectory: true,
                  cacheCompression: false, // Disable compression for faster rebuilds
                  compact: isEnvProduction // Minify the output
                }
              }
            },
            // Process any JS outside of the app with Babel.
            // Unlike the application JS, we only compile the standard ES features.
            {
              test: /\.(js|mjs|cjs)$/,
              exclude: /@babel(?:\/|\\{1,2})runtime/,
              loader: 'babel-loader',
              options: {
                babelrc: false,
                configFile: false,
                compact: false,
                presets: [
                  [
                    require.resolve('babel-preset-react-app/dependencies.js'), 
                    { helpers: true }
                  ]
                ],
                cacheDirectory: true,
                cacheCompression: false,
                sourceMaps: false
              }
            },
            // "postcss" loader applies autoprefixer to our CSS.
            // "css" loader resolves paths in CSS and adds assets as dependencies.
            // "style" loader turns CSS into JS modules that inject <style> tags.
            // In production, we use MiniCSSExtractPlugin to extract that CSS
            // to a file, but in development "style" loader enables hot editing
            // of CSS.
            // By default we support CSS Modules with the extension .module.css
            {
              test: cssRegex,
              exclude: cssModuleRegex,
              use: getStyleLoaders({
                importLoaders: 1,
                sourceMap: isEnvProduction && shouldUseSourceMap,
                modules: {
                  mode: 'icss',
                },
              }),
              // Don't consider CSS imports dead code even if the
              // containing package claims to have no side effects.
              // Remove this when webpack adds a warning or an error for this.
              // See https://github.com/webpack/webpack/issues/6571
              sideEffects: true
            },
            // Adds support for CSS Modules (https://github.com/css-modules/css-modules)
            // using the extension .module.css
            {
              test: cssModuleRegex,
              use: getStyleLoaders({
                importLoaders: 1,
                sourceMap: isEnvProduction && shouldUseSourceMap,
                modules: {
                  mode: 'local',
                  getLocalIdent: getCSSModuleLocalIdent,
                  //localIdentName: '[name]__[local]___[hash:base64:5]',
                },
              }),
            },
            // Opt-in support for SASS (using .scss or .sass extensions).
            // By default we support SASS Modules with the
            // extensions .module.scss or .module.sass
            {
              test: sassRegex,
              exclude: sassModuleRegex,
              use: getStyleLoaders(
                {
                  importLoaders: 3,
                  sourceMap: isEnvProduction && shouldUseSourceMap,
                  modules: {
                    mode: 'icss',
                  },
                },
                'sass-loader'
              ),
              // Don't consider CSS imports dead code even if the
              // containing package claims to have no side effects.
              // Remove this when webpack adds a warning or an error for this.
              // See https://github.com/webpack/webpack/issues/6571
              sideEffects: true
            },
            // Adds support for CSS Modules, but using SASS
            // using the extension .module.scss or .module.sass
            {
              test: sassModuleRegex,
              use: getStyleLoaders(
                {
                  importLoaders: 3,
                  sourceMap: isEnvProduction && shouldUseSourceMap,
                  modules: {
                    mode: 'local',
                    getLocalIdent: getCSSModuleLocalIdent,
                    //localIdentName: '[name]__[local]___[hash:base64:5]',
                  },
                },
                'sass-loader'
              ),
            },
            {
              test: lessRegex,
              use: getStyleLoaders(
                {
                  importLoaders: 3,
                  sourceMap: isEnvProduction && shouldUseSourceMap,
                  modules: {
                    mode: 'local',
                    getLocalIdent: getCSSModuleLocalIdent,
                    // localIdentName: '[name]__[local]___[hash:base64:5]',
                  },
                },
                'less-loader'
              ),
            },
            // handle file asset types
            {
              test: /\.(png|svg|jpg|jpeg|gif)$/i,
              type: 'asset/resource',
            },
            {
              test: /\.(woff|woff2|eot|ttf|otf)$/i,
              type: 'asset/resource',
            },
            // "file" loader makes sure those assets get served by WebpackDevServer.
            // When you `import` an asset, you get its (virtual) filename.
            // In production, they would get copied to the `build` folder.
            // This loader doesn't use a "test" so it will catch all modules
            // that fall through the other loaders.
            {
              exclude: [/^$/, /\.(js|cjs|mjs|jsx|ts|tsx|html|json)$/], // Adjust according to assets you want to exclude
              // loader: 'file-loader',
              type: 'asset/resource',
              // generator: {
              //   filename: 'static/media/[name].[hash:8][ext]'
              // }
            }
            // ** STOP ** Are you adding a new loader?
            // Make sure to add the new loader(s) before the "file" loader.
          ]
        }
      ]
    },
    plugins: [
      new MonacoWebpackPlugin({
        languages: ['cpp'],
        features: ['!gotoSymbol']
      }),
      // Generates an `index.html` file with the <script> injected.
      new HtmlWebpackPlugin({
        inject: true,
        template: paths.appHtml,
        ...(isEnvProduction ? {
          showErrors: false,
          minify: {
            removeComments: true,
            collapseWhitespace: true,
            removeRedundantAttributes: true,
            useShortDoctype: true,
            removeEmptyAttributes: true,
            removeStyleLinkTypeAttributes: true,
            keepClosingSlash: true,
            minifyJS: true,
            minifyCSS: true,
            minifyURLs: true,
          },
        } : {
          showErrors: true,
          templateParameters: {
            PUBLIC_URL: publicUrl,
          },
        }),
      }),
      // Inlines the webpack runtime script. This script is too small to warrant
      // a network request.
      isEnvProduction &&
        shouldInlineRuntimeChunk &&
        new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/runtime~.+[.]js/]),
      // Makes some environment variables available in index.html.
      // The public URL is available as %PUBLIC_URL% in index.html, e.g.:
      // <link rel="shortcut icon" href="%PUBLIC_URL%/favicon.ico">
      // In production, it will be an empty string unless you specify "homepage"
      // in `package.json`, in which case it will be the pathname of that URL.
      // In development, this will be an empty string.
      new InterpolateHtmlPlugin(HtmlWebpackPlugin, env.raw),
      // This gives some necessary context to module not found errors, such as
      // the requesting resource.
      new ModuleNotFoundPlugin(paths.appPath),
      // Makes some environment variables available to the JS code, for example:
      // if (process.env.NODE_ENV === 'production') { ... }. See `./env.js`.
      // It is absolutely essential that NODE_ENV is set to production
      // during a production build.
      // Otherwise React will be compiled in the very slow development mode.
      new webpack.DefinePlugin(env.stringified),
      // This is necessary to emit hot updates (currently CSS only):
      isEnvDevelopment && new webpack.HotModuleReplacementPlugin(),
      // Watcher doesn't work well if you mistype casing in a path so we use
      // a plugin that prints an error when you attempt to do this.
      // See https://github.com/facebook/create-react-app/issues/240
      isEnvDevelopment && new CaseSensitivePathsPlugin(),
      isEnvProduction &&
        new MiniCssExtractPlugin({
          // Options similar to the same options in webpackOptions.output
          // both options are optional
          filename: 'static/css/[name].[contenthash:8].css',
          chunkFilename: 'static/css/[name].[contenthash:8].chunk.css'
        }),
      // Generate a manifest file which contains a mapping of all asset filenames
      // to their corresponding output file so that tools can pick it up without
      // having to parse `index.html`.
      new WebpackManifestPlugin({
        fileName: 'asset-manifest.json',
        publicPath: publicPath,
        generate: (seed, files, entrypoints) => {
          const manifestFiles = files.reduce((manifest, file) => {
            manifest[file.name] = file.path;
            return manifest;
          }, seed);
          const entrypointFiles = entrypoints.main.filter(
            fileName => !fileName.endsWith('.map')
          );
          return { files: manifestFiles, entrypoints: entrypointFiles };
        },
      }),
      // Moment.js is an extremely popular library that bundles large locale files
      // by default due to how Webpack interprets its code. This is a practical
      // solution that requires the user to opt into importing specific locales.
      // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
      // You can remove this if you don't use Moment.js:
      new webpack.IgnorePlugin({
        resourceRegExp: /(^\.\/locale|moment)$/
      }),
      // Generate a service worker script that will precache, and keep up to date,
      // the HTML & assets that are part of the Webpack build.
      isEnvProduction && 
      // new WorkboxWebpackPlugin.InjectManifest({
      //   swSrc: paths.appSrc + '/serviceWorker.ts',
      //   dontCacheBustURLsMatching: /\.[0-9a-f]{8}\./,
      //   exclude: [/\.map$/, /asset-manifest\.json$/, /LICENSE/],
      //   // Bump up the default maximum size (2mb) that's precached,
      //   // to make lazy-loading failure scenarios less likely.
      //   // See https://github.com/cra-template/pwa/issues/13#issuecomment-722667270
      //   maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        new WorkboxWebpackPlugin.GenerateSW({
          clientsClaim: true,
          exclude: [/\.map$/, /asset-manifest\.json$/],//, /^manifest.*\.js(?:on)?$/],
          // The 'importWorkboxFrom' option is removed because Workbox v6+ automatically
          // handles the Workbox library importation.
          navigateFallback: publicUrl ,//+ '/index.html',
          navigateFallbackDenylist: [
            new RegExp('^/_'),
            new RegExp('/[^/?]+\\.[^/]+$'),
          ],
          // If you need to use Workbox from a CDN or to customize the Workbox library version,
          // you should manually import it in your service worker file or use 'importScripts'
          // in the service worker template instead of specifying it in GenerateSW options.
      }),
      // TypeScript type checking
      useTypeScript &&
      new ForkTsCheckerWebpackPlugin({
        typescript: {
          typescriptPath: resolve.sync('typescript', { basedir: paths.appNodeModules }),
          configOverwrite: {
            compilerOptions: {
              sourceMap: isEnvProduction
                ? shouldUseSourceMap
                : isEnvDevelopment,
              skipLibCheck: true,
              inlineSourceMap: false,
              declarationMap: false,
              noEmit: true,
              incremental: true,
            },
          },
          context: paths.appPath, // Ensure this points to your project's root directory
          diagnosticOptions: {
            syntactic: true,
            // semantic: true,
          },
          configFile: paths.appTsConfig,
          mode: 'write-references',
        },
        async: isEnvDevelopment,
        issue: {
          include: [
            // {file: '**'},
            {file: '../**/src/**/*.{ts,tsx,mjs}'},
            { file: '**/src/**/*.{ts,tsx,mjs}' },
          ],
          exclude: [
            {file: '**/__tests__/**'},
            {file: '**/?(*.)(spec|test).*'},
            {file: '**/src/setupProxy.*'},
            {file: '**/src/setupTests.*'},
          ]
        },
        logger: {
          infrastructure: 'silent'
        }
        // formatter: isEnvProduction ? undefined : 'codeframe', // 'codeframe' is a common choice for development
      }),
      new ESLintPlugin({
        extensions: ['js', 'cjs', 'mjs', 'jsx', 'ts', 'tsx'],
        overrideConfigFile: path.resolve(process.cwd(), '.eslintrc.js'),
        fix: true,
        emitWarning: isEnvDevelopment,
        emitError: true,
        exclude: ['node_modules', 'build', 'scripts', 'public', 'src/setupProxy.js', 'src/setupTests.js', 'src/blockly'],
      }),
    ].filter(Boolean),
    // Turn off performance processing because we utilize
    // our own hints via the FileSizeReporter
    performance: false
  };
};
