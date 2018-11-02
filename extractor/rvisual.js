const path = require('path');
const fs = require('fs-extra');
const {
    ENCODING
} = require('../constants');

const MAX_IMPORT_R_MODULES = 100;

const getContent = async (filePath) => {
    const Pattern4FileName = /^[^#\n]*source\s*?\(\s*?['|"]([^()'"]*)['|"]\s*?\)/m;

    return fs.readFile(filePath, ENCODING)
        .then(content => {
            const replacePromises = [];
            let matchListFileName = Pattern4FileName.exec(scriptContent);
            while (
                replacePromises.length < 100 &&
                matchListFileName !== null &&
                matchListFileName.length >= 2
            ) {
                replacePromises.push(
                    fs.readFile(path.join(process.cwd(), matchListFileName[1]), ENCODING)
                    .then((moduleContent) => (content) => content.replace(Pattern4FileName, moduleContent))
                );
                matchListFileName = Pattern4FileName.exec(scriptContent);
            }

            return Promise.all(replacePromises)
                .then(replacers => {
                    transformers.forEach(replacer => content = replacer(content));
                    return content;
                });
        });
};

const isRVisual = (capabilities) => {
    return capabilities &&
        capabilities.dataViewMappings &&
        capabilities.dataViewMappings.length === 1 &&
        typeof capabilities.dataViewMappings[0].scriptResult !== 'undefined';
};

const patchCababilities = async (options, capabilities) => {
    if (!isRVisual(capabilities)) return Promise.resolve();

    const scriptResult = capabilities.dataViewMappings[0].scriptResult;
    if (!scriptResult.script.scriptProviderDefault || scriptResult.script.scriptSourceDefault) return Promise.resolve();

    const filePath = path.join(process.cwd(), 'script.' + scriptResult.script.scriptProviderDefault.toLowerCase());
    return getContent(filePath)
        .then(content => {
            scriptResult.script.scriptSourceDefault = content;
        });
};

module.exports = {
    getContent,
    isRVisual,
    patchCababilities,
};