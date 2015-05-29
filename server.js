#! /usr/bin/env node
'use strict';

let application = require('koa')();
let qs = require('koa-qs');
let bodyParser = require('koa-bodyparser');
let route = require('koa-route');
let thunkify = require('thunkify');
let uuid = require('node-uuid');
let redis = require('redis');
let client = redis.createClient();
client.keys = thunkify(client.keys);
client.lrange = thunkify(client.lrange);
client.rpush = thunkify(client.rpush);
client.del = thunkify(client.del);

qs(application);
application.use(bodyParser());
application.use(require('koa-static')('public'));

application.use(route.get('/app', list));
application.use(route.get('/app/:id', get));
application.use(route.post('/app', add));
application.use(route.put('/app/:id', update));
application.use(route.del('/app/:id', del));

function *list () {
    let apps = yield findAll();
    this.set('X-Total-Count', apps.length);
    this.body = apps.slice(this.query._start, this.query._end);
}

function * get (id) {
    this.body = yield find(id);
}

function * add() {
    this.body = yield create(this.request.body);
}

function * update (id) {
    // remove old app
    let old = yield find(id);
    yield client.del(old.frontend);

    this.body = yield create(this.request.body);
}

function * del (id) {
    let app = yield find(id);
    this.body = yield client.del(app.frontend);
}

// id, frontend, backends
function * findAll () {
    let frontends = yield client.keys('frontend:*');
    let apps = yield frontends.map(function (frontend) {
        return client.lrange(frontend, 0, -1);
    });
    return frontends.map(function (frontend, index) {
        return {
            id: apps[index][0],
            frontend: frontend,
            backends: apps[index].slice(1),
        };
    });
}

// find app by identifier
function * find (id) {
    let apps = yield findAll();
    let app;
    apps.some(function (item, index) {
        if (item.id === id) {
            app = item;
            return true;
        }
    }, this);
    return app;
}

function * create (app) {
    let id = uuid.v4();
    app.frontend = `frontend:${app.frontend}`;
    app.backends = app.backends.split(',')
        .map(function(s){return s.trim();})
        .filter(function(s){return s;});
    yield client.rpush(app.frontend, id);
    yield app.backends.map(function (backend) {
        return client.rpush(app.frontend, backend);
    });
    return yield find(id);
}

let port = 3000;
application.listen(port);
console.log(`Listen ${port}`);
