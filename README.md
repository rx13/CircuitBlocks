# CircuitBlocks Redux

<img src="https://old.circuitmess.com/wp-content/uploads/CB-Cover-e1572298172355.png">

CircuitBlocks Redux is a modernized, self-hosted graphical programming interface for embedded devices. This project is a maintained fork of the original [CircuitBlocks (archived)](https://github.com/CircuitMess/CircuitBlocks), updated for maintainability and ongoing development by Holophage Limited.

Downloads and executables can be found [here](https://github.com/rx13/CircuitBlocks/releases/).

When first started, the app will try to identify an already existing Arduino installation. If one isn't found it will download and install the Arduino IDE along with all the required drivers and libraries required for the Holophage Limited Ringo board.

________________________________________________________________________________________________________________________________________

**NOTE: You can skip these steps if you just want to use CircuitBlocks Redux. See the latest releases and documentation at [https://github.com/rx13/CircuitBlocks](https://github.com/rx13/CircuitBlocks).**

## Running a dev environtment

To build the electron native modules, you will need some build tools. More info at the [nodejs/node-gyp](https://github.com/nodejs/node-gyp#installation) github repo.

Clone the repository, install all core and client dependencies, build electron native modules:

```shell script
git clone https://github.com/rx13/CircuitBlocks.git
cd CircuitBlocks/client
yarn
cd ..
yarn
yarn electron-rebuild
```

And then run with ```yarn dev``` in the root directory of the repository.

The frontend server and electron backend can also be started separately. To start the server run ```yarn dev``` in the client directory, and to start the electron backend, run ```yarn electron-start``` in the root directory of the repository.

## Building

The app is packaged using electron-builder. To package it, you first need to build the frontend and electron backend with ```yarn build```. Then you can package it with ```yarn dist```:

```shell script
cd client
yarn build
cd ..
yarn build
yarn dist
```

This will produce the binaries for your platform in the dist directory.

## Issues

### ```yarn electron-rebuild``` fails

If ```electron-rebuild``` fails, you can try compiling using an older compiler version or another compiler altogether. Specifying which gcc and g++ binaries yarn should use to compile native dependencies can be done by setting the **CC** and **CXX** env variables, or by modifying the ```rebuild-electron``` script in package.json like this:

```json
"scripts": {
  "rebuild-electron": "CC=/usr/bin/gcc-7 CXX=/usr/bin/g++-7 yarn electron-rebuild",
  ...
}
```
And then using ```yarn rebuild-electron``` instead of ```electron-rebuild```.

## Meta

**Maintained by [rx13 / Holophage Limited](https://github.com/rx13/CircuitBlocks)**

CircuitBlocks Redux is a modernized, self-hosted fork of [CircuitBlocks (archived)](https://github.com/CircuitMess/CircuitBlocks). All original attributions and licensing are preserved. See the "History" section above for more details.

Copyright © 2021 CircuitMess  
Copyright © 2025 Holophage Limited

Licensed under the MIT license (See LICENSE.md)
