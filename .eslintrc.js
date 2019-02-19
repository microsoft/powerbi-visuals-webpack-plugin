module.exports = {
	root: true,
	plugins: ["prettier", "node"],
	extends: [
		"eslint:recommended",
		"plugin:node/recommended",
		"plugin:prettier/recommended"
	],
	env: {
		node: true
	},
	parserOptions: {
		ecmaVersion: 8
	},
	rules: {
		"prettier/prettier": "error",
		"no-undef": "error",
		"no-extra-semi": "error",
		"no-template-curly-in-string": "error",
		"no-caller": "error",
		"no-control-regex": "off",
		yoda: "error",
		eqeqeq: "error",
		"global-require": "off",
		"brace-style": "off",
		"eol-last": "error",
		"no-extra-bind": "warn",
		"no-process-exit": "warn",
		"no-use-before-define": "off",
		"no-unused-vars": [
			"error",
			{
				args: "none"
			}
		],
		"no-unsafe-negation": "error",
		"no-loop-func": "warn",
		indent: "off",
		"no-console": "off",
		"valid-jsdoc": [
			"error",
			{
				prefer: {
					return: "returns",
					prop: "property",
					memberof: "DONTUSE",
					class: "DONTUSE",
					inheritdoc: "DONTUSE",
					description: "DONTUSE",
					readonly: "DONTUSE"
				},
				preferType: {
					"*": "any"
				},
				requireReturnType: true
			}
		],
		"node/no-unsupported-features": "error",
		"node/no-deprecated-api": "error",
		"node/no-missing-import": "error",
		"node/no-unpublished-bin": "error",
		"node/no-unpublished-require": "error",
		"node/process-exit-as-throw": "error"
	}
};
