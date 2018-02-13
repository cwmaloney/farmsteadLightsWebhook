// http://eslint.org/docs/user-guide/configuring

module.exports = {
  root: true,
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 8,
    ecmaFeatures: { "experimentalObjectRestSpread": true },
    sourceType: 'module'
  },

  env: {
    browser: true,
    commonjs: true,
    es6: true
  },

  extends: "eslint:recommended",

  // html plugin required to lint *.vue files
  // plugins: [ 'html' ],

  // custom rules
  rules: {
    "no-console" : "off",

    // allow paren-less arrow functions
    "arrow-parens": "off",

    // allow async-await
    "generator-star-spacing": "off",

    // allow debugger during development
    "no-debugger": process.env.NODE_ENV === 'production' ? "error" : "off",

    // allow semicolors
    "semi": "off",

    // no space before function parenthesis
    "space-before-function-paren": "off",

    "quotes": "off",

    "padded-blocks": "off",

    "no-unused-vars": [ "error", { "vars": "local", "args": "none" } ]
  }
};
