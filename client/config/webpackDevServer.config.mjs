'use strict';

import errorOverlayMiddleware from 'react-dev-utils/errorOverlayMiddleware.js';
import evalSourceMapMiddleware from 'react-dev-utils/evalSourceMapMiddleware.js';
import noopServiceWorkerMiddleware from 'react-dev-utils/noopServiceWorkerMiddleware.js';
import ignoredFiles from 'react-dev-utils/ignoredFiles.js';
const paths = await import('./paths.cjs').then(module => module.default);;
import * as fs from 'fs';

const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
const host = process.env.HOST || '0.0.0.0';

export default function(proxy, allowedHost) {
  return {
    static: {
      directory: paths.appPublic,
      watch: true,
    },
    client: {
      logging: 'none',
      overlay: false,
    },
    historyApiFallback: {
      disableDotRule: true,
    },
    compress: true,
    allowedHosts: 'all',
    host: host,
    server: protocol === 'https' ? {
      type: 'https',
      options: {
        key: readFileSync('<path-to-key>'), // Update these paths to your SSL key/cert files
        cert: readFileSync('<path-to-cert>'),
      },
    } : 'http',
    devMiddleware: {
      publicPath: '/', // The base path for all assets. Adjust this as necessary.
    },
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }
  
      // Dynamically import proxySetup if it exists
      try {
        fs.accessSync(paths.proxySetup);
        const proxySetup = import(new URL(paths.proxySetup, import.meta.url));
        if (proxySetup.default) {
          proxySetup.default(devServer.app);
        }
      } catch {
        // No proxy setup file
      }
  
      // Middleware to fetch source contents from webpack for the error overlay
      middlewares.push({
        name: 'evalSourceMapMiddleware',
        path: '/*', // or specify the path you want to apply middleware to
        middleware: evalSourceMapMiddleware(devServer.server)
      });
  
      // Middleware to open files from the runtime error overlay
      middlewares.push({
        name: 'errorOverlayMiddleware',
        path: '/*', // or specify the path you want to apply middleware to
        middleware: errorOverlayMiddleware()
      });
  
      // Middleware for a 'no-op' service worker in development
      middlewares.push({
        name: 'noopServiceWorkerMiddleware',
        path: '/serviceWorker.js', // Adjust if your service worker path differs
        middleware: noopServiceWorkerMiddleware()
      });
  
      return middlewares;
    },
  };
};
