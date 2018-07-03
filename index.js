'use strict';
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
let Validator = require('jsonschema').Validator;

const base64Img = require('base64-img');
const JSZip = require('jszip');
const DEBUG = "";

const encoding = "utf8";

class PowerBICustomVisualsWebpackPlugin {
  constructor(options) {
    const name = "SampleVisual";
    const apiVersion = "1.10.0";
    var defaultOptions = {
      visual: {
        name: name,
        displayName: name,
        guid: `${name}_${new Date().getTime()}_${Math.random().toString().substr(2)}`,
        visualClassName: "Visual",
        version: "1.0.0.0",
        description: "",
        supportUrl: "",
        gitHubUrl: "",
      },
      author: "",
      apiVersion: apiVersion,
      stringResourcesPath: {
        "en-US": {
        }
      },
      capabilities: {},
      iconImage: !options.assets.icon ?
        base64Img.base64Sync(path.join(__dirname, "templates", "icon.png")) :
        base64Img.base64Sync(path.join(process.cwd(), options.assets.icon)),
      devMode: true,
      packageOutPath: path.join(process.cwd(), "dist"),
      cssStyles: null,
      generateResources: true,
      generatePbiviz: true,
      minifyJS: true,
      schemaLocation: path.join(process.cwd(), '.api', 'v' + apiVersion)
    };

    this.options = Object.assign(defaultOptions, options);
    this.options.schemaLocation = path.join(process.cwd(), '.api', 'v' + this.options.apiVersion);
  }

  async parseLocalizationString(options) {
    var stringResources = {};
    if (options.stringResources && options.stringResources.length) {
      options.stringResources.forEach(async resourcePath => {
        if (await fs.exists(path.join(".", resourcePath))) {
          let resource = JSON.parse(await fs.readFile(path.join(".", resourcePath), encoding));
          stringResources[resource.locale] = resource.values;
        }
      });
    } 
    let resourcesDir = path.join(".", "stringResources");
    if (await fs.exists(resourcesDir)) {
      let resourcesFolders = await fs.readdir(resourcesDir);
      resourcesFolders.forEach( async folder => {
        if ((await fs.stat(path.join(resourcesDir, folder))).isDirectory()) {
          let resourceFile = JSON.parse(await fs.readFile(path.join(resourcesDir, folder, "resources.resjson"), encoding));
          if (typeof stringResources[folder] !== "undefined") {
            // resjson string rewrites exist keys 
            Object.keys(resourceFile).forEach(key => {
              stringResources[folder][key] = resourceFile[key];
            });
          }
          else {
            stringResources[folder] = resourceFile;
          }
        }
      });
    }
    return stringResources;
  }

  async appendExternalJS(externalJS) {
    let fileContent = "";
    for (let file in externalJS) {
      fileContent += (await fs.readFile(externalJS[file], encoding));
    }

    return fileContent;
  }

  async generatePbiviz(visualConfigProd, packageJSONContent, dropPath) {
    let zip = new JSZip();
    zip.file('package.json', packageJSONContent);
    let resources = zip.folder("resources");
    resources.file(`${visualConfigProd.visual.guid}.pbiviz.json`, JSON.stringify(visualConfigProd));
    let content = await zip.generateAsync({ type: 'nodebuffer' });
    await fs.writeFile(
      path.join(dropPath, `${visualConfigProd.visual.guid}.${visualConfigProd.visual.version}.pbiviz`),
      content);
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
    let packageTemplate = await fs.readFile(path.join(__dirname, "templates", "package.json.template"));
    delete templateOptions.visualData.apiVersion;
    return _.template(packageTemplate)(templateOptions);
  }

  applyPlugin(compilation, pluginOptions, pluginTemplate) {
    const pluginFileName = "visualPlugin.js";
    let pluginTs = _.template(pluginTemplate)(pluginOptions);

    compilation.assets[pluginFileName] = {
      source: () => pluginTs,
      size: () => pluginTs.length
    };

    return pluginTs;
  }

  getVisualConfig(stringResources, capabilities, dependencies, jsContent, cssContent) {
    return {
      visual: {
          name: this.options.visual.name,
          displayName: this.options.visual.displayName,
          guid: `${this.options.visual.guid}${ this.options.devMode ? DEBUG : ''}`,
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
      dependencies: dependencies || {},
      content: {
          js: jsContent,
          css: cssContent,
          iconBase64: this.options.iconImage
      }
    };

  }

  isRVisual(capabilities) {
    return capabilities &&
            capabilities.dataViewMappings &&
            capabilities.dataViewMappings.length === 1 &&
            typeof capabilities.dataViewMappings[0].scriptResult !== 'undefined';
  }

  async _getRScriptsContents(scriptFileName) {
    // regex patterns to find 'source("fname")' and replace them. Also, ignores comments
    const Pattern4FileName = /^[^#\n]*source\s*?\(\s*?['|"]([^()'"]*)['|"]\s*?\)/m;
    const MaxSourceReplacements = 100;

    try {
        let scriptContent = (await fs.readFile(scriptFileName)).toString();
        // search and replace 'source(fname)' commands
        for (let i = 0; i < MaxSourceReplacements; i++) {
            let matchListFileName = Pattern4FileName.exec(scriptContent);
            if (matchListFileName === null || matchListFileName.length < 2) {
                break;
            }
            let tempFname = path.join(process.cwd(), matchListFileName[1]);
            let tempContent = '';
            try {
                tempContent = await fs.readFile(tempFname).toString();
            }
            catch (err) {
                ConsoleWriter.error('Can not access file: ' + tempFname);
                throw (err);
            }
            scriptContent = scriptContent.replace(Pattern4FileName, tempContent);
        }
        return scriptContent;
    } catch (err) {
        throw err;
    }
  }

  _populateErrors(errors, fileName, type) {
    if (errors && errors.length > 0) {
        return errors.map(e => {
            return {
                filename: fileName,
                message: e.stack || 'Unknown error',
                type: type
            };
        });
    }
  }

  async _getCapabilities() {
    let capabilities;
    // read from file
    if (typeof this.options.capabilities === "string") {
      let capabilitiesFilePath = this.options.capabilities && path.join(process.cwd(), this.options.capabilities);
      if (capabilitiesFilePath && await fs.exists(capabilitiesFilePath)) {
        capabilities = await fs.readJson(capabilitiesFilePath);
      }
    }
    
    // use passed or loaded object
    capabilities = this.options.capabilities
    const schema = await fs.readJson((path.join(this.options.schemaLocation, 'schema.capabilities.json')));
    let validator = new Validator();
    let validation = validator.validate(capabilities, schema);
    let errors = this._populateErrors(validation.errors, `${this.options.capabilities}`, 'json');
    if (errors) {
      throw errors;
    } else {
      return capabilities;
    }
  }

  async _getDependencies() {
    let dependencies;
    // read from file
    if (typeof this.options.dependencies === "string") {
      let dependenciesFilePath = this.options.dependencies && path.join(process.cwd(), this.options.dependencies);
      if (dependenciesFilePath && await fs.exists(dependenciesFilePath)) {
        dependencies = await fs.readJson(dependenciesFilePath);
      }
    }

    // use passed or loaded object
    dependencies = this.options.dependencies
    let schema = await fs.readJson((path.join(this.options.schemaLocation, 'schema.dependencies.json')));
    let validator = new Validator();
    let validation = validator.validate(dependencies, schema);
    let errors = this._populateErrors(validation.errors, `${this.options.dependencies}`, 'json');
    if (errors) {
      throw errors;
    } else {
      return dependencies;
    }
  }
  
  async _emit(compilation) {
    const options = this.options;
    const encoding = "utf8";
    const pluginFileName = "visualPlugin.js";
    var stringResources = await this.parseLocalizationString(options);

    var capabilities = await this._getCapabilities(options.capabilities);
    var rVisual = this.isRVisual(capabilities);

    if (rVisual) {
      let scriptResult = capabilities.dataViewMappings[0].scriptResult;
      if (scriptResult.script.scriptProviderDefault && !scriptResult.script.scriptSourceDefault) {
        let fileName = path.join(process.cwd(), 'script.' + scriptResult.script.scriptProviderDefault.toLowerCase());
        scriptResult.script.scriptSourceDefault = await this._getRScriptsContents(fileName);
      }
    }

    let jsContent = "";
    let jsContentOrigin = "";
    let jsPath = "";

    let externalJSOrigin = "";
    let externalJSOriginPath = "";

    let cssContent = "";
    let cssPath = "visual.css";
    
    let visualFileName = "";
    for(let asset in compilation.assets) {
      if (asset.split('.').pop() === "js") {
        jsPath = asset;
        jsContentOrigin = compilation.assets[asset].source();
      }
      if (asset.split('.').pop() === "css") {
        cssPath = asset;
        cssContent = compilation.assets[asset].source();
      }
    }

    if (!cssContent) {
      // if css file wasn't specified, generate empty css file because PBI requres this file from dev server
      // try to get styles from package
      if (options.cssStyles) {
        let style = await fs.readFile(options.cssStyles, {encoding: encoding});
        cssContent = style;
      }
    }

    // generate visual plugin for dev server
    let pluginOptions = {
      pluginName: `${this.options.visual.guid}${ options.devMode ? DEBUG : ''}`,
      visualGuid: this.options.visual.guid,
      visualClass: this.options.visual.visualClassName,
      visualDisplayName: this.options.visual.displayName,
      visualVersion: this.options.visual.version,
      apiVersion: this.options.apiVersion
    };

    let pluginTemplate = await fs.readFile(path.join(__dirname, "templates", "plugin.ts.template"));
    let pluginTs = this.applyPlugin(compilation, pluginOptions, pluginTemplate);

    // append externalJS files content to visual code;
    if (this.options.externalJS) {
      externalJSOrigin += await this.appendExternalJS(this.options.externalJS);
    }

    externalJSOrigin += "\nvar globalPowerbi = powerbi;\n";

    jsContent += externalJSOrigin;
    jsContent += jsContentOrigin;
    jsContent += `\n ${pluginTs}`;

    compilation.assets[jsPath] = {
      source: () => jsContent,
      size: () => jsContent.length
    };

    let dependencies = await this._getDependencies();
    let visualConfig = this.getVisualConfig(stringResources, capabilities, dependencies, jsContent, cssContent);
    let pbivizJSONData = JSON.stringify(visualConfig);

    compilation.assets["pbiviz.json"] = {
      source: () => pbivizJSONData,
      size: () => pbivizJSONData.length
    };

    // update status file for debug server
    const status = `${new Date().getTime()}\n${this.options.visual.guid}${ options.devMode ? DEBUG : ''}`;
    compilation.assets["status"] = {
      source: () => status,
      size: () => status.length
    };

    if (!this.options.devMode) {
      let dropPath = this.options.packageOutPath
      if(!(await fs.exists(dropPath))) {
        await fs.mkdir(dropPath);
      }
      let resourcePath = path.join(dropPath, 'resources');
      if(!(await fs.exists(resourcePath))) {
        await fs.mkdir(resourcePath);
      }

      let visualConfigProd = _.cloneDeep(visualConfig);  
      visualConfigProd.visual.guid = `${visualConfig.visual.guid}`; // prod version of visual should not contaings _DEBUG postfix
      visualConfigProd.visual.gitHubUrl = visualConfigProd.visual.gitHubUrl || "";
      let packageJSONContent  = await this.generatePackageJson(visualConfigProd);
      await fs.writeFile(path.join(dropPath, 'package.json'), packageJSONContent);

      let jsContentProd = "";

      // load external js
      if (this.options.externalJS) {
        jsContentProd += await this.appendExternalJS(this.options.externalJS);
      }

      let pluginOptionsProd = _.cloneDeep(pluginOptions);
      pluginOptionsProd.pluginName = `${this.options.visual.guid}`;
      let pluginTsProd = _.template(pluginTemplate)(pluginOptionsProd);

      jsContentProd += externalJSOrigin;
      jsContentProd += jsContentOrigin;
      jsContentProd += `\n ${pluginTsProd}`;
      await fs.writeFile(path.join(resourcePath, 'visual.js'), jsContentProd);
      
      visualConfigProd.content = {
        js: jsContentProd,
        css: cssContent,
        iconBase64: this.options.iconImage
      }
      visualConfigProd.externalJS = [];
      visualConfigProd.assets =  {
        "icon": "assets/icon.png"
      };

      await fs.writeFile(path.join(resourcePath, `${visualConfigProd.visual.guid}.pbiviz.json`), JSON.stringify(visualConfigProd));
      await fs.writeFile(path.join(resourcePath, 'visual.prod.js'), jsContentProd);
      await fs.writeFile(path.join(resourcePath, 'visual.prod.css'), cssContent);

      if (this.options.generatePbiviz) {
        await this.generatePbiviz(visualConfigProd, packageJSONContent, this.options.packageOutPath);
      }
      if (!this.options.generateResources) {
        await fs.remove(resourcePath);
      }
    }
  }

  apply(compiler) {
    compiler.plugin("emit", (compilation, callback) => {
      this._emit(compilation).then(() => callback()).catch( ex => console.log(ex.message))
    });
  }
}

module.exports = PowerBICustomVisualsWebpackPlugin;