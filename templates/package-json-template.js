module.exports = function (templateOptions) {
	let res = {
		version: templateOptions.visualData.version,
		author: templateOptions.authorData,
		"build environment": templateOptions.environment
			? {
					"tools version": `${templateOptions.environment.toolsVersion}`,
					"node version": `${templateOptions.environment.nodeVersion}`,
					"operating system": {
						platform: `${templateOptions.environment.operatingSystem}`,
						version: `${templateOptions.environment.osVersion}`,
						release: `${templateOptions.environment.osReleaseVersion}`,
					},
			  }
			: "is not defined",
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
