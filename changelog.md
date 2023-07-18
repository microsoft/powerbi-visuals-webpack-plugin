# Change Log - PowerBI visual webpack plugin

This page contains information about changes to the **PowerBI-visuals-webpack-plugin**.

## 4.0.2

* Updated ReadMe
* Removed redundant options

## 4.0.1

* Fixed error when creating new visual plugin
* Updated packages

## 4.0.0

* Implemented localization loader to reduce size of locales in custom visual

## 3.2.1

* update visual plugin template to support TS strict mode 

## 3.2.0

* Fixed broken minification in pbiviz.json
* Updated packages

### **⚠ Breaking Chages**
* Now `pbiviz.json` is not a webpack asset
* **eExternalJS** and **cssStyles** options are **deprecated**

## 3.1.2

* Fixed bug when css asset wasn't generated

## 3.1.1

* Fixed double webpack compilation
* Removed non-personal environment logging
* Updated deprecated methods

## 3.0.0

* Refactored assets compilation due to latest webpack rules
* Added non-personal environment logging

## 2.3.1

* Fixed plugin template for visuals with `powerbi-visuals-api < 3.8.0`

## 2.3.0

* Added support for CV modal dialog

## 2.2.6

* Removed `lodash.template` usage;

## 2.2.4

* Fix VisualPlugin template: convert to required parameter

## 2.2.3

* Plugin adds tools version into visual package

## 2.2.2

* Fix generating visual plugin folder and dist folder on build
* Update webpack configuration sample

## 2.2.1

* Fix VisualPlugin template.

## 2.2.0

* Update VisualPlugin template. Remove no implicit Any types to allow 'noImplicitAny' configuration in tsconfig.

## 2.1.4

* Lodash was substituted by certain packages for deepClone() and template() functions

## 2.1.3

* Adding support for Python script visuals
* Fixing logic for replacing source files in scripts

## 2.1.2

* Fix loading R script into visuals

## 2.1.1

* The new visualPlugin template with default export of visualPlugin object

## 2.1.0

* Compression option for compressing visual package

## 2.0.1

* Define `powerbi` variable if it was not defined in `window` object.
* Log in console JSON validation fails.

## 2.0.0

* Update visual template.

    Note: `window` object injection required;
* The plugin clears `drop` folder - fixed.

## 1.x.x

* PowerBI Custom Visuals webpack plugin release. Fix bugs
