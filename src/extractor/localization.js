const path = require("path");
const fs = require("fs-extra");
const { ENCODING } = require("../constants");

const parseFromProperty = async function (options) {
	if (!options.stringResources || !options.stringResources.length) return;
	return Promise.all(
		options.stringResources.map((resourcePath) => {
			return fs
				.readJSON(path.join(process.cwd(), resourcePath), {
					throws: false,
					encoding: ENCODING,
				})
				.catch((err) => {
					console.error(err);
					return;
				});
		})
	);
};

const parseFromFolder = async function (options) {
	const resourcesDir = path.join(process.cwd(), "stringResources");

	return fs.readdir(resourcesDir).then(
		(folders) =>
			Promise.all(
				folders.map((folder) => {
					return fs
						.readJson(
							path.join(
								resourcesDir,
								folder,
								"resources.resjson"
							),
							{
								throws: false,
								encoding: ENCODING,
							}
						)
						.then((resource) => ({
							locale: folder,
							values: resource,
						}))
						.catch((err) => {
							console.error(err);
							return;
						});
				})
			),
		() => {}
	);
};

module.exports = async function (options) {
	return Promise.all([
		parseFromProperty(options),
		parseFromFolder(options),
	]).then(([source1 = [], source2 = []]) => {
		const stringResources = Object.create(null);
		source1.forEach((res) => {
			if (!res) return;
			stringResources[res.locale] = res.values;
		});
		source2.forEach((res) => {
			if (!res) return;

			if (stringResources[res.locale]) {
				// resjson string rewrites exist keys
				for (let key in res.values) {
					stringResources[res.locale][key] = res.values[key];
				}
			} else {
				stringResources[res.locale] = res.values;
			}
		});
		return stringResources;
	});
};
