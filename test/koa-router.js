const expect = require('unexpected')
    .clone()
    .use(require('../'));
const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');

const app = (() => {
    var app = new Koa();
    var router = Router();

    router.get('/', async ctx => {
        ctx.body = 'GET index route';
    });

    router.post('/uppercase', async ctx => {
        const payload = ctx.request.body.payload;
        ctx.body = payload.toUpperCase();
    });

    app
        .use(bodyParser())
        .use(router.routes())
        .use(router.allowedMethods());

    return app;
})();

describe('koa-router', function () {
    it('should serve the index GET route', function () {
        return expect(app, 'to yield exchange', {
            request: 'GET /',
            response: 'GET index route'
        });
    });
    it('should handle POST', function () {
        return expect(app, 'to yield exchange', {
            request: {
                url: '/uppercase',
                method: 'POST',
                body: {
                    payload: 'foo'
                }
            },
            response: 'FOO'
        });
    });
});
