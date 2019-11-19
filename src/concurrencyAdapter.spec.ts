import axios from 'axios';
import { AnxApi } from './api';

jest.mock('axios');
const axiosMock: jest.Mock = axios as any;

describe('Concurrency Adapter', () => {
	afterEach(() => {
		axiosMock.mockReset();
	});

	it('should handle a concurrency of 1', () => {
		axiosMock.mockReturnValueOnce(
			new Promise((resolve) => {
				const id = 'call1';
				setTimeout(() => {
					resolve({
						headers: { myHeader: id },
						status: 200,
						data: { id },
					});
				}, 1000);
			}),
		);

		axiosMock.mockReturnValueOnce(
			new Promise((resolve) => {
				const id = 'call2';
				setTimeout(() => {
					resolve({
						headers: { myHeader: id },
						status: 200,
						data: { id },
					});
				}, 1);
			}),
		);

		const api = new AnxApi({
			target: 'http://api.example.com',
			rateLimiting: false,
			concurrencyLimit: 1,
			userAgent: 'concurrency',
		});

		expect.assertions(4);

		return Promise.all([api.get('/limit'), api.get('/limit2')]).then(([res1, res2]) => {
			expect(res1.body).toEqual({ id: 'call1' });
			expect(res2.body).toEqual({ id: 'call2' });

			expect(axiosMock).toBeCalledWith({
				headers: {
					Accept: 'application/json',
					'User-Agent': 'concurrency',
				},
				method: 'GET',
				timeout: 60000,
				url: 'http://api.example.com/limit',
			});

			expect(axiosMock).toBeCalledWith({
				headers: {
					Accept: 'application/json',
					'User-Agent': 'concurrency',
				},
				method: 'GET',
				timeout: 60000,
				url: 'http://api.example.com/limit2',
			});
		});
	});

	it('should handle a concurrency of 1 with the first request failing', () => {
		axiosMock.mockReturnValueOnce(
			new Promise((_resolve, reject) => {
				const id = 'call1';
				setTimeout(() => {
					reject(new Error(id));
				}, 1000);
			}),
		);

		axiosMock.mockReturnValueOnce(
			new Promise((resolve) => {
				const id = 'call2';
				setTimeout(() => {
					resolve({
						headers: { myHeader: id },
						status: 200,
						data: { id },
					});
				}, 1);
			}),
		);

		const api = new AnxApi({
			target: 'http://api.example.com',
			rateLimiting: false,
			concurrencyLimit: 1,
			userAgent: 'concurrency',
		});

		expect.assertions(4);

		return Promise.all([
			api.get('/limit').catch((err) => {
				expect(err.message).toEqual('call1');

				expect(axiosMock).toBeCalledWith({
					headers: {
						Accept: 'application/json',
						'User-Agent': 'concurrency',
					},
					method: 'GET',
					timeout: 60000,
					url: 'http://api.example.com/limit',
				});
			}),
			api.get('/limit2').then((res2) => {
				expect(res2.body).toEqual({ id: 'call2' });

				expect(axiosMock).toBeCalledWith({
					headers: {
						Accept: 'application/json',
						'User-Agent': 'concurrency',
					},
					method: 'GET',
					timeout: 60000,
					url: 'http://api.example.com/limit2',
				});
			}),
		]);
	});
});
