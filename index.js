"use strict";
const path = require("path");
const fs = require("fs-extra");
const _ = require("lodash");
const base64Img = require("base64-img");
const JSZip = require("jszip");
const RawSource = require("webpack-sources/lib/RawSource");

const { ENCODING } = require("./constants");
const logger = require("./logger");
const getDependencies = require("./extractor/dependencies");
const getCapabilities = require("./extractor/capabilities");
const rvisual = require("./extractor/rvisual");
const getJsContent = require("./extractor/js");
const getCssContent = require("./extractor/css");
const getLocalization = require("./extractor/localization");

const DEBUG = "_DEBUG";

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
				gitHubUrl: ""
			},
			author: "",
			apiVersion: apiVersion,
			stringResourcesPath: {
				"en-US": {}
			},
			capabilities: {},
			iconImage: !options.assets.icon
				? base64Img.base64Sync(
						path.join(__dirname, "templates", "icon.png")
				  )
				: base64Img.base64Sync(
						path.join(process.cwd(), options.assets.icon)
				  ),
			devMode: true,
			packageOutPath: path.join(process.cwd(), "dist"),
			cssStyles: null,
			generateResources: true,
			generatePbiviz: true,
			minifyJS: true,
			schemaLocation: path.join(process.cwd(), ".api", "v" + apiVersion),
			capabilitiesSchema: null,
			pbivizSchema: null,
			stringResourcesSchema: null,
			dependenciesSchema: null,
			modules: true,
			visualSourceLocation: ""
		};

		this._name = "PowerBICustomVisualsWebpackPlugin";
		this.options = Object.assign(defaultOptions, options);
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
				.catch(ex => {
					if (ex.length) {
						ex.forEach(ex => console.log(ex.message));
						return;
					}
					logger.error(ex.message);
					throw ex;
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

		const capabilities = getCapabilities(options);

		const config = await Promise.all([
			getLocalization(options),
			getDependencies(options),
			rvisual.patchCababilities(options, capabilities),
			getJsContent(options, compilation),
			getCssContent(options, compilation)
		])
			.then(([stringResources, dependencies, _, jsContent, cssContent]) =>
				this.getVisualConfig(
					stringResources,
					capabilities,
					dependencies,
					jsContent,
					cssContent
				)
			)
			.catch(err => {
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
			await this.generateRosources(config);
		}
	}

	async _beforeCompile(callback) {
		logger.info("Start preparing plugin template");

		if (!this.options.modules) callback();

		await this.generateVisualPlugin()
			.then(() => {
				logger.info("Finish preparing plugin template");
				callback();
			})
			.catch(ex => {
				const errors = [].concat(ex);
				errors.forEach(ex => this._error(ex.message));
				throw Error("Failed to generate visualPlugin.ts");
			});
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
			visualSourceLocation: this.options.visualSourceLocation
		};
		const pluginTemplate = await fs.readFile(
			path.join(__dirname, "templates", "plugin.ts.template")
		);
		const pluginTs = _.template(pluginTemplate)(pluginOptions);
		return await fs.writeFile(
			path.join(process.cwd(), ".tmp", "precompile", "visualPlugin.ts"),
			pluginTs
		);
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
				gitHubUrl: this.options.visual.gitHubUrl || ""
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
				iconBase64: this.options.iconImage
			},
			visualEntryPoint: ""
		};
	}

	checkVisualInfo(visualConfig) {
		let failed = false;
		if (visualConfig && visualConfig.author) {
			if (!visualConfig.author.name) {
				logger.error("Author name is not specified");
				failed = true;
			}
			if (!visualConfig.author.email) {
				logger.error("Author e-mail is not specified");
				failed = true;
			}
		}
		if (visualConfig && visualConfig.visual) {
			if (!visualConfig.visual.description) {
				logger.error("The visual description is not specified");
				failed = true;
			}
			if (!visualConfig.visual.supportUrl) {
				logger.error("supportUrl is not specified");
				failed = true;
			}
		}
		if (failed) {
			throw new Error("Metadata is not specified");
		}
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
				email: ""
			},
			guid: visualConfigProd.visual.guid
		};
		let packageTemplate = await fs.readFile(
			path.join(__dirname, "templates", "package.json.template")
		);
		delete templateOptions.visualData.apiVersion;
		return _.template(packageTemplate)(templateOptions);
	}

	async generateRosources(config) {
		this.checkVisualInfo(config);

		const operations = [];
		const dropPath = this.options.packageOutPath;
		const resourcePath = path.join(dropPath, "resources");
		const prodConfig = _.cloneDeep(config);

		prodConfig.visual.guid = `${config.visual.guid}`; // prod version of visual should not contaings _DEBUG postfix
		prodConfig.visual.gitHubUrl = prodConfig.visual.gitHubUrl || "";
		let packageJSONContent = await this.generatePackageJson(prodConfig);
		prodConfig.externalJS = [];
		prodConfig.assets = {
			icon: "assets/icon.png"
		};

		operations.push(
			fs.outputFile(
				path.join(dropPath, "package.json"),
				packageJSONContent,
				{
					encoding: ENCODING
				}
			)
		);

		if (this.options.generateResources) {
			operations.push(
				fs.outputFile(
					path.join(resourcePath, "visual.js"),
					config.content.js,
					{
						encoding: ENCODING
					}
				),
				fs.outputFile(
					path.join(
						resourcePath,
						`${prodConfig.visual.guid}.pbiviz.json`
					),
					JSON.stringify(prodConfig),
					{
						encoding: ENCODING
					}
				),
				fs.outputFile(
					path.join(resourcePath, "visual.prod.js"),
					config.content.js,
					{
						encoding: ENCODING
					}
				),
				fs.outputFile(
					path.join(resourcePath, "visual.prod.css"),
					config.content.css,
					{
						encoding: ENCODING
					}
				)
			);
		}

		if (this.options.generatePbiviz) {
			operations.push(
				this.generatePbiviz(
					prodConfig,
					packageJSONContent,
					this.options.packageOutPath
				)
			);
		}

		await fs.emptyDir(dropPath);
		return Promise.all(operations).catch(err => {
			throw err;
		});
	}

	async generatePbiviz(visualConfigProd, packageJSONContent, dropPath) {
		const zip = new JSZip();
		zip.file("package.json", packageJSONContent);
		zip.folder("resources").file(
			`${visualConfigProd.visual.guid}.pbiviz.json`,
			JSON.stringify(visualConfigProd)
		);
		const content = await zip.generateAsync({ type: "nodebuffer" });
		return await fs.writeFile(
			path.join(
				dropPath,
				`${visualConfigProd.visual.guid}.${
					visualConfigProd.visual.version
				}.pbiviz`
			),
			content
		);
	}
}

module.exports = PowerBICustomVisualsWebpackPlugin;
