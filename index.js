'use strict';
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');

const base64Img = require('base64-img');
const JSZip = require('jszip');
const UglifyJS = require('uglify-es');
const DEBUG = "";

const encoding = "utf8";

class PowerBICustomVisualsWebpackPlugin {
  constructor(options) {
    const name = "SampleVisual";
      var defaultOptions = {
          visual: {
            name: name,
            displayName: name,
            guid: `${name}_${new Date().getTime()}_${Math.random().toString().substr(2)}`,
            visualClassName: "Visual",
            version: "1.0.0.0",
            description: "",
            supportUrl: ""
        },
        author: "",
        apiVersion: "1.10.0",
        stringResourcesPath: {
          "en-US": {
          }
        },
        capabilities: {},
        iconImage: !options.assets.icon ? 
          base64Img.base64Sync(path.join(__dirname, "templates", "icon.png")) : 
          base64Img.base64Sync(path.join(process.cwd(),options.assets.icon)),
        devMode: true,
        packageOutPath: path.join(process.cwd(), "dist"),
        cssStyles: null,
        generateResources: true,
        generatePbiviz: true,
        minifyJS: true
      };

      this.options = Object.assign(defaultOptions, options);
  }

  static parseLocalizationString(options) {
    var stringResources = {};
    if (options.stringResources && options.stringResources.length) {
      options.stringResources.forEach(resourcePath => {
        let resource = fs.existsSync(path.join(".", resourcePath)) ? JSON.parse(fs.readFileSync(resourcePath, encoding)) : "";
        stringResources[resource.locale] = resource.values;
      });
    } 
    let resourcesDir = path.join(".", "stringResources");
    if (fs.existsSync(resourcesDir)) {
      let resourcesFolders = fs.readdirSync(resourcesDir);
      resourcesFolders.forEach( folder => {
        if (fs.statSync(path.join(resourcesDir, folder)).isDirectory()) {
          let resourceFile = JSON.parse(fs.readFileSync(path.join(resourcesDir, folder, "resources.resjson"), encoding));
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

  static appendExternalJS(externalJS) {
    let fileContent = "";
    for (let file in externalJS) {
      fileContent += fs.readFileSync(externalJS[file], {
        encoding: encoding
      });
    }

    return fileContent;
  }

  static generatePbiviz(visualConfigProd, packageJSONContent, dropPath) {
    let zip = new JSZip();
    zip.file('package.json', packageJSONContent);
    let resources = zip.folder("resources");
    resources.file(`${visualConfigProd.visual.guid}.pbiviz.json`, JSON.stringify(visualConfigProd));
    zip.generateAsync({ type: 'nodebuffer' })
        .then(content => 
          fs.writeFileSync(
            path.join(
              dropPath,
              `${visualConfigProd.visual.guid}.${visualConfigProd.visual.version}.pbiviz`),
            content)
        );
  }

  static generatePackageJson(visualConfig) {
    let visualConfigProd = _.cloneDeep(visualConfig);
    visualConfigProd.visual.guid = `${visualConfig.visual.guid}`;
    visualConfigProd.visual.gitHubUrl = visualConfigProd.visual.gitHubUrl || "";
    
    let templateOptions = {
        visualData: visualConfigProd.visual || {},
        authorData: visualConfigProd.author || {
          name: "",
          email: ""
        },
        guid: visualConfigProd.visual.guid
    };
    let packageTemplate = fs.readFileSync(path.join(__dirname, "templates", "package.json.template"));
    delete templateOptions.visualData.apiVersion;
    return [_.template(packageTemplate)(templateOptions), visualConfigProd];
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

  getVisualConfig(stringResources, capabilities, jsContent, cssContent) {
    return {
      visual: {
          name: this.options.visual.name,
          displayName: this.options.visual.displayName,
          guid: `${this.options.visual.guid}${ this.options.devMode ? DEBUG : ''}`,
          visualClassName: this.options.visual.visualClassName,
          version: this.options.visual.version,
          description: this.options.visual.description,
          supportUrl: this.options.visual.supportUrl,
          apiVersion: this.options.apiVersion
      },
      author: this.options.author,
      apiVersion: this.options.apiVersion,
      style: "style/visual.less",
      stringResources: stringResources,
      capabilities: capabilities,
      content: {
          js: jsContent,
          css: cssContent,
          iconBase64: this.options.iconImage
      }
    };

  }

  apply(compiler) {
    const options = this.options;
    const encoding = "utf8";
    const pluginFileName = "visualPlugin.js";

    compiler.plugin("emit", (compilation, callback) => {
      var stringResources = PowerBICustomVisualsWebpackPlugin.parseLocalizationString(options);

      var capabilities = options.capabilities;

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
          let style = fs.readFileSync(options.cssStyles, {encoding: encoding});
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

      let pluginTemplate = fs.readFileSync(path.join(__dirname, "templates", "plugin.ts.template"));
      let pluginTs = this.applyPlugin(compilation, pluginOptions, pluginTemplate);

      // append externalJS files content to visual code;
      if (this.options.externalJS) {
        externalJSOrigin += PowerBICustomVisualsWebpackPlugin.appendExternalJS(this.options.externalJS);
      }

      externalJSOrigin += "\nvar globalPowerbi = powerbi;\n";

      jsContent += externalJSOrigin;
      jsContent += jsContentOrigin;
      jsContent += `\n ${pluginTs}`;

      compilation.assets[jsPath] = {
        source: () => jsContent,
        size: () => jsContent.length
      };

      var visualConfig = this.getVisualConfig(stringResources, capabilities, jsContent, cssContent);
      var pbivizJSONData = JSON.stringify(visualConfig);

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
        if(!fs.existsSync(dropPath)) {
          fs.mkdir(dropPath);
        }
        let resourcePath = path.join(dropPath, 'resources');
        if(!fs.existsSync(resourcePath)) {
          fs.mkdir(resourcePath);
        }

        let [packageJSONContent, visualConfigProd]  = PowerBICustomVisualsWebpackPlugin.generatePackageJson(visualConfig);
        fs.writeFileSync(path.join(dropPath, 'package.json'), packageJSONContent);

        let jsContentProd = "";

        /// load external js
        if (this.options.externalJS) {
          jsContentProd += PowerBICustomVisualsWebpackPlugin.appendExternalJS(this.options.externalJS);
        }

        let pluginOptionsProd = _.cloneDeep(pluginOptions);
        pluginOptionsProd.pluginName = `${this.options.visual.guid}`;
        let pluginTsProd = _.template(pluginTemplate)(pluginOptionsProd);

        jsContentProd += externalJSOrigin;
        jsContentProd += jsContentOrigin;
        jsContentProd += `\n ${pluginTsProd}`;
        fs.writeFileSync(path.join(resourcePath, 'visual.js'), jsContentProd);
        if (this.options.minifyJS) {
          let uglifyed =  UglifyJS.minify(jsContentProd);
          if (!uglifyed.error) {
            jsContentProd = uglifyed.code;
          }
          else {
            console.error(uglifyed.error.message);
          }
        }
        
        visualConfigProd.content = {
          js: jsContentProd,
          css: cssContent,
          iconBase64: this.options.iconImage
        }
        visualConfigProd.externalJS = [];
        visualConfigProd.assets =  {
          "icon": "assets/icon.png"
        };

        fs.writeFileSync(path.join(resourcePath, `${visualConfigProd.visual.guid}.pbiviz.json`), JSON.stringify(visualConfigProd));
        fs.writeFileSync(path.join(resourcePath, 'visual.prod.js'), jsContentProd);
        fs.writeFileSync(path.join(resourcePath, 'visual.prod.css'), cssContent);

        if (this.options.generatePbiviz) {
          PowerBICustomVisualsWebpackPlugin.generatePbiviz(visualConfigProd, packageJSONContent, this.options.packageOutPath);
        }
        if (!this.options.generateResources) {
          fs.removeSync(resourcePath);
        }
      }

      callback();
    });
  }
}

module.exports = PowerBICustomVisualsWebpackPlugin;