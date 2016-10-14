'use strict';

var schedule = require('node-schedule');

var moment = require('moment');

var redisClient = require('./../bc_utils/utils_redis.js');

/**
 * 读取时间差,返回分钟数
 * 时间格式 "2015-01-05 12:24"
 */
function getDiffMinute(begintime) {
	var bt = moment(begintime);
	var et = moment(new Date());
	return et.diff(bt,"m");
}

//board 程序监控到企业数据接收超时,push 企业编号到 ent:overtime,本程序发送消息给消息中心 ,给客服app
function publishOvertimeEnt(flag) {
	if (flag == 1) {
		var key = "ent:overtime";
		redisClient.rPopRedis(key, function(err, reply) {
			if (err) {
				flag = 0;
				error('rpop error:' + err);
			}
			if (reply == null){
                flag = 0;
            }
			if (flag == 1) {
				redisClient.openClient().publish("ent:overtime", reply);
				console.log("ent:overtime " + reply)
			}
			publishOvertimeEnt(flag);
		});
	}
}

//监听所有 企业的 采集器最新采集时间 ，如超过16分钟 ，配置该采集器的 机台状态为 关机
function moniterCJQ() {
	var key = "ent:cjq:lasttime";
	redisClient.hgetallRedis(key, function(err, key_result) {
		if (err) {
			console.log('cjq_result err ', err);
			return;
		}
		if(key_result){
			var amkey = "ent:cjq:";
			var keys = Object.keys(key_result);
			keys.forEach(function(am) {
				var lasttime = key_result[am];
				var diff = getDiffMinute(lasttime);
				if (diff > 16) {
					console.log(am , "-----" , key_result[am] , " diff is " , diff);
					handleProdline(amkey+am);
				}
			});
		}	
	});
}

function handleProdline(amkey){

    redisClient.hkeysRedis(amkey, function(err, keys_result) {
        if (err) {
            console.log('handleProdline err ', err);
            return;
        }
        keys_result.forEach(function(prodlinekey){
            redisClient.hsetRedis(prodlinekey,"flag","1");
            redisClient.hsetRedis(prodlinekey,"deviceStatus", "关机!");
            console.log(prodlinekey,"超时!");
        });
    });

}

var job = {
    timerjob:function(){
        var rule = new schedule.RecurrenceRule();
		var times = [];
		for (var i = 0; i < 59; i++) {
			times.push(i);
		}
		rule.minute = times;

		var job = schedule.scheduleJob(rule, function() {
			publishOvertimeEnt(1);
			console.log(new Date() , ":publishOvertimeEnt");
		});
	},

	times2job:function(){
		var rule2 = new schedule.RecurrenceRule();
		var times = [];
		for (var i = 0; i < 8; i++) {
			times.push(i*8);
		}
		rule2.minute = times;
		var job2 = schedule.scheduleJob(rule2, function() {
			moniterCJQ();
			console.log("每8分一次执行任务,保存!");
		});
	}
}

module.exports = job;
