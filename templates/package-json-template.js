module.exports = function (templateOptions) {
	let res = {
		version: templateOptions.visualData.version,
		author: templateOptions.authorData,
		"build environment": {
			"tools version": templateOptions.environment.toolsVersion,
			"operating system": `${templateOptions.environment.operatingSystem} - ${templateOptions.environment.osReleaseVersion}`,
			"node version": templateOptions.environment.nodeVersion,
		},
		resources: [
			{
				resourceId: "rId0",
				sourceType: 5,
				file: `resources/${templateOptions.guid}.pbiviz.json`,
			},
		],
		visual: templateOptions.visualData,
		metadata: {
			pbivizjson: {
				resourceId: "rId0",
			},
		},
	};

	return JSON.stringify(res, null, 4);
};
