var expect = require('unexpected')
    .clone()
    .use(require('../'));

describe('unexpected-koa', function () {
    describe('request headers', function () {
        it('should set an accept header', function () {
            return expect(async ctx => {
                ctx.status = 201;
                ctx.body = {
                    requestHeaders: Object.assign({}, ctx.request.headers)
                };
            }, 'to yield exchange', {
                request: {
                    url: 'GET /',
                    headers: {
                        Accept: 'application/json'
                    }
                },
                response: {
                    statusCode: 201,
                    body: {
                        requestHeaders: {
                            accept: 'application/json'
                        }
                    }
                }
            });
        });
    });
});
