const Ajv = require("ajv");
const path = require("path");
const logger = require("../logger");
const utils = require("../utils");

const getSchema = async function (options) {
	if (options.dependenciesSchema)
		return Promise.resolve(options.dependenciesSchema);

	return utils.safelyReadConfig(
		path.join(options.schemaLocation, "schema.dependencies.json")
	);
};

module.exports = async function (options) {
	if (!options.dependencies) return Promise.resolve(null);

	let getContent;
	switch (typeof options.dependencies) {
		case "string": {
			getContent = utils.safelyReadConfig(path.join(process.cwd(), options.dependencies))
				.catch((err) => {
					if (err.code === "ENOENT") {
						logger.warn(
							`No such file or directory: ${path.join(
								process.cwd(),
								options.dependencies
							)}`
						);
					}
					return null;
				});
			break;
		}
		case "object": {
			getContent = Promise.resolve(options.dependencies);
			break;
		}
		default:
			return Promise.resolve(null);
	}

	return Promise.all([getSchema(options), getContent]).then(
		([schema, json]) => {
			const ajv = new Ajv({ extendRefs: true });
			const valid = ajv.validate(schema, json);
			if (valid) return json;
			ajv.errors.forEach((error) =>
				logger.error(error.message, error.dataPath)
			);

			throw new Error("Invalid dependencies");
		}
	);
};
