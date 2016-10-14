'use strict';

var moment = require('moment'); 

var schedule = require('node-schedule');

var redisClient = require('./../bc_utils/utils_redis.js');

var mongodbClient = require('./../bc_utils/utils_mongodb.js');

/**
 * 提取数据 ,被oclockDataSave 调用
 * @param pdcodekey
 */
function handlePdkey(pdcodekey, callback) {

    redisClient.hgetallRedis(pdcodekey, function(pdcodekey_err, pd_result) {
        if (pdcodekey_err) {
            console.log('pdcodekey_result err :', pdcodekey_err);
            return;
        }
        var json = {};
        if (pd_result) {
            json['dname'] = pd_result['dname'];
            var mids = pdcodekey.split(":");
            json['entcode'] = mids[1];
            json['dnum'] = mids[2];
            mids = null;
            json['pdname'] = pd_result['pdname'];
            json['planid'] = pd_result['planid'];
            json['pdcount'] = pd_result['pdcount'];
            json['modules'] = pd_result['modules'];
            json['ct'] = pd_result['lastct'];
            json['pCycle'] = pd_result['pCycle'];
            json['hourRealCycle'] = pd_result['hourRealCycle'];
            json['hourPdcount'] = pd_result['hourPdcount'];
            redisClient.hsetRedis(pdcodekey, "hourPdcount", "");
            redisClient.hsetRedis(pdcodekey, "hourRealCycle", "");
        }
        callback(json);
    });
}

/**
 * 整点数据保存
 */
function oclockDataSave() {
    redisClient.lLenRedis("oclockdata",function (len_result) {
        var ddate = new Date();
        var syear = moment(ddate).format('YYYY');
        var sdate = moment(ddate).format('YYYYMMDD hh:mm:ss');
        
        for (var index = 0; index < len_result; index++) {
            redisClient.rPopRedis("oclockdata",function (lpop_result) {
                handlePdkey(lpop_result,function (json) {
                    var collname = json.entcode+"_" + syear+".oclock";
                    json['tm'] = sdate;
                    console.log(lpop_result , ": " , collname);
                    mongodbClient.insertData(collname,json,function (result) {
                        console.log("oclockDataSave",result);
                    });
                });
            });
            
        }
    }); 
}
/** 
 * 确认暂时不需要
    redisClient.lLenRedis("durationdata", function(err, dlen_result) {
        if (err) {
            console.log('durationdata err ', err);
            return;
        }
        console.log('durationdata... ' + dlen_result);
    });
}  */



var job = {
    timerjob:function(){
        var rule = new schedule.RecurrenceRule();
        var times = [];
        for (var i = 0; i < 8; i++) {
            times.push(i);
            times.push(59 - i);
        }
        rule.minute = times;
        schedule.scheduleJob(rule, function(){
            oclockDataSave();    //整点数据保存
            console.log(new Date());
        });
    }
}

module.exports = job;


