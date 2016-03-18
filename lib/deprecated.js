/* eslint no-console: 0 */

var _ = require('lodash');

var warnings = {
	methods: {}
};

function depricatedMethod(name, className, useName) {
	if (!warnings.methods[name + className + useName]) {
		warnings.methods[name + className + useName] = _.once(function warnOnce() {
			(console.warn || console.log || function log() {})(className + '.' + name + ' is depricated method, use `' + useName + '` instead');
		});
	}
	warnings.methods[name + className + useName]();
}

module.exports = {
	method: depricatedMethod
};
