import * as _ from 'lodash';

const warnings = {
	experimental: {},
	deprecated: {},
};

export const experimentalMethod = (methodName: string, className: string): void => {
	if (!warnings.experimental[methodName + className]) {
		warnings.experimental[methodName + className] = _.once(() => {
			// tslint:disable-next-line:no-console
			const log = (console.warn || console.log || _.noop).bind(console);
			log(`Method ${className}.${methodName} is experimental, use with caution.`);
		});
	}
	warnings.experimental[methodName + className]();
};

export const deprecatedMethod = (methodName: string, className: string, useName: string): void => {
	if (!warnings.deprecated[methodName + className + useName]) {
		warnings.deprecated[methodName + className + useName] = _.once(() => {
			// tslint:disable-next-line:no-console
			const log = (console.warn || console.log || _.noop).bind(console);
			log(`Method ${className}.${methodName} is deprecated, use ${className}.${useName} instead.`);
		});
	}
	warnings.deprecated[methodName + className + useName]();
};
