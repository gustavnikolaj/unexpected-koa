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

    it('should add parameters from the query option to the url', function () {
        return expect(async ctx => {
            ctx.body = ctx.url;
        }, 'to yield exchange', {
            request: {
                url: '/foo',
                query: {
                    bar: 'heyæøå',
                    baz: ['blah', 'yeah']
                }
            },
            response: '/foo?bar=hey%C3%A6%C3%B8%C3%A5&baz=blah&baz=yeah'
        });
    });
});
