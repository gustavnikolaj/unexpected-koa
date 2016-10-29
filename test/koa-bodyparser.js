const expect = require('unexpected')
    .clone()
    .use(require('../'));
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');

const app = (() => {
    var app = new Koa();
    app
        .use(bodyParser())
        .use(async ctx => ctx.body = ctx.request.body);

    return app;
})();

describe('koa-bodyparser', function () {
    it('should be able to parse a json body', function () {
        return expect(app, 'to yield exchange', {
            request: {
                url: 'POST /',
                body: {
                    foo: 'bar'
                }
            },
            response: {
                body: {
                    foo: 'bar'
                }
            }
        });
    });
});
