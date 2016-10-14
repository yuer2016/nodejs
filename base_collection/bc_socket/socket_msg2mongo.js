'use strict';
var moment = require('moment'); 

var schedule = require('node-schedule');

var redisClient = require('./../bc_utils/utils_redis.js');

var mongodbClient = require('./../bc_utils/utils_mongodb.js');

/**
 * 读取时间差,返回分钟数
 * 时间格式 "2015-01-05 12:24"
 */
function getDiffMinute(begintime, endtime) {
    var bt = new Date(begintime);
    var et = new Date(endtime);
    return Math.ceil((et - bt) / (60 * 1000)) ;
}

//publish syncinfo:base '{"sysname": "base", "busi": "userGetSql", "param": "4,2,1", "module": "user"}'
//订阅一个频道
var Subscribe = {
    stopSubscribe:function() {
        var stopmsg = 'ent:stopmsg'; //基础信息订阅频道
        var redis = redisClient.openClient();
        redis.subscribe(stopmsg,'ent:rejectmsg', function(e) {
            console.log('starting subscribe channel:' , stopmsg);
        });
        //订阅处理函数   消息内容  json （sysname，module（企业|设备|订单）,  infoid  }
        redis.on('message', function(channel, msg) {
            if (channel.indexOf("stopmsg") > 1) {
                handelStopMessage(msg);
            } else if (channel.indexOf("rejectmsg") > 1) {
                handelRejectMessage(msg);
            }
        });
    }
}

//{"stoptime":"2016-06-15 07:55:04","prodline":"7号机","stoptimes":"1","code":"p:ZSHJDQ0015:JT0007"}

function handelStopMessage(msg) {
    var json = JSON.parse(msg);
    var codes = json.code.split(":");
    var entcode = codes[1];
    var dcode = codes[2];
    json['entcode'] = entcode;
    json['dcode'] = dcode;
    codes = null;
    var ddate = new Date();
    var syear = moment(ddate).format('YYYY'); 
    var sdate = moment(ddate).format('YYYY-MM-DD hh:mm')+":00";  
    var diff = getDiffMinute(json.stoptime, sdate);
    json['stopminutes'] = diff;
    var collectionName = entcode + "_" + syear + ".stopmsg";
    mongodbClient.insertData(collectionName,json,function(result){
        console.log(result);
        json = null;
    });
}

//不良品 消息格式 ent:rejectmsg ‘{"code":"p:ZSHJDQ0015:JT0007","tm":"2016-06-16","data":{"A1":12,"A2":23,"B1":22}}’

function handelRejectMessage(msg) {
    var json = JSON.parse(msg);
    var codes = json.code.split(":");
    var entcode = codes[1];
    var dcode = codes[2];
    json['entcode'] = entcode;
    json['dcode'] = dcode;
    codes = json.tm.split("-");
    json['month'] = ss[1];
    json['day'] = ss[2];
    var syear = ss[0];
    codes=null;
    var ddate = new Date();
    var sdate = moment(ddate).format('YYYY-MM-DD hh:mm')+ ":00";
    var collectionName = entcode + "_" + syear + ".reject";
    mongodbClient.insertData(collectionName,json,function (result) {
        console.log(result);
    });
}

module.exports = Subscribe;