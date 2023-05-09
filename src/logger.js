const os = require("os");
let chalk = require("chalk");

if (os.platform() === "darwin") {
	chalk = chalk.bold;
}

const _prependLogTag = (tag, args) => {
	return [tag].concat(args);
};

module.exports = {
	error: (...args) => {
		const tag = chalk.bgRed(" error ");
		console.error.apply(null, _prependLogTag(tag, args));
	},

	warn: (...args) => {
		const tag = chalk.bgYellow.black(" warn  ");
		console.warn.apply(null, _prependLogTag(tag, args));
	},

	info: (...args) => {
		const tag = chalk.bgCyan(" info  ");
		console.info.apply(null, _prependLogTag(tag, args));
	},
};
