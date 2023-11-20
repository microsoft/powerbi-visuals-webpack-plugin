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
const getLocalization = require("./extractor/localization");
const pluginTemplate = require("../templates/plugin-template");
const jsonTemplate = require("../templates/package-json-template");

const DEBUG = "_DEBUG";

const base64Img = (filepath) => {
	let imageAsBase64 = fs.readFileSync(filepath, "base64"),
		defaultExt = "png",
		extName = path.extname(filepath).substring(1) || defaultExt;

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
					.substring(2)}`,
				visualClassName: "Visual",
				version: "1.0.0.0",
				description: "",
				supportUrl: "",
				gitHubUrl: "",
			},
			author: "",
			apiVersion: apiVersion,
			capabilities: {},
			iconImage: !options.assets.icon
				? base64Img(path.join(__dirname, "templates", "icon.png"))
				: base64Img(path.join(process.cwd(), options.assets.icon)),
			devMode: true,
			packageOutPath: path.join(process.cwd(), "dist"),
			dropPath: path.join(process.cwd(), ".tmp", "drop"),
			generateResources: true,
			generatePbiviz: true,
			generatePlugin: true,
			schemaLocation: path.join(process.cwd(), ".api", "v" + apiVersion),
			capabilitiesSchema: null,
			dependenciesSchema: null,
			modules: true,
			visualSourceLocation: "",
			pluginLocation: path.join(".tmp", "precompile", "visualPlugin.ts"),
			compression: 0, // no compression,
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
		compiler.hooks.thisCompilation.tap(this._name, (compilation) => {
			logger.info("Start packaging...");
			compilation.hooks.processAssets.tapPromise(
				{
					name: this._name,
					stage: compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
				},
				() =>
					this.generateStatusAsset(compilation).catch((ex) => {
						[].concat(ex).map((ex) => logger.error(ex.message));
					})
			);
		});

		compiler.hooks.emit.tapAsync(this._name, (compilation, callback) => {
			this.afterCompilation(compilation)
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

	async generateStatusAsset(compilation) {
		const status = `${new Date().getTime()}\n${this.options.visual.guid}${
			this.options.devMode ? DEBUG : ""
		}`;

		compilation.emitAsset("status", new RawSource(status));
	}

	async afterCompilation(compilation) {
		const options = this.options;

		const config = await Promise.all([
			getLocalization(options),
			getDependencies(options),
			getCapabilities(options).then((capabilities) =>
				scriptVisual.patchCababilities(options, capabilities)
			),
			this.getAssetsContent(compilation.assets),
		])
			.then(
				([
					stringResources,
					dependencies,
					capabilities,
					{ jsContent, cssContent },
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

		if (!this.options.devMode) {
			await this.generateResources(config);
		}

		await this.outputFile(
			path.join(options.dropPath, "pbiviz.json"),
			JSON.stringify(config)
		);
	}

	getAssetsContent(assets) {
		let assetsContent = {};
		for (let asset in assets) {
			const extension = asset.split(".").pop();
			const content = assets[asset].source();

			if (extension === "js") {
				assetsContent.jsContent = content;
			} else if (extension === "css") {
				assetsContent.cssContent = content;
			}
		}
		return assetsContent;
	}

	async _beforeCompile(callback) {
		if (!this.options.modules) callback();
		if (this.options.externalJS && this.options.externalJS.length) {
			throw new Error("externalJS option is not supported anymore");
		}
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
		const pluginTs = pluginTemplate(this.getPluginOptions());
		const pluginLocation = path.join(
			process.cwd(),
			this.options.pluginLocation
		);
		const oldPluginTs = fs.existsSync(pluginLocation)
			? fs.readFileSync(pluginLocation)
			: "";

		// write file if only changes in visualPlugin
		if (oldPluginTs.toString() !== pluginTs.toString()) {
			return await this.outputFile(pluginLocation, pluginTs);
		}
	}

	getPluginOptions() {
		return {
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
		prodConfig.externalJS = [];
		prodConfig.assets = {
			icon: "assets/icon.png",
		};

		const packageJSONContent = await this.generatePackageJson(prodConfig);
		operations.push(
			this.outputFile(
				path.join(dropPath, "package.json"),
				packageJSONContent
			)
		);

		if (this.options.generateResources) {
			operations.push(
				this.outputFile(
					path.join(resourcePath, "visual.js"),
					config.content.js
				),
				this.outputFile(
					path.join(
						resourcePath,
						`${prodConfig.visual.guid}.pbiviz.json`
					),
					JSON.stringify(prodConfig)
				),
				this.outputFile(
					path.join(resourcePath, "visual.prod.js"),
					config.content.js
				),
				this.outputFile(
					path.join(resourcePath, "visual.prod.css"),
					config.content.css
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
			const { guid, version } = visualConfigProd.visual;
			const zip = new JSZip();

			zip.file("package.json", packageJSONContent);
			zip.folder("resources").file(
				`${guid}.pbiviz.json`,
				JSON.stringify(visualConfigProd)
			);

			const outPath = path.join(dropPath, `${guid}.${version}.pbiviz`);
			const isCompressionEnabled = this.options.compression !== "0";
			const input = zip.generateNodeStream({
				compression: isCompressionEnabled ? "DEFLATE" : "STORE",
				compressionOptions: {
					level: this.options.compression,
				},
			});

			logger.info(
				`Package compression ${
					isCompressionEnabled ? "enabled" : "disabled"
				}`
			);

			await fs.ensureDir(dropPath);
			const out = fs.createWriteStream(outPath);

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

	outputFile(filePath, content) {
		return fs.outputFile(filePath, content, { encoding: ENCODING });
	}
}

module.exports = {
	PowerBICustomVisualsWebpackPlugin,
	LocalizationLoader: require.resolve("./localizationLoader"),
};
