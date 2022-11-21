const fs = require("fs-extra");

const { ENCODING } = require("../constants");

module.exports = async function (options, { assets }) {
	let chunkContent, result;

	for (let asset in assets) {
		const extension = asset.split(".").pop();
		if (extension === "css") {
			chunkContent = assets[asset].source();
			break;
		}
	}

	if (!chunkContent) {
		if (options.cssStyles) {
			result = fs.readFile(options.cssStyles, {
				encoding: ENCODING,
			});
		} else {
			result = Promise.resolve("");
		}
	}
	return result || Promise.resolve(chunkContent);
};
