const { compareVersions } = require("../utils.js");
const comparedAPI = "3.8.0";

module.exports = function (pluginOptions) {
	let generateStrByAPI = (str) => {
		if (compareVersions(pluginOptions.apiVersion, comparedAPI)) {
			return str;
		} else {
			return ``;
		}
	};

	return `import { ${pluginOptions.visualClass} } from "${
		pluginOptions.visualSourceLocation
	}";
import powerbiVisualsApi from "powerbi-visuals-api";
import IVisualPlugin = powerbiVisualsApi.visuals.plugins.IVisualPlugin;
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;
${generateStrByAPI(
	`import DialogConstructorOptions = powerbiVisualsApi.extensibility.visual.DialogConstructorOptions;`
)}
var powerbiKey: any = "powerbi";
var powerbi: any = window[powerbiKey];
var ${pluginOptions.pluginName}: IVisualPlugin = {
    name: '${pluginOptions.pluginName}',
    displayName: '${pluginOptions.visualDisplayName}',
    class: '${pluginOptions.visualClass}',
    apiVersion: '${pluginOptions.apiVersion}',
    create: (options: VisualConstructorOptions) => {
        if (${pluginOptions.visualClass}) {
            return new ${pluginOptions.visualClass}(options);
        }
        throw 'Visual instance not found';
    },
    ${generateStrByAPI(`createModalDialog: (dialogId: string, options: DialogConstructorOptions, initialState: object) => {
        const dialogRegistry = globalThis.dialogRegistry;
        if (dialogId in dialogRegistry) {
            new dialogRegistry[dialogId](options, initialState);
        }
    },`)}
    custom: true
};
if (typeof powerbi !== "undefined") {
    powerbi.visuals = powerbi.visuals || {};
    powerbi.visuals.plugins = powerbi.visuals.plugins || {};
    powerbi.visuals.plugins["${pluginOptions.pluginName}"] = ${
		pluginOptions.pluginName
	};
}
export default ${pluginOptions.pluginName};`;
};
