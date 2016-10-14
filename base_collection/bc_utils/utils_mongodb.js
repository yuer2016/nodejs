/// <reference path="../../typings/node/node.d.ts"/>
/// <reference path="../../typings/async/async.d.ts"/>
/// <reference path="../../typings/redis/redis.d.ts"/>
/// <reference path="../../typings/mysql/mysql.d.ts"/>
'use strict';
var mongodb = require('mongodb');
var genericPool = require('generic-pool');

var configUtils = require('./utils_config.js');
var mongodbConfig = configUtils.mongodb;

var pool = genericPool.Pool({
    name: 'mongodb',
    create: function(callback) {
        var server_options = {
            'auto_reconnect': false,
            poolSize: 1
        };
        var db_options = {
            w: 1
        };
        var mongoserver = new mongodb.Server(mongodbConfig.dbip, mongodbConfig.dbport, server_options);
        var db = new mongodb.Db(mongodbConfig.dbname, mongoserver, db_options);
        db.open(function(err, db) {
            if (err){
                return callback(err);
            } 
            callback(null, db);
        });
    },
    destroy: function(db) {
        db.close();
    },
    max: 10,
    idleTimeoutMillis: 30000,
    log: false
});

var mongodbClient = {
    insertData:function(collname,json,callback) {
        pool.acquire(function (err,client) {
            if(err){
                console.log('install mongodb err: ', err);
            }else{
                client.collection(collname).insert(json, function(err, result) {
                if (err){
                    console.log('collection err :', err);
                    pool.release(client);
                }
                callback(result);
                pool.release(client);
             });
          }
        });
    }
}

module.exports = mongodbClient;
