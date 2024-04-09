#!/usr/bin/env bash

cd client
yarn build || exit 1
cd ..
yarn build || exit 1
yarn dist
