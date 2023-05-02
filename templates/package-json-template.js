module.exports = function (templateOptions) {
	return `{
		"version": ${JSON.stringify(templateOptions.visualData.version)},
		"author": ${JSON.stringify(templateOptions.authorData)},
		"resources": [
			{
				"resourceId": "rId0",
				"sourceType": 5,
				"file": "resources/${templateOptions.guid}.pbiviz.json"
			}
		],
		"visual": ${JSON.stringify(templateOptions.visualData)},
		"metadata": {
			"pbivizjson": {
				"resourceId": "rId0"
			}
		}
	}`;
};
