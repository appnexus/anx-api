var axios = require('axios');

var axiosMock = jest.spyOn(axios, 'default');

axiosMock.resolvesOnce = function(returnValue) {
	axiosMock.mockReturnValueOnce(Promise.resolve(returnValue));
	return axiosMock;
};

module.exports = axiosMock;
