# powerbi-visuals-webpack-plugin

This plugin allows developing custom visuals by using webpack for assembly visual package.

Provides following functionality:

* Create assets for developer server
* Create *.pbiviz package.

##How to use the plugin

### Plugin options

Plugin config description

```JavaScript
  var defaultOptions = {
      visual: {
        name: "Visual name",
        displayName: "Visual name for display in visuals panel",
        guid: `Unique GUID for the visual (generates by plugin)`,
        visualClassName: "Visual class name, it is used by visual plugin to create instance of the visual",
        version: "Visual version",
        description: "Visual description",
        supportUrl: "URL for support"
    },
    author: "Author of the visual",
    apiVersion: "API version",
    stringResourcesPath: [
      "Paths to localization files"
    ],
    capabilities: {
        // Visual capabilities
    },
    iconImage: "Icon file as base64 string",
    devMode: "development mode",
    packageOutPath: "location to create *.pbiviz file",
    cssStyles: "styles",
    generateResources: "it is used --resources flag in pbiviz tools",
    generatePbiviz: "it is used by --no-pbiviz flag in pbiviz tools"
  };
```

### Webpack configuration

The sample of config  webpack 4.

```JavaScript
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
// for icon file
const base64Img = require('image-to-base64');
// werbpack plugin
const PowerBICustomVisualsWebpackPlugin = require('powerbi-visuals-webpack-plugin');
const WatchIgnorePlugin = require("webpack").WatchIgnorePlugin;
// file encoding
const encoding = "utf8";

// string resources
const stringResourcesPath = path.join("stringResources", "en-US", "resources.json");
// visual configuration json path
const pbivizPath = "./pbiviz.json";
const pbivizFile = require(path.join(__dirname, pbivizPath));

const stringResources = JSON.parse(fs.readFileSync(stringResourcesPath, encoding));

// the visual capabilities content
const capabilitiesPath = "./capabilities.json";
const capabilitiesFile = require(path.join(__dirname, capabilitiesPath));

module.exports = {
    entry: './src/external.ts', // path to visual class file
    devtool: 'source-map',
    mode: "development",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: [ '.tsx', '.ts', '.js' ]
    },
    output: {
        path: path.join(__dirname, "/.tmp/drop"),
        publicPath: 'assets',
        filename: "visual.js",
        libraryTarget: 'var',
        library: 'CustomVisual' // it should be CustomVisual, the name is used by visual plugin to create instance of the visual
    },
    devServer: {
        disableHostCheck: true,
        contentBase: path.join(__dirname, ".tmp/drop"), // path with assets for dev server, them are generated by webpack plugin
        compress: true,
        port: 8080, // dev server port
        hot: false,
        inline: false,
        // cert files for dev server
        https: {
            key: path.join(__dirname, "certs","PowerBICustomVisualTest_public.key"),
            cert: path.join(__dirname, "certs", "PowerBICustomVisualTest_public.cer"),
            pfx: path.join(__dirname, "certs", "PowerBICustomVisualTest_public.pfx"),
        },
        headers: {
            "access-control-allow-origin": "*",
            "cache-control": "public, max-age=0"
        },
    },
    plugins: [
        // custom visuals plugin instance with options
        new PowerBICustomVisualsWebpackPlugin({
            ...pbivizFile,
            capabilities: capabliliesFile,
            packageOutPath: path.join(__dirname, "distr"),
            devMode: false,
            stringResources: {
                "en-US": {}
            }
        }),
        // visual plugin regenerates with the visual source, but it's not requires relaunching dev server
        new WatchIgnorePlugin([
            path.join(__dirname, "src", "visualPlugin.js"),
        ]),
    ]
};
```

# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
