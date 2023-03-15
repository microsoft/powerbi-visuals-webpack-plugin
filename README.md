# powerbi-visuals-webpack-plugin

![Build](https://github.com/microsoft/powerbi-visuals-webpack-plugin/workflows/build/badge.svg)  [![npm version](https://img.shields.io/npm/v/powerbi-visuals-webpack-plugin.svg)](https://www.npmjs.com/package/powerbi-visuals-webpack-plugin) [![npm](https://img.shields.io/npm/dm/powerbi-visuals-webpack-plugin.svg)](https://www.npmjs.com/package/powerbi-visuals-webpack-plugin)

This plugin allows developing custom visuals by using webpack to build a visual package.

Provides following functionality:

* Creates assets for developer server
* Creates *.pbiviz package.

## How to use the plugin

### Plugin options

Plugin config description

```JavaScript
  var defaultOptions = {
      visual: {
        name: "Visual name",
        displayName: "Visual name for displaying in visuals panel",
        guid: `Unique GUID for the visual (generated by plugin)`,
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
    generateResources: "it is used --resources flag in pbiviz tools",
    generatePbiviz: "it is used by --no-pbiviz flag in pbiviz tools"
  };
```

### How to build a visual with webpack

1. Install all required libraries to build a visual

    ```cmd
    npm i webpack webpack-cli powerbi-visuals-webpack-plugin mini-css-extract-plugin webpack-bundle-analyzer extra-watch-webpack-plugin ts-loader less-loader less babel-loader json-loader base64-inline-loader @babel/preset-env @babel/core css-loader webpack-dev-server --save-dev
    ```

2. Install babel JS compiler and polyfills

    ```cmd
    npm i  @babel/runtime @babel/runtime-corejs3 core-js --save
    ```

3. Install powerbi-visuals-api package with required API version

    Run the following command to install the latest version of API package

    ```cmd
    npm i powerbi-visuals-api --save
    ```

4. Create SSL certificates  (optional)

    You need generate SSL certificates manually or copy files from powerbi-visuals-tools instance.

    [Read more](https://microsoft.github.io/PowerBI-visuals/docs/how-to-guide/create-ssl-certificate/) about certificates in documentation.

    Also, you can use certificates from `powerbi-visuals-toos` or use autogenerated certificates by `webpack-dev-server`. Just skip section 4 to use webpack-dev-server certificates.

    4.1 Run the following command:

    ```cmd
        npm i powerbi-visuals-tools@beta --save-dev
    ```

    to install the latest version of tools

    4.2 create script command to generate certificate.

    Add into `scripts` section of `package.json` command `"cert": "pbiviz --install-cert"`:

    ```json
        ...
            "scripts": {
                "cert": "pbiviz --install-cert"
            },
        ...
    ```

    Execute command `npm run cert`. You should get message: 

    ```cmd
        error  Certificate not found. The new certificate will be generated
        info   Certificate generated. Location is <visual root>\node_modules\powerbi-visuals-tools\certs\PowerBICustomVisualTest_public.pfx. Passphrase is '<YOUR_PASSPHRASE>'
    ```

    Apply path `node_modules\powerbi-visuals-tools\certs\PowerBICustomVisualTest_public.pfx` in webpack.config.js at `https` section of `devServer` parameters:

    ```js
    ...
        https: {
            pfx: fs.readFileSync(path.join(__dirname, `node_modules\powerbi-visuals-tools\certs\PowerBICustomVisualTest_public.pfx`)), // for windows
            passphrase: "<YOUR_PASSPHRASE>"
        },
    ...
    ```

5. Use sample of config  webpack 5. (copy into `webpack.config.js`)

    ```JavaScript
    const path = require('path');
    const fs = require("fs");

    // werbpack plugin
    const webpack = require("webpack");
    const PowerBICustomVisualsWebpackPlugin = require('powerbi-visuals-webpack-plugin');
    const MiniCssExtractPlugin = require("mini-css-extract-plugin");
    const Visualizer = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
    const ExtraWatchWebpackPlugin = require('extra-watch-webpack-plugin');

    // api configuration
    const powerbiApi = require("powerbi-visuals-api");

    // visual configuration json path
    const pbivizPath = "./pbiviz.json";
    const pbivizFile = require(path.join(__dirname, pbivizPath));

    // the visual capabilities content
    const capabilitiesPath = "./capabilities.json";
    const capabilitiesFile = require(path.join(__dirname, capabilitiesPath));

    const pluginLocation = './.tmp/precompile/visualPlugin.ts'; // path to visual plugin file, the file generates by the plugin

    // string resources
    const resourcesFolder = path.join(".","stringResources");
    const localizationFolders = fs.existsSync(resourcesFolder) && fs.readdirSync(resourcesFolder);
    const  statsLocation = "../../webpack.statistics.html";

    // babel options to support IE11
    let babelOptions = {
        "presets": [
            [
                require.resolve('@babel/preset-env'),
                {
                    "targets": {
                        "ie": "11"
                    },
                    useBuiltIns: "entry",
                    corejs: 3,
                    modules: false
                }
            ]
        ],
        sourceType: "unambiguous", // tell to babel that the project can contains different module types, not only es2015 modules
        cacheDirectory: path.join(".tmp", "babelCache") // path for chace files
    };

    module.exports = {
        entry: {
            "visual.js": pluginLocation
        },
        optimization: {
            concatenateModules: false,
            minimize: true // enable minimization for create *.pbiviz file less than 2 Mb, can be disabled for dev mode
        },
        devtool: 'source-map',
        mode: "development",
        module: {
            rules: [
                {
                    parser: {
                        amd: false
                    }
                },
                {
                    test: /(\.ts)x|\.ts$/,
                    include: /powerbi-visuals-|src|precompile\\visualPlugin.ts/,
                    use: [
                        {
                            loader: require.resolve('babel-loader'),
                            options: babelOptions
                        },
                        {
                            loader: require.resolve('ts-loader'),
                            options: {
                                transpileOnly: false,
                                experimentalWatchApi: false
                            }
                        }
                    ]
                },
                {
                    test: /(\.js)x|\.js$/,
                    use: [
                        {
                            loader: require.resolve('babel-loader'),
                            options: babelOptions
                        }
                    ]
                },
                {
                    test: /\.json$/,
                    loader: require.resolve('json-loader'),
                    type: "javascript/auto"
                },
                {
                    test: /\.less$/,
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader
                        },
                        {
                            loader: require.resolve('css-loader')
                        },
                        {
                            loader: require.resolve('less-loader'),
                            options: {
                                paths: [path.resolve(__dirname, "..", 'node_modules')]
                            }
                        }
                    ]
                },
                {
                    test: /\.css$/,
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader
                        },
                        {
                            loader: require.resolve('css-loader')
                        }
                    ]
                },
                {
                    test: /\.(woff|ttf|ico|woff2|jpg|jpeg|png|webp)$/i,
                    use: [
                    {
                        loader: 'base64-inline-loader'
                    }
                    ]
                }
            ]
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.jsx', '.js', '.css']
        },
        output: {
            path: path.join(__dirname, "/.tmp","drop"),
            publicPath: 'assets',
            filename: "[name]",
            sourceMapFilename: "[name].js.map",
		// if API version of the visual is higer/equal than 3.2.0 add library and libraryTarget options into config
        	// API version less that 3.2.0 doesn't require it
        	library: +powerbiApi.version.replace(/\./g,"") >= 320 ? pbivizFile.visual.guid : undefined,
        	libraryTarget: +powerbiApi.version.replace(/\./g,"") >= 320 ? 'var' : undefined,
        },
        devServer: {
	        publicPath: '/assets/',
            disableHostCheck: true,
            contentBase: path.join(__dirname, ".tmp", "drop"), // path with assets for dev server, they are generated by webpack plugin
            compress: true,
            port: 8080, // dev server port
            hot: false,
            inline: false,
            // cert files for dev server
            https: {
                // keep it commented to use webpack generated certificate
                // key: path.join(__dirname, "certs","PowerBICustomVisualTest_public.key"), // for darwin, linux
                // cert: path.join(__dirname, "certs", "PowerBICustomVisualTest_public.cer"), // for darwin, linux
                // pfx: fs.readFileSync(path.join(__dirname, "certs", "PowerBICustomVisualTest_public.pfx")), // for windows
                // passphrase: "5031595470751755"
            },
            headers: {
                "access-control-allow-origin": "*",
                "cache-control": "public, max-age=0"
            },
        },
        externals: powerbiApi.version.replace(/\./g,"") >= 320 ? 
        {
        	"powerbi-visuals-api": 'null',
        	"fakeDefine": 'false',
        } :
        {
        	"powerbi-visuals-api": 'null',
        	"fakeDefine": 'false',
        	"corePowerbiObject": "Function('return this.powerbi')()",
        	"realWindow": "Function('return this')()"
        },
        plugins: [
            new MiniCssExtractPlugin({
                filename: "visual.css",
                chunkFilename: "[id].css"
            }),
            new Visualizer({
                reportFilename: statsLocation,
                openAnalyzer: false,
                analyzerMode: `static`
            }),
            // visual plugin regenerates with the visual source, but it does not require relaunching dev server
		    new webpack.WatchIgnorePlugin({
				paths: [
					path.join(__dirname, pluginLocation),
					"./.tmp/**/*.*"
				]
			}),
            // custom visuals plugin instance with options
            new PowerBICustomVisualsWebpackPlugin({
                ...pbivizFile,
                capabilities: capabilitiesFile,
                stringResources: localizationFolders && localizationFolders.map(localization => path.join(
                    resourcesFolder,
                    localization,
                    "resources.resjson"
                )),
                apiVersion: powerbiApi.version,
                capabilitiesSchema: powerbiApi.schemas.capabilities,
                pbivizSchema: powerbiApi.schemas.pbiviz,
                stringResourcesSchema: powerbiApi.schemas.stringResources,
                dependenciesSchema: powerbiApi.schemas.dependencies,
                devMode: false,
                generatePbiviz: true,
                generateResources: true,
                modules: true,
                visualSourceLocation: "../../src/visual",
                pluginLocation: pluginLocation,
                packageOutPath: path.join(__dirname, "dist")
            }),
            new ExtraWatchWebpackPlugin({
                files: [
                    pbivizPath,
                    capabilitiesPath
                ]
            }),
            powerbiApi.version.replace(/\./g,"") >= 320 ? 
        	new webpack.ProvidePlugin({
            	define: 'fakeDefine',
        	}) : 
        	new webpack.ProvidePlugin({
            	window: 'realWindow',
            	define: 'fakeDefine',
            	powerbi: 'corePowerbiObject'
        	})
        ]
    };
    ```

6. Add new script to build a visual package

    Add new command `"package": "webpack"` into `scripts` section of `package.json`:

    ```json
    "scripts": {
        "cert": "pbiviz --install-cert",
        "package": "webpack"
    }
    ```

    Run `npm run package` command to create visual package.

## Add webpack-dev-server package to debug custom visual

Install webpack-dev-server:

```cmd
npm i webpack-dev-server --save-dev
```

Add command `"start": "webpack serve"` into `scripts` section of `package.json` :

```json
"scripts": {
    "cert": "pbiviz --install-cert",
    "package": "webpack",
    "start": "webpack serve"
}
```

Run command `npm run start` to start dev server.

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit [https://cla.microsoft.com](https://cla.microsoft.com).

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
