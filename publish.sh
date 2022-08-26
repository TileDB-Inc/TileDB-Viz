#!/usr/bin/env bash

export PACKAGE_FOLDER=$1
echo publishing $GIT_TAG_VERSION
cd packages/$PACKAGE_FOLDER
if [[ $GIT_TAG_VERSION == *"beta"* ]];
then
echo "Publishing beta version $GIT_TAG_VERSION";
yarn npm publish --access public --tag beta
elif [[ $GIT_TAG_VERSION == *"alpha"* ]];
then
echo "Publishing alpha version $GIT_TAG_VERSION";
yarn npm publish --access public --tag alpha
else
echo "Publishing new version $GIT_TAG_VERSION";
yarn npm publish --access public
fi