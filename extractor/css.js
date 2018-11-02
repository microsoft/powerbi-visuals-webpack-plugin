const path = require('path');
const fs = require('fs-extra');
const RawSource = require('webpack-sources/lib/RawSource');

const {
    ENCODING
} = require('../constants');

module.exports = async function (options, { assets }) {
    let chunkContent, result;

    for (let asset in assets) {
        const extension = asset.split('.').pop();
        if (extension === 'css') {
            chunkContent = assets[asset].source();
            break;
        }
    }

    if (!chunkContent) {
        if (options.cssStyles) {
            result = fs.readFile(options.cssStyles, {
                encoding: ENCODING
            });
        } else {
            result = Promise.resolve(() => {
                compilation.assets["visual.css"] = new RawSource('');
            });
        }
    }
    return result || Promise.resolve(chunkContent);
};