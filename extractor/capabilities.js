const Ajv = require("ajv");
const path = require("path");
const fs = require("fs-extra");

const getSchema = async function(options) {
	if (options.capabilitiesSchema)
		return Promise.resolve(options.capabilitiesSchema);

	return fs.readJson(
		path.join(options.schemaLocation, "schema.capabilities.json")
	);
};

module.exports = async function(options) {
	let getContent;
	switch (typeof options.capabilities) {
		case "string": {
			getContent = fs.readJson(path.join(process.cwd(), options.capabilities));
			break;
		}
		case "object": {
			getContent = Promise.resolve(options.capabilities);
			break;
		}
		default:
			throw Error("Not found visual capabilities");
	}

	return Promise.all([getSchema(options), getContent]).then(
		([schema, json]) => {
			const ajv = new Ajv();
			const valid = ajv.compile(schema)(json);
			if (valid) return json;
			throw "Invalid capabilities";
		}
	);
};
