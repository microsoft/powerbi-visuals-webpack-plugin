"use strict";
const path = require("path");
const fs = require("fs-extra");
const cloneDeepFunc = require("lodash.clonedeep");
const JSZip = require("jszip");
const RawSource = require("webpack-sources/lib/RawSource");

const { ENCODING } = require("./constants");
const logger = require("./logger");
const getDependencies = require("./extractor/dependencies");
const getCapabilities = require("./extractor/capabilities");
const scriptVisual = require("./extractor/scriptVisual");
const getJsContent = require("./extractor/js");
const getCssContent = require("./extractor/css");
const getLocalization = require("./extractor/localization");
const pluginTemplate = require("./templates/plugin-template");
const jsonTemplate = require("./templates/package-json-template");

const DEBUG = "_DEBUG";

const base64Img = (filepath) => {
	let imageAsBase64 = fs.readFileSync(filepath, "base64"),
		defaultExt = "png",
		extName = path.extname(filepath).substr(1) || defaultExt;

	const extToMIME = {
		svg: "svg+xml",
		ico: "image/vnd.microsoft.icon",
		jpg: "jpeg",
		wbmp: "vnd.wap.wbmp",
	};

	let MIME = `image/${extToMIME[extName] || extName}`,
		prefix = `data:${MIME};base64,`,
		base64string = `${prefix}${imageAsBase64}`;

	return base64string;
};

class PowerBICustomVisualsWebpackPlugin {
	constructor(options) {
		const name = "SampleVisual";
		const apiVersion = "1.10.0";
		const defaultOptions = {
			visual: {
				name: name,
				displayName: name,
				guid: `${name}_${new Date().getTime()}_${Math.random()
					.toString()
					.substr(2)}`,
				visualClassName: "Visual",
				version: "1.0.0.0",
				description: "",
				supportUrl: "",
				gitHubUrl: "",
			},
			author: "",
			apiVersion: apiVersion,
			stringResourcesPath: {
				"en-US": {},
			},
			capabilities: {},
			iconImage: !options.assets.icon
				? base64Img(path.join(__dirname, "templates", "icon.png"))
				: base64Img(path.join(process.cwd(), options.assets.icon)),
			devMode: true,
			packageOutPath: path.join(process.cwd(), "dist"),
			cssStyles: null,
			generateResources: true,
			generatePbiviz: true,
			generatePlugin: true,
			minifyJS: true,
			schemaLocation: path.join(process.cwd(), ".api", "v" + apiVersion),
			capabilitiesSchema: null,
			pbivizSchema: null,
			stringResourcesSchema: null,
			dependenciesSchema: null,
			modules: true,
			visualSourceLocation: "",
			pluginLocation: path.join(".tmp", "precompile", "visualPlugin.ts"),
			compression: 0, // no compression,
			toolsVersion: null,
		};

		this._name = "PowerBICustomVisualsWebpackPlugin";
		this.options = Object.assign(defaultOptions, options);
		this.options.pluginLocation = path.normalize(
			this.options.pluginLocation
		);
		this.options.schemaLocation = path.join(
			process.cwd(),
			".api",
			"v" + this.options.apiVersion
		);
	}

	apply(compiler) {
		compiler.hooks.emit.tapAsync(this._name, (compilation, callback) => {
			logger.info("Start packaging...");
			this._emit(compilation)
				.then(() => {
					logger.info("Finish packaging");
					callback();
				})
				.catch((ex) => {
					[].concat(ex).map((ex) => logger.error(ex.message));
				});
		});

		compiler.hooks.beforeRun.tapAsync(
			this._name,
			(compilationParams, callback) => {
				this._beforeCompile(callback);
			}
		);

		compiler.hooks.watchRun.tapAsync(
			this._name,
			(compilation, callback) => {
				this._beforeCompile(callback);
			}
		);
	}

	async _emit(compilation) {
		const options = this.options;

		const config = await Promise.all([
			getLocalization(options),
			getDependencies(options),
			getCapabilities(options).then((capabilities) =>
				scriptVisual.patchCababilities(options, capabilities)
			),
			getJsContent(options, compilation),
			getCssContent(options, compilation),
		])
			.then(
				([
					stringResources,
					dependencies,
					capabilities,
					jsContent,
					cssContent,
				]) =>
					this.getVisualConfig(
						stringResources,
						capabilities,
						dependencies,
						jsContent,
						cssContent
					)
			)
			.catch((err) => {
				throw err;
			});

		if (!config.dependencies) delete config.dependencies; //delete parameter with null value
		config.visual.guid = `${this.options.visual.guid}${
			options.devMode ? DEBUG : ""
		}`;
		compilation.assets["pbiviz.json"] = new RawSource(
			JSON.stringify(config)
		);

		// update status file for debug server
		this.addStatusFile(compilation);

		if (!this.options.devMode) {
			await this.generateResources(config);
		}
	}

	async _beforeCompile(callback) {
		if (!this.options.modules) callback();
		if (this.options.generatePlugin) {
			logger.info("Start preparing plugin template");
			await this.generateVisualPlugin()
				.then(() => {
					logger.info("Finish preparing plugin template");
					callback();
				})
				.catch((ex) => {
					const errors = [].concat(ex);
					errors.forEach((ex) => logger.error(ex.message));
					throw new Error("Failed to generate visualPlugin.ts");
				});
		}
	}

	async generateVisualPlugin() {
		const pluginOptions = {
			pluginName: `${this.options.visual.guid}${
				this.options.devMode ? DEBUG : ""
			}`,
			visualGuid: this.options.visual.guid,
			visualClass: this.options.visual.visualClassName,
			visualDisplayName: this.options.visual.displayName,
			visualVersion: this.options.visual.version,
			apiVersion: this.options.apiVersion,
			visualSourceLocation: this.options.visualSourceLocation,
		};
		const pluginTs = pluginTemplate(pluginOptions);
		let pluginFolderPath = this.options.pluginLocation.split(path.sep);
		pluginFolderPath.pop();
		let pluginFolder = path.join(
			process.cwd(),
			pluginFolderPath.join(path.sep)
		);
		await fs.ensureDir(pluginFolder);
		// write file if only changes in visualPlugin
		let oldPluginTs = "";
		if (
			await fs.exists(
				path.join(process.cwd(), this.options.pluginLocation)
			)
		) {
			oldPluginTs = await fs.readFile(
				path.join(process.cwd(), this.options.pluginLocation)
			);
		}
		if (oldPluginTs.toString() !== pluginTs.toString()) {
			return await fs.writeFile(
				path.join(process.cwd(), this.options.pluginLocation),
				pluginTs
			);
		}
	}

	getVisualConfig(
		stringResources,
		capabilities,
		dependencies,
		jsContent,
		cssContent
	) {
		return {
			visual: {
				name: this.options.visual.name,
				displayName: this.options.visual.displayName,
				guid: `${this.options.visual.guid}`,
				visualClassName: this.options.visual.visualClassName,
				version: this.options.visual.version,
				description: this.options.visual.description,
				supportUrl: this.options.visual.supportUrl || "",
				gitHubUrl: this.options.visual.gitHubUrl || "",
			},
			author: this.options.author,
			apiVersion: this.options.apiVersion,
			style: "style/visual.less",
			stringResources: stringResources,
			capabilities: capabilities,
			dependencies: dependencies,
			content: {
				js: jsContent,
				css: cssContent,
				iconBase64: this.options.iconImage,
			},
			visualEntryPoint: "",
			toolsVersion: this.options.toolsVersion,
		};
	}

	checkVisualInfo(visualConfig) {
		const errors = [];
		if (visualConfig && visualConfig.author) {
			if (!visualConfig.author.name) {
				errors.push(Error("Author name is not specified"));
			}
			if (!visualConfig.author.email) {
				errors.push(Error("Author e-mail is not specified"));
			}
		}
		if (visualConfig && visualConfig.visual) {
			if (!visualConfig.visual.description) {
				errors.push(Error("The visual description is not specified"));
			}
			if (!visualConfig.visual.supportUrl) {
				errors.push(Error("supportUrl is not specified"));
			}
		}

		return errors;
	}

	addStatusFile(compilation) {
		const status = `${new Date().getTime()}\n${this.options.visual.guid}${
			this.options.devMode ? DEBUG : ""
		}`;
		compilation.assets["status"] = new RawSource(status);
	}

	async generatePackageJson(visualConfigProd) {
		let templateOptions = {
			visualData: visualConfigProd.visual || {},
			authorData: visualConfigProd.author || {
				name: "",
				email: "",
			},
			guid: visualConfigProd.visual.guid,
		};

		delete templateOptions.visualData.apiVersion;
		return jsonTemplate(templateOptions);
	}

	async generateResources(config) {
		const validationErrors = this.checkVisualInfo(config);
		if (validationErrors.length) return Promise.reject(validationErrors);

		const operations = [];
		const dropPath = this.options.packageOutPath;
		const resourcePath = path.join(dropPath, "resources");
		const prodConfig = cloneDeepFunc(config);

		prodConfig.visual.guid = `${config.visual.guid}`; // prod version of visual should not contaings _DEBUG postfix
		prodConfig.visual.gitHubUrl = prodConfig.visual.gitHubUrl || "";
		let packageJSONContent = await this.generatePackageJson(prodConfig);
		prodConfig.externalJS = [];
		prodConfig.assets = {
			icon: "assets/icon.png",
		};

		operations.push(
			fs.outputFile(
				path.join(dropPath, "package.json"),
				packageJSONContent,
				{
					encoding: ENCODING,
				}
			)
		);

		if (this.options.generateResources) {
			operations.push(
				fs.outputFile(
					path.join(resourcePath, "visual.js"),
					config.content.js,
					{
						encoding: ENCODING,
					}
				),
				fs.outputFile(
					path.join(
						resourcePath,
						`${prodConfig.visual.guid}.pbiviz.json`
					),
					JSON.stringify(prodConfig),
					{
						encoding: ENCODING,
					}
				),
				fs.outputFile(
					path.join(resourcePath, "visual.prod.js"),
					config.content.js,
					{
						encoding: ENCODING,
					}
				),
				fs.outputFile(
					path.join(resourcePath, "visual.prod.css"),
					config.content.css,
					{
						encoding: ENCODING,
					}
				)
			);
		}

		if (this.options.generatePbiviz) {
			operations.push(
				this.generatePbiviz(prodConfig, packageJSONContent, dropPath)
			);
		}

		return Promise.all(operations).catch((err) => {
			throw err;
		});
	}

	async generatePbiviz(visualConfigProd, packageJSONContent, dropPath) {
		return new Promise(async (resolve, reject) => {
			const zip = new JSZip();
			zip.file("package.json", packageJSONContent);
			zip.folder("resources").file(
				`${visualConfigProd.visual.guid}.pbiviz.json`,
				JSON.stringify(visualConfigProd)
			);
			const outPath = path.join(
				dropPath,
				`${visualConfigProd.visual.guid}.${visualConfigProd.visual.version}.pbiviz`
			);
			await fs.ensureDir(dropPath);
			if (this.options.compression !== "0") {
				logger.info("Package compression enabled");
			} else {
				logger.info("Package compression disabled");
			}
			const input = zip.generateNodeStream({
				compression:
					this.options.compression !== "0" ? "DEFLATE" : "STORE",
				compressionOptions: {
					level: this.options.compression,
				},
			});
			const out = fs.createWriteStream(outPath, {
				flags: "w",
			});

			input
				.pipe(out)
				.on("error", (err) => {
					logger.error("Cannot create package", err);
					reject(err);
				})
				.on("close", () => {
					logger.info("Package created!");
					resolve();
				});
		});
	}
}

module.exports = PowerBICustomVisualsWebpackPlugin;
