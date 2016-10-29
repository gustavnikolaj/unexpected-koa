# Unexpected Koa

[![Build Status](https://travis-ci.org/gustavnikolaj/unexpected-koa.svg?branch=master)](https://travis-ci.org/gustavnikolaj/unexpected-koa)

Plugin for [unexpected](http://unexpected.js.org) that makes it easy to test
[koa](https://github.com/koajs/koa) applications.

The plugin is adapted from
[unexpected-express](https://github.com/unexpectedjs/unexpected-express).

The plugin had been tested against koa v2 both when the async functions are
transpiled to regenerator using babel and when running with async function
support enabled in node.js 7.
