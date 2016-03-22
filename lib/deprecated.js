/* eslint no-console: 0 */

var _ = require('lodash');

var warnings = {
	methods: {}
};

function depricatedMethod(name, className, useName) {
	if (!warnings.methods[name + className + useName]) {
		warnings.methods[name + className + useName] = _.once(function warnOnce() {
			var log = (console.warn || console.log || _.noop).bind(console);
			log(className + '.' + name + ' is depricated, use `' + className + '.' + useName + '` instead');
		});
	}
	warnings.methods[name + className + useName]();
}

module.exports = {
	method: depricatedMethod
};
