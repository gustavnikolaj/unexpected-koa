var expect = require('unexpected');
var unexpectedKoa = require('../');

describe('unexpected-koa', function () {
    it('should export an unexpected plugin', function () {
        return expect(unexpectedKoa, 'to satisfy', {
            name: 'unexpected-koa',
            version: /^\d+\.\d+\.\d+$/,
            installInto: expect.it('to be a function')
        });
    });
});
