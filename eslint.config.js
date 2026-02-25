const js = require("@eslint/js");
const n = require("eslint-plugin-n");
const prettierPlugin = require("eslint-plugin-prettier");
const prettierConfig = require("eslint-config-prettier");

module.exports = [
	js.configs.recommended,
	n.configs["flat/recommended-script"],
	{
		plugins: {
			prettier: prettierPlugin,
			n,
		},

		languageOptions: {
			ecmaVersion: 2021,
			sourceType: "script",
		},

		rules: {
			...prettierConfig.rules,
			"prettier/prettier": "error",
			"no-undef": "error",
			"no-extra-semi": "error",
			"no-template-curly-in-string": "error",
			"no-caller": "error",
			"no-control-regex": "off",
			"no-async-promise-executor": "off",
			yoda: "error",
			eqeqeq: "error",
			"brace-style": "off",
			"eol-last": "error",
			"no-extra-bind": "warn",
			"no-use-before-define": "off",
			"no-unused-vars": ["error", { args: "none" }],
			"no-unsafe-negation": "error",
			"no-loop-func": "warn",
			indent: "off",
			"no-console": "off",
			"n/global-require": "off",
			"n/no-process-exit": "error",
			"n/no-unsupported-features/es-syntax": "error",
			"n/no-deprecated-api": "error",
			"n/no-missing-import": "error",
			"n/no-unpublished-bin": "error",
			"n/no-unpublished-require": "error",
			"n/process-exit-as-throw": "error",
		},
	},
	{
		files: ["src/**/*.js"],
		languageOptions: {
			sourceType: "module",
			ecmaVersion: 2021,
		},
	},
	{
		files: ["eslint.config.js", "**/*.config.js", "**/*.config.cjs"],
		rules: {
			"n/no-unpublished-require": "off",
			"n/no-unpublished-import": "off",
		},
	},
];
