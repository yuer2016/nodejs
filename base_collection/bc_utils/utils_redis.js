/// <reference path="../../typings/node/node.d.ts"/>
/// <reference path="../../typings/async/async.d.ts"/>
/// <reference path="../../typings/redis/redis.d.ts"/>
/// <reference path="../../typings/mysql/mysql.d.ts"/>
'use strict';

var redis = require('redis');

var configUtils = require('./utils_config.js');
var redisConfig = configUtils.baseredis;

var redisClient = {
    openClient:function() {
        var client = redis.createClient(redisConfig.port,redisConfig.address,{"no_ready_check": true});
        //client.auth("Lpfcg123");
        client.on('error', function(err) {
            console.error('error: ' + err);
        });
        return client;
    },
    expireRedis:function(key, second, callback) {
        var client = this.openClient();
        client.expire(key, second , function(err, reply) {
            if (err){
                console.error('get error:' + err);
            }
            client.quit();
            callback.call(null, err, reply);
        });
    },

    existsRedis:function(key, callback) {
        var client = this.openClient();
        client.exists(key, function(err, reply) {
            if (err){
                console.error('get error:' + err);
            } 
            client.quit();
            callback.call(null, err, reply);
        });
    },

    getRedis:function(key, callback) {
        var client = this.openClient();
        client.get(key, function(err, reply) {
            if (err){
                console.error('get error:' + err);
            }
            client.quit();
            callback.call(null, err, reply);
        });
   },

   setRedis:function( key, val, callback) {
        var client = this.openClient();
        client.set(key, val, function(err, reply) {
            if (err){
                console.error('get error:' + err);
            }
            console.log('set [' + key + ']:[' + val + '] reply is:' + reply);
            client.quit();
            callback.call(null, err, reply);
        });
    },

    rPopRedis:function( key, callback) {
        var client = this.openClient();
        client.rpop(key, function(err, reply) {
            if (err){
                console.error('rpop error:' , err);
            }
            client.quit();
            callback.call(null, err, reply);
        });
    },
    
    lPushRedis:function( key, val, callback) {
        var client = this.openClient();
        client.lpush(key, val, function(err, reply) {
            if (err){
                console.error('lpush error:' , err);
            }
            client.quit();
            callback.call(null, err, reply);
        });
    },

    lLenRedis : function( key, callback) {
        var client = this.openClient();
        client.llen(key, function(err, reply) {
            if (err){
                console.error('rpop error:' , err);
            }
            client.quit();
            callback.call(null, err, reply);
        });
    },

    hgetRedis : function( hashkey, key, callback) {
        var client = this.openClient();
        client.hget(hashkey, key, function(err, reply) {
            if (err){
                 console.error('hget error:' , err);
            }
            client.quit();
            callback.call(null, err, reply);
        });
        
    },

    hgetallRedis:function(hashkey, callback) {
        var client = this.openClient();
        client.hgetall(hashkey, function(err, reply) {
            if (err){
                console.error('hget error:' + err);
            }
            client.quit();
            callback.call(null, err, reply);
        });
    },

   hsetRedis:function(hashkey, key, val, callback) {
        var client = this.openClient();
        client.hset(hashkey, key, val, function(err, reply) {
            if (err){
                console.error('hset ' + key + 'error: ' + err);
            }  
            console.log('hset [' + key + ']:[' + val + '] reply is:' + reply);
            client.quit();

            callback.call(null, err, reply);
        });
    },

    hincrRedis:function( key, field, callback) {
        var client = this.openClient();
        console.log("incr " + key + " " + field);
        client.hincrby(key, field, 1, function(err, reply) {
            if (err){
                console.error('hincrby error:' + err);
            }
            client.quit();
            callback.call(null, err, reply);
        });
    },

    hmsetRedis:function( hashkey, jsonobj, callback) {
        var client = this.openClient();
        client.hmset(hashkey, jsonobj, function(err, reply) {
            if (err) {
                console.error(hashkey + " :" + err);
            }
            client.quit();

            callback.call(null, err, reply);
        });
   },
   hkeysRedis : function (hashkey,callback) {
       var client = this.openClient();
       client.hkeys(hashkey,function (err, reply) {
            if (err){
                console.error('hkeys error:' + err);
            } 
            client.quit();
            callback.call(null, err, reply); 
       });
   }
   ,
   hdelRedis : function( hashkey, key, callback) {
        var client = this.openClient();
        client.hdel(hashkey, key, function(err, reply) {
            if (err){
                console.error('hdel error:' + err);
            } 
            client.quit();
            callback.call(null, err, reply);
        });
   }
};

module.exports = redisClient;

