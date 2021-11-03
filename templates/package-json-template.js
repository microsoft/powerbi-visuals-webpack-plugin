module.exports = function (templateOptions) {
	return `{
    "version": ${JSON.stringify(templateOptions.visualData.version)},
    "author": ${JSON.stringify(templateOptions.authorData)},
    "build environment": {
        "tools version": ${JSON.stringify(
			templateOptions.environment.toolsVersion
		)},
        "operating system": ${JSON.stringify(
			templateOptions.environment.operatingSystem
		)},
        "node version": ${JSON.stringify(
			templateOptions.environment.nodeVersion
		)}
    },
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
