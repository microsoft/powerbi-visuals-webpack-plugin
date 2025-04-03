const fs = require('fs');
const { ENCODING } = require('./constants');
const { file } = require('jszip');

const safelyImport = async (filePath) => {
	try {
		const config = (await import(`file://${filePath}`)).default;
		return config;
	} catch (e) {
		console.error(`Error importing JS config from ${filePath}`, e);
		return null;
	}
};

const safelyParse = (filePath) => {
	try {
		return JSON.parse(fs.readFileSync(filePath, ENCODING));
	}
	catch (e) {
		console.error(`Error parsing JSON config from ${filePath}`, e);
		return null;
	}
};

const safelyReadConfig = async (filePath) => {
	return filePath.endsWith('js') ?
		(await safelyImport(filePath)) :
		safelyParse(filePath);
};

const populateErrors = (errors, fileName, type) => {
	if (!errors || errors.length) return;

	return errors.map((e) => ({
		filename: fileName,
		message: e.stack || "Unknown error",
		type: type,
	}));
};

module.exports = {
	safelyImport,
	safelyParse,
	safelyReadConfig,
	populateErrors
};
