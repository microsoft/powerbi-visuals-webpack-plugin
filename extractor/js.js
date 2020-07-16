const fs = require("fs-extra");
const RawSource = require("webpack-sources/lib/RawSource");

const { ENCODING } = require("../constants");
const logger = require("../logger");

const appendExternalJS = async function (externalJS) {
	return Promise.all(
		externalJS.map((path) =>
			fs.readFile(path, ENCODING).catch((err) => {
				logger.warn(err.message);
			})
		)
	).then((results) => results.join(""));
};

module.exports = async function (options, compilation) {
	let path, chunkContent;
	const sourcePromises = [];

	for (let asset in compilation.assets) {
		const extension = asset.split(".").pop();
		if (extension === "js") {
			path = asset;
			chunkContent = compilation.assets[asset].source();
			break;
		}
	}

	if (options.externalJS && options.externalJS.length) {
		sourcePromises.push(appendExternalJS(options.externalJS));
		sourcePromises.push(Promise.resolve("var globalPowerbi = powerbi;"));
	}
	sourcePromises.push(Promise.resolve(chunkContent));

	return Promise.all(sourcePromises).then((chunks) => {
		const content = chunks.join("\n");
		compilation.assets[path] = new RawSource(content);
		return content;
	});
};
