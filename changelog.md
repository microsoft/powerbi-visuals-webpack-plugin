# 2.3.1
* Fixed plugin template for visuals with `powerbi-visuals-api < 3.8.0`

# 2.3.0
* Added support for CV modal dialog

# 2.2.6
* Removed `lodash.template` usage;

# 2.2.4
* Fix VisualPlugin template: convert to required parameter

# 2.2.3
* Plugin adds tools version into visual package

# 2.2.2
* Fix generating visual plugin folder and dist folder on build
* Update webpack configuration sample

# 2.2.1
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