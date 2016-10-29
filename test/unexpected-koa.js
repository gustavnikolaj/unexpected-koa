const Koa = require('koa');
var expect = require('unexpected');
var unexpectedKoa = require('../');

describe('unexpected-koa', function () {
    it('async functions', function () {
        return (async function () {});
    });

    it('should export an unexpected plugin', function () {
        return expect(unexpectedKoa, 'to satisfy', {
            name: 'unexpected-koa',
            version: /^\d+\.\d+\.\d+$/,
            installInto: expect.it('to be a function')
        });
    });

    describe('to yield exchange', function () {
        before(function () {
            expect = expect
                .clone()
                .use(unexpectedKoa);
        });

        it('with a koa app', function () {
            const app = new Koa();

            app.use(async ctx => {
                ctx.body = 'foobar';
            });

            return expect(app, 'to yield exchange', {
                request: 'GET /',
                response: 'foobar'
            });
        });

        it('just a handler', function () {
            return expect(async ctx => {
                ctx.body = 'foobar';
            }, 'to yield exchange', {
                request: 'GET /',
                response: 'foobar'
            });
        });
    });
});
