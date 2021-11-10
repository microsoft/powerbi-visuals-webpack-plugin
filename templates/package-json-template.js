module.exports = function (templateOptions) {
	let res = {
		version: templateOptions.visualData.version,
		author: templateOptions.authorData,
		buildEnvironment: templateOptions.environment
			? {
					toolsVersion: `${templateOptions.environment.toolsVersion}`,
					nodeVersion: `${templateOptions.environment.nodeVersion}`,
					os: {
						platform: `${templateOptions.environment.osPlatform}`,
						version: `${templateOptions.environment.osVersion}`,
						release: `${templateOptions.environment.osReleaseVersion}`,
					},
			  }
			: `undefined`,
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
