#! /usr/bin/env node
'use strict';

let co = require('co');
let thunkify = require('thunkify');
let uuid = require('node-uuid');
let redis = require('redis');
let client = redis.createClient();
client.keys = thunkify(client.keys);
client.lrange = thunkify(client.lrange);
client.rpush = thunkify(client.rpush);
client.del = thunkify(client.del);

co(function *() {
    let frontends = yield client.keys('frontend:*');
    let apps = yield frontends.map(function (frontend) {
        return client.lrange(frontend, 0, -1);
    });
    yield frontends.map(function (frontend, index) {
        return [
            client.del(frontend),
            // push identifier
            client.rpush(frontend, uuid.v4()),
            // push backend list
            apps[index].slice(1).map(function (backend) {
                return client.rpush(frontend, backend);
            }),
        ];
    });
}).then(function() {
    console.log(arguments);
}, function(err) {
    console.log(err.stack);
});
