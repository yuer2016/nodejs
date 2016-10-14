/// <reference path="../../typings/node/node.d.ts"/>
/// <reference path="../../typings/mocha/mocha.d.ts"/>

'use strict';

const assert = require('assert');

var redisClient = require('../bc_utils/utils_redis.js');

/** 
 * Redis 基础操作自动化测试类
*/

describe('Redis Client Test',function () {

    it('setRedis',function (done) {
        redisClient.setRedis('foo','test',function (err,result) {
            if(err){
                assert.ok(false);
            }else{
                console.info('setRedis result :',result);
                assert.ok(true);
            }
            done();
        });
    });

    it('hincrRedis',function (done) {
       redisClient.hincrRedis('books','id',function (err,result) {
           if(err){
                assert.ok(false);
            }else{
                console.info('hincrRedis result :',result);
                assert.ok(true);
            }
            done();
       });
    });

    it('getRedis',function (done) {
        redisClient.getRedis('foo',function (err,result) {
            if(err){
                assert.ok(false);
            }else{
                console.info('getRedis result :',result);
                assert.ok(true);
            }
            done();
        });
    });

    it('existsRedis',function (done) {
        redisClient.existsRedis('foo',function (err,result) {
           if(err){
                assert.ok(false);
            }else{
                console.info('existsRedis result :',result);
                assert.ok(true);
            }
            done();
        });
    });

    it('hsetRedis',function (done) {
        redisClient.hsetRedis('student','name','liuzhengfeng',function (err,result) {
            if(err){
                assert.ok(false);
            }else{
                console.info('hsetRedis result :',result);
                assert.ok(true);
            }
            done();
        });
    });

    it('hmsetRedis',function (done) {
        redisClient.hmsetRedis('student',{'sex':'man','age':'18'},function (err,result) {
            if(err){
                assert.ok(false);
            }else{
                console.info('hmsetRedis result :',result);
                assert.ok(true);
            }
            done();
        });
    });

    it('hgetRedis',function (done) {
        redisClient.hgetRedis('student','name',function (err,result) {
            if(err){
                assert.ok(false);
            }else{
                console.info('hgetRedis result :',result);
                assert.ok(true);
            }
            done();
        });
    });
    it('hgetallRedis',function (done) {
        redisClient.hgetallRedis('student',function (err,result) {
            if(err){
                assert.ok(false);
            }else{
                console.info('hgetallRedis result :',result);
                assert.ok(true);
            }
            done();
        });
    });

    it('hdelRedis',function (done) {
        redisClient.hdelRedis('student','name',function (err,result) {
            if(err){
                assert.ok(false);
            }else{
                console.info('hdelRedis result :',result);
                assert.ok(true);
            }
            done();    
        });
    });

    it('lPushRedis',function (done) {
        redisClient.lPushRedis('numbers','1',function (err,result) {
            if(err){
                assert.ok(false);
            }else{
                console.info('lPushRedis result :',result);
                assert.ok(true);
            }
            done();
        });
    });

    it('lLenRedis',function (done) {
        redisClient.lLenRedis('numbers',function (err,result) {
            if(err){
                assert.ok(false);
            }else{
                console.info('lLenRedis result :',result);
                assert.ok(true);
            }
            done();
        });
    });

    it('rPopRedis',function (done) {
        redisClient.rPopRedis('numbers',function (err,result) {
            if(err){
                assert.ok(false);
            }else{
                console.info('rPopRedis result :',result);
                assert.ok(true);
            }
            done();
        });
    });

    it('expireRedis',function (done) {
        redisClient.expireRedis('foo',10000,function (err,result) {
            if(err){
                assert.ok(false);
            }else{
                console.info('expireRedis result :',result);
                assert.ok(true);
            }
            done();
        });
    });
}); 