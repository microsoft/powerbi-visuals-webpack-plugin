const Ajv = require('ajv');
const path = require('path');
const fs = require('fs-extra');

const getSchema = async function (options) {
    if (options.dependenciesSchema) return Promise.resolve(options.dependenciesSchema);

    return fs.readJson((path.join(options.schemaLocation, 'schema.dependencies.json')));
};

module.exports = async function (options) {
    if (!options.dependencies) return Promise.resolve(null);

    let getContent;
    switch (typeof options.dependencies) {
        case 'string':
            {
                getContent = fs.readJson(path.join(process.cwd(), options.dependencies));
                break;
            }
        case 'object':
            {
                getContent = Promise.resolve(options.dependencies);
                break;
            }
        default:
            return Promise.resolve(null);
    }

    return Promise.all(
        [
            getSchema(options),
            getContent
        ]
    ).then(([schema, json]) => {
        if (!json) return null;
        const ajv = new Ajv();
        const valid = ajv.compile(schema)(json);
        if (valid) return json;

        throw 'Invalid dependencies';
    });
};