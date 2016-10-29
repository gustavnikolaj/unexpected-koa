const Koa = require('koa');
const messy = require('messy');
const http = require('http');
const stream = require('stream');
const _ = require('lodash');

const responsePropertyNames = messy.HttpResponse.propertyNames;

function hasKeys(x) {
    return Object.keys(x).length > 0;
}

function validateResponseProperties(x) {
    return _.intersection(Object.keys(x), responsePropertyNames).length > 0;
}

module.exports = {
    name: 'unexpected-koa',
    version: require('../package.json').version,
    installInto: function (expect) {
        expect.use(require('unexpected-messy'));

        expect.addType({
            name: 'IncomingMessage',
            base: 'object',
            identify: function (obj) {
                return obj && obj.constructor && obj.constructor.name === 'IncomingMessage';
            },
            inspect: function (obj, depth, output) {
                output.text(obj.constructor.name, 'jsFunctionName');
            }
        });

        expect.addAssertion('<any> to yield exchange <object>', function (expect, subject, value) {
            if (typeof subject !== 'function' && !(subject) instanceof Koa) {
                console.log('subject must be either a function or Koa');
            }

            value = Object.assign({}, value);
            let app = subject;

            if (!(app instanceof Koa)) {
                app = new Koa();
                app.use(subject);
            }

            const context = {};
            const requestHandler = app.callback();

            value = _.extend({}, value);
            var requestProperties = typeof value.request === 'string' ? {url: value.request} : _.extend({}, value.request),
                requestBody = requestProperties.body,
                httpRequest = new messy.HttpRequest({
                    method: requestProperties.method,
                    url: requestProperties.url || '/',
                    protocolName: 'HTTP',
                    protocolVersion: requestProperties.httpVersion || '1.1',
                    headers: requestProperties.headers,
                    unchunkedBody: requestProperties.unchunkedBody,
                    rawBody: requestProperties.rawBody
                });

            function updateHttpRequestBody(requestBody) {
                if (Buffer.isBuffer(requestBody)) {
                    httpRequest.unchunkedBody = requestBody;
                } else {
                    // string or non-Buffer object (implies JSON)
                    httpRequest.body = requestBody;
                }
            }

            if (typeof requestBody !== 'undefined') {
                updateHttpRequestBody(requestBody);
            } else if ('unchunkedBody' in requestProperties || 'rawBody' in requestProperties) {
                requestBody = httpRequest.body;
            }

            delete value.request;
            delete requestProperties.method;
            delete requestProperties.url;
            delete requestProperties.httpVersion;
            delete requestProperties.headers;
            delete requestProperties.body;
            delete requestProperties.unchunkedBody;
            delete requestProperties.rawBody;
            httpRequest.method = httpRequest.method || 'GET';
            if (httpRequest.encrypted && typeof requestProperties.https === 'undefined') {
                // Warn if conflicting?
                requestProperties.https = true;
            }
            if (requestProperties.formData) {
                if (requestBody) {
                    throw new Error('unexpected-express: The "body" and "formData" options are not supported together');
                }
                requestBody = new FormData();
                Object.keys(requestProperties.formData).forEach(function (name) {
                    var value = requestProperties.formData[name],
                        options;
                    if (typeof value === 'object' && !Buffer.isBuffer(value)) {
                        options = _.extend({}, value);
                        value = options.value;
                        delete options.value;
                        if (options.fileName) {
                            options.filename = options.fileName;
                            delete options.fileName;
                        }
                    }
                    requestBody.append(name, value, options);
                });

                delete requestProperties.formData;
            }

            if (typeof requestProperties.query !== 'undefined') {
                if (typeof requestProperties.query === 'object' && requestProperties.query) {
                    Object.keys(requestProperties.query).forEach(function (parameterName) {
                        var valueOrValues = requestProperties.query[parameterName];
                        (Array.isArray(valueOrValues) ? valueOrValues : [String(valueOrValues)]).forEach(function (value) {
                            httpRequest.url += (httpRequest.url.indexOf('?') === -1 ? '?' : '&') +
                                encodeURIComponent(parameterName) + '=' + encodeURIComponent(value);
                        });
                    });
                } else {
                    httpRequest.url += (httpRequest.url.indexOf('?') === -1 ? '?' : '&') + String(requestProperties.query);
                }
                delete requestProperties.query;
            }

            var responseProperties = value.response;
            delete value.response;
            var expectedResponseProperties;

            if (typeof responseProperties === 'number') {
                expectedResponseProperties = {statusCode: responseProperties};
            } else if (typeof responseProperties === 'string' || Buffer.isBuffer(responseProperties)) {
                expectedResponseProperties = {body: responseProperties};
            } else if (Array.isArray(responseProperties)) {
                throw new Error('unexpected-express: Response object must be a number, string, buffer or object.');
            } else {
                if (responseProperties && hasKeys(responseProperties) && !validateResponseProperties(responseProperties)) {
                    throw new Error('unexpected-express: Response object specification incomplete.');
                }

                expectedResponseProperties = _.extend({}, responseProperties);
            }

            var missingResponseProperties = Object.keys(expectedResponseProperties).filter(function (key) {
                return responsePropertyNames.indexOf(key) === -1;
            });
            if (missingResponseProperties.length > 0) {
                throw new Error('Property "' + missingResponseProperties[0] + '" does not exist on the response object.');
            }

            var req = new http.IncomingMessage({});

            if (typeof requestBody !== 'undefined') {
                httpRequest.headers.set('Transfer-Encoding', 'chunked');
                if (requestBody.pipe) {
                    if (requestBody.constructor && requestBody.constructor.name === 'FormData') {
                        if (!httpRequest.headers.has('Content-Type')) {
                            httpRequest.headers.set('Content-Type', 'multipart/form-data; boundary=' + requestBody.getBoundary());
                            // form-data pauses its streams by default for some reason:
                            setImmediate(function () {
                                requestBody.resume();
                            });
                        }
                    }
                    var requestBodyChunks = [];
                    requestBody.on('data', function (chunk) {
                        if (!Buffer.isBuffer(chunk)) {
                            chunk = new Buffer(chunk, 'utf-8');
                        }
                        requestBodyChunks.push(chunk);
                        req.push(chunk);
                    }).on('end', function () {
                        updateHttpRequestBody(Buffer.concat(requestBodyChunks));
                        req.push(null);
                    }).on('error', function (err) {
                        req.emit('error', err);
                    });
                } else {
                    if (typeof requestBody === 'object' && !Buffer.isBuffer(requestBody)) {
                        if (!httpRequest.headers.has('Content-Type')) {
                            httpRequest.headers.set('Content-Type', 'application/json');
                        }
                    }

                    if (!httpRequest.headers.has('Content-Length') && !httpRequest.headers.has('Transfer-Encoding')) {
                        httpRequest.headers.set('Content-Length', String(requestBody.length));
                    }
                    setImmediate(function () {
                        // To work around nodejs v0.10.x issue with old-style streams, see also https://github.com/stream-utils/raw-body/pull/34
                        req.push(httpRequest.unchunkedBody);
                        req.push(null);
                    });
                }
            } else {
                req.push(null);
            }

            req.httpVersion = httpRequest.protocolVersion;
            var matchProtocolVersion = String(httpRequest.protocolVersion).match(/^(\d+)(?:\.(\d+))$/);
            if (matchProtocolVersion) {
                req.httpVersionMajor = parseInt(matchProtocolVersion[1], 10);
                req.httpVersionMinor = matchProtocolVersion[2] ? parseInt(matchProtocolVersion[2], 10) : 0;
            }
            req.connection.encrypted = !!requestProperties.https;
            delete requestProperties.https;
            req.connection.remoteAddress = requestProperties.remoteAddress || requestProperties.ip || '127.0.0.1';
            delete requestProperties.ip;
            delete requestProperties.remoteAddress;
            req.headers = {};
            httpRequest.headers.getNames().forEach(function (headerName) {
                var headerNameLowerCase = headerName.toLowerCase();
                if (headerNameLowerCase === 'set-cookie') {
                    req.headers[headerNameLowerCase] = [].concat(httpRequest.headers.getAll(headerName));
                } else {
                    req.headers[headerNameLowerCase] = httpRequest.headers.getAll(headerName).join(', ');
                }
            });
            req.method = httpRequest.method;
            req.url = httpRequest.requestLine.url;
            _.extend(req, requestProperties);

            var res = new http.ServerResponse(req);

            var rawResponseChunks = [];
            res.assignSocket(new stream.Writable());
            res.connection._write = function (chunk, encoding, cb) {
                rawResponseChunks.push(chunk);
                cb();
            };

            return expect.promise(function (resolve, reject) {
                ['write', 'end', 'destroy'].forEach(function (methodName) {
                    var orig = res[methodName];
                    res[methodName] = function (chunk, encoding) {
                        var returnValue = orig.apply(this, arguments);
                        if (methodName === 'end' || methodName === 'destroy') {
                            resolve();
                        }
                        // Don't attempt to implement backpressure, since we're buffering the entire response anyway.
                        if (methodName !== 'write') {
                            return returnValue;
                        }
                    };
                });

                requestHandler(req, res);
                req.push(null);
            }).then(() => {
                Object.assign(context, {
                    req: req,
                    res: res,
                    httpRequest: httpRequest
                });

                var httpResponse = context.httpResponse = new messy.HttpResponse(
                    rawResponseChunks.length > 0 ? Buffer.concat(rawResponseChunks) : res._header
                );
                if (typeof httpResponse.rawBody === 'undefined') {
                    httpResponse.rawBody = new Buffer(0);
                }
                httpResponse.statusCode = httpResponse.statusCode || res.statusCode;

                context.httpExchange = new messy.HttpExchange({
                    request: context.httpRequest,
                    response: context.httpResponse
                });

                return expect(context.httpExchange, 'to satisfy', {
                    response: expectedResponseProperties
                }).then(() => context);
            });
        });
    }
};
