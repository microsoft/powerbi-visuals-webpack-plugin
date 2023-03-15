const path = require("path");
const fs = require("fs-extra");
const { ENCODING } = require("../constants");

const MAX_IMPORT_MODULES = 100;

const getContent = async (filePath) => {
	const Pattern4FileName =
		/^[^#\n]*source\s*?\(\s*?['|"]([^()'"]*)['|"]\s*?\)/m;

	return fs.readFile(filePath, ENCODING).then(async (content) => {
		let replaceCount = 0;
		let matchListFileName = Pattern4FileName.exec(content);
		while (
			replaceCount < MAX_IMPORT_MODULES &&
			matchListFileName !== null &&
			matchListFileName.length >= 2
		) {
			const moduleContent = await fs.readFile(
				path.join(process.cwd(), matchListFileName[1]),
				ENCODING
			);
			content = content.replace(Pattern4FileName, moduleContent);
			replaceCount++;
			matchListFileName = Pattern4FileName.exec(content);
		}

		return content;
	});
};

const isScriptVisual = (capabilities) => {
	return (
		capabilities &&
		capabilities.dataViewMappings &&
		capabilities.dataViewMappings.length === 1 &&
		typeof capabilities.dataViewMappings[0].scriptResult !== "undefined"
	);
};

const getFileExtension = (providerName) => {
	providerName = providerName.toLowerCase();
	switch (providerName) {
		case "r":
			return "r";
		case "python":
			return "py";
		default:
			return providerName;
	}
};

const patchCababilities = async (options, capabilities) => {
	if (!isScriptVisual(capabilities)) return Promise.resolve(capabilities);

	const scriptResult = capabilities.dataViewMappings[0].scriptResult;
	if (
		!scriptResult.script.scriptProviderDefault ||
		scriptResult.script.scriptSourceDefault
	)
		return Promise.resolve();

	const filePath = path.join(
		process.cwd(),
		"script." + getFileExtension(scriptResult.script.scriptProviderDefault)
	);
	const content = await getContent(filePath);
	scriptResult.script.scriptSourceDefault = content;
	return capabilities;
};

module.exports = {
	getContent,
	isScriptVisual,
	patchCababilities,
};
