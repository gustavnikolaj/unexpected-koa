const expect = require('unexpected')
    .clone()
    .use(require('../'));
const Koa = require('koa');
const mount = require('koa-mount');

const app = (() => {
    var app = new Koa();
    var nestedApp = new Koa();

    nestedApp.use(async ctx => ctx.body = 'mounted app');

    app.use(mount('/foo', nestedApp));

    return app;
})();

describe('koa-mount', function () {
    it('should serve the mounted app', function () {
        return expect(app, 'to yield exchange', {
            request: 'GET /foo',
            response: 'mounted app'
        });
    });
    it('should 404', function () {
        return expect(app, 'to yield exchange', {
            request: 'GET /',
            response: 404
        });
    });
});
