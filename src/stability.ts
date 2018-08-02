import * as _ from 'lodash';

const warnings = {
	experimental: {},
	deprecated: {},
};

function experimentalMethod(methodName, className) {
	if (!warnings.experimental[methodName + className]) {
		warnings.experimental[methodName + className] = _.once(function warnOnce() {
			// tslint:disable-next-line:no-console
			const log = (console.warn || console.log || _.noop).bind(console);
			log('Method ' + className + '.' + methodName + ' is experimental, use with caution.');
		});
	}
	warnings.experimental[methodName + className]();
}

function deprecatedMethod(methodName, className, useName) {
	if (!warnings.deprecated[methodName + className + useName]) {
		warnings.deprecated[methodName + className + useName] = _.once(function warnOnce() {
			// tslint:disable-next-line:no-console
			const log = (console.warn || console.log || _.noop).bind(console);
			log('Method ' + className + '.' + methodName + ' is deprecated, use `' + className + '.' + useName + '` instead');
		});
	}
	warnings.deprecated[methodName + className + useName]();
}

export default {
	deprecated: { method: deprecatedMethod },
	experimental: { method: experimentalMethod },
};
