module.exports = {
	populateErrors: (errors, fileName, type) => {
		if (!errors || errors.length) return;

		return errors.map((e) => ({
			filename: fileName,
			message: e.stack || "Unknown error",
			type: type,
		}));
	},
};
