/// <reference path="/Users/yuer/Documents/subworkspace/nodejs/typings/node/node.d.ts"/>
/// <reference path="/Users/yuer/Documents/subworkspace/nodejs/typings/async/async.d.ts"/>
/// <reference path="/Users/yuer/Documents/subworkspace/nodejs/typings/redis/redis.d.ts"/>
//  9  闲置        2 未排        1  停机| 待机 | 关机     0   生产 |异常

'use strict';

var http = require('http');
var url = require('url');
var moment = require('moment'); 
var https = require('https');
var fs = require('fs');
var path = require('path');
var redisClient = require('./../bc_utils/utils_redis.js');

var options = {
    key: fs.readFileSync(path.join(__dirname, './../bc_config/privatekey.pem')).toString(),
    cert: fs.readFileSync(path.join(__dirname, './../bc_config/certificate.pem')).toString()
};

var createHttpServer = {
    createHttpServer:function (callback) {
        http.createServer(function (req,res) {
            if (req.url ==='/favicon.ico') {
                return;
            }
            req.setEncoding('utf8');
            res.writeHead(200, {'Content-Type': 'text/plain'});
            handleRequest(req, res);
        }).listen(8050);
     callback('Server running at 8050!');
    },
    createHttpsServer:function (callback) {
        https.createServer(options,function (req,res) {
            if (req.url ==='/favicon.ico') {
                return;
            }
            req.setEncoding('utf8');
            res.writeHead(200, {'Content-Type': 'text/plain'});
            handleRequest(req, res);
        }).listen(8000);
     callback('Https server listening on port 8000!');
    }
}

function handleRequest(req, res) {
    var urldata = url.parse(req.url, true).query;
    if(!urldata.data){
        res.end('{ok:0, msg:"数据为空"}');
        console.log('{ok:0, msg:"数据为空"}');
        return;
    }
    var json = JSON.parse(urldata.data);
    console.log("zhanglei base_collection/base_socket/socket_http.js 54 json :"+json.toJSONString());
    var eid = json.eid;
    if (eid.indexOf('ZS') == 0){
        handleZSMessage(req, res);
    }else {
        res.end('{ok:0, msg:"企业行业设置不对"}');
        console.log('{ok:0, msg:"企业行业设置不对"}');
    }
    urldata = null;
    json = null;
}

/**
 * 读取时间差,返回分钟数
 * 时间格式 "2015010524"
 */
function getDiffMinute(begintime, endtime) {
    var bt = new Date(begintime.replace(/(.{4})(.{2})(.{2})(.{2})(.{2})/, "$1-$2-$3 $4:$5:"));
    var et = new Date(endtime.replace(/(.{4})(.{2})(.{2})(.{2})(.{2})/, "$1-$2-$3 $4:$5:"));

    return Math.ceil((et - bt) / (60 * 1000)) + 5;
}

/**
 * 读取下一个换班时间
 *
 * @param shifttimes "8:00,12:00,18:00"
 * @return
 */
function getNextShiftTime(shifttimes) {
    var nextshifttime;
    var times = shifttimes.split(",");
    var thisdate;
    var ddate = new Date();
    var sdate = moment(ddate).format("YYYYMMDD");
    var cc = 0;
    try {
        for (var i = 0; i < times.length; i++) {
            thisdate = new Date(
                (sdate + " " + times[i]).replace(/(.{4})(.{2})/, "$1-$2-") + ':00'
            );

            if (ddate.getTime() < thisdate.getTime()) {
                cc++;
            }
        }
    } catch (error) {
         console.log('getNextShiftTime thisdate Date parse error ', error);
    }
    if (cc > 0) {
        nextshifttime = sdate + " " + times[times.length - cc];
    }else{
        var tomorrow = new Date(ddate.getTime() + 86400000);  //86400000 = 24小时
        var ndate = moment(tomorrow).format("YYYYMMDD");
        nextshifttime = ndate + " " + times[0];
        tomorrow = null;
        ndate = null;
    }
    times = null;
    thisdate = null;
    formatter = null;
    return nextshifttime;
}

function handlePlanRemind(prolinekey, plankey) {
    redisClient.hgetallRedis(plankey, function(err, plan_result) {
        if (!err) {
            var remindAmount = plan_result["amountremind"];
            if (typeof(remindAmount) != "undefined") {
                var reminds = remindAmount.split(",");
                var amount = parseInt(reminds[0]);
                var pdcount = parseInt(plan_result["pdcount"]);
                var plannum = parseInt(plan_result["plannum"]);
                if (amount < pdcount && amount > 0) {
                    reminds.splice(reminds.indexOf(0), 1);
                    if (reminds.lenth == 0)
                        redisClient.hsetRedis(plankey, "amountremind", "0"); 
                    else {
                        remindAmount = reminds.join(",");
                        redisClient.hsetRedis(plankey, "amountremind", remindAmount);
                    }
                    var scale = parseInt(pdcount * 100 / plannum);
                    if (!isNaN(scale)) {
                        redisClient.openClient().publish("ent:remindAmount", prolinekey + "," + scale, function(err, reply) {
                            if (err){
                               console.error('publish error:' , prolinekey , " :" , err);
                            }    
                        });
                    }
                }
            }
            if (typeof(starttime) != "undefined") {

            }
        }
    });
}

/*

 http://localhost:8000/w?data={"code":"p:qy001:sb001","cjdate":"", "pdcount":5,"deviceStatus":"1"}
 {"eid":"LJSY001","mid":"LJSY001:D001","tm":"2014121822", "ct":2,"st":"1"}
 */
function handleZSMessage(req, res) {
    var urldata = url.parse(req.url, true).query;
    var json = {};
    var eid = ""; //企业编码
    var code = ""; //设备编码
    var prolinekey = "";
    var dcodekey = "";
    var ordercode;
    var am = "";
    var cjtime = "";
    var pdcount = 0; //间断时间生产产品数量
    var deviceStatus = 0; //设备状态   0  表示正常   ,1 为停机
    var lastct = 0;
    var ct = 0;
    var r0 = 0; //zushu 开关时间
    var r1 = 0;
    var realCycle = 0;
    var diffminute = 0;
    var starttime;
    var modules = 1.0;
    var pdcodekey = "";
    var recordkey = "";
    try {
        json = JSON.parse(urldata.data);
        eid = json.eid; //企业编码
        code = json.mid; //采集器内的设备编码
        am = json.am; //采集器编号
        ct = parseInt(json.ct);//计算产品量
        if (urldata.data.indexOf("r0") > 0) {
            if (json.r0 == "0"){
                json.r0 = "300"; //r0如果是0 则代表停机！
            } 
            r0 = parseFloat(json.r0); 
            r1 = parseFloat(json.r1);
            realCycle = (r0 + r1).toFixed(1);  //实际周期
        }
        //产品数量
        deviceStatus = parseInt(json.st); //设备状态 1 | 0
        cjtime = json.tm; //采集时间
        cjtime = cjtime.substring(0, 12) + "00";
        prolinekey = "prodline:" + code; //设备key ,根据设备编号 ,生成设备 的key
        dcodekey = "p:" + code;
        
    } catch (error) {
        res.end('{ok: 0, msg: "json parse error"}');
        console.log('json parse error ', error);
        return;
    }
    var entkey = "ent:" + eid;
    console.log("redis 数据采集 key", entkey);
    redisClient.hgetallRedis(entkey,function (err, entkey_result) {
        if (err) {
            console.log('entkey_result err ', err);
            res.end('{ok: 0, msg: "get ' + entkey + ' error"}');
            return;
        }
        console.log("zhanglei entkey_result : "+entkey_result);
        if (entkey_result) {
            var lsttime = cjtime.replace(/(.{4})(.{2})(.{2})(.{2})(.{2})/, "$1-$2-$3 $4:$5:");
            redisClient.hsetRedis(entkey, "lasttime", lsttime,function(err,result){});
            // 设置采集器模块 的 最新数据采集时间 ，后台程序据此定时更新机台的关机状态
            redisClient.hsetRedis("ent:cjq:lasttime", am, lsttime,function(err,result){});
            redisClient.hsetRedis("ent:cjq:" + am, prolinekey, lsttime,function(err,result){});  
        }else{
            res.end('{ok: 0, msg: "没有找到企业信息"}');
            return;
        }
        var ddate = new Date();
        var curmonth = moment(ddate).format('YYYYMM');
        var sdate = moment(ddate).format('YYYYMMDD');
        var sdate2 = moment(ddate).format('YYYY-MM-DD hh:mm:ss');
        var sdate3 = moment(ddate).format('YYYYMMDDhhmmss');
        var sdate4 = moment(ddate).format('hh:mm');
        var sdate5 = moment(ddate).format('hh');
        redisClient.lPushRedis(entkey + ":" + sdate, urldata.data,function(err,result){});
        redisClient.expireRedis(entkey + ":" + sdate, 1200,function(err,result){});
        redisClient.hsetRedis("ent:lasttime", entkey, sdate2, function(lasttime_err, lasttime_result) {
            if (lasttime_err){
                console.log('lasttime_err_result  ', lasttime_err);
            }
                
        });
        redisClient.setRedis(entkey + ":lasttime", sdate2, function(entsetlasttime_err, entsetlasttime_result) {
            if (entsetlasttime_err) {
                console.log('lasttime_err_result:', entsetlasttime_err);
            }
            redisClient.expireRedis(entkey + ":lasttime", 30,function(err,result){}); //设置过期时间,使30秒内本企业数据不需更新
        });
        //读取设备的当前产品key    
        redisClient.hgetallRedis(prolinekey, function(err, prolinekey_result) { //prolinekey borad程序排机初始化数据
            if (err) {
                console.log('prolinekey_result err ', err);
                res.end('{ok: 0, msg: "get ' + prolinekey + ' error"}');
                return;
            }
            if (prolinekey_result) {
                 if (deviceStatus != 9 && deviceStatus != 3) { //deviceStatus = 9 和 deviceStatus =3 时设备异常
                    redisClient.hsetRedis(prolinekey, "cjqStatus", "",function(err,result){});
                    redisClient.hsetRedis(prolinekey, "cjqerror", "0",function(err,result){});
                } else {
                    redisClient.hsetRedis(prolinekey, "cjqStatus", "采集器故障",function(err,result){});
                    redisClient.openClient().hincrby(prolinekey, "cjqerror", 1,function(err,result){});
                    redisClient.hsetRedis(prolinekey, "deviceStatus", "关机",function(err,result){}); //停机
                    redisClient.hsetRedis(prolinekey, "flag", "1",function(err,result){}); //"flag", "1"
                    redisClient.lPushRedis(entkey + ":cjq:" + sdate, "采集器故障:" + urldata.data,function(err,result){});
                    redisClient.expireRedis(entkey + ":cjq:" + sdate, 3600 * 24,function(err,result){});
                    if (prolinekey_result["cjqerror"] == "2") {
                        
                    }
                    if (prolinekey_result["cjqerror"] == "0") {
                        redisClient.lPushRedis("stopdevice:" + sdate, prolinekey,function(err,result){}); //首次停机时,发停机通知,计算逻辑继续
                        redisClient.expireRedis("stopdevice:" + sdate, 3600 * 192,function(err,result){});
                    }
                    res.end('{ok:1, msg:"' + prolinekey + '采集器故障"}');
                    return;
                }
                redisClient.hsetRedis(prolinekey, "tm", cjtime,function(err,result){});
                if (ct == 0) {
                  redisClient.hsetRedis(prolinekey, "lastct", "0",function(err,result){});
                }
                var spCycle = prolinekey_result["pCycle"];   //pCycle 理论周期
                if (spCycle == null) {
                    spCycle = "0";
                }
                var pCycle = parseFloat(spCycle);
                var ndate = cjtime.replace(/(.{4})(.{2})(.{2})(.{2})(.{2})/, "$1-$2-$3 $4:$5:");
                var realCycle2 = realCycle;
                if (realCycle > 200) {
                    realCycle2 = 0;
                }
                //实际周期大于理论周期二倍通知
                if (prolinekey_result["flag"] == "0") {
                    if (realCycle2 > 2 * pCycle) {
                       redisClient.openClient().hincrby(prolinekey, "overAmount", 1); 
                       if (prolinekey_result["overAmount"] == "3") {
                            redisClient.openClient().publish("ent:overPlanAmount", prolinekey, function(err, reply) {
                                if (err){
                                    console.error('publish error:' + prolinekey + " " + err)
                                }
                            });
                        }
                    }else{
                         redisClient.hsetRedis(prolinekey, "overAmount", "0",function(err,result){});
                    }
                }else{
                    redisClient.hsetRedis(prolinekey, "overAmount", "0",function(err,result){});
                }
                var ordercode = prolinekey_result["orderkey"]; //订单key
                var thisplanid = prolinekey_result["planid"]; //计划id
                if (typeof(thisplanid) == "undefined"){
                    thisplanid = "";
                }
                var modules = prolinekey_result["modules"]; // 模穴数
                if (typeof(modules) == "undefined"){
                     modules = "1";
                }
                var plankey = "baseinfo:plan:" + thisplanid; //redis 计划key
                var prolineOclockkey = prolinekey + ":" + sdate + ":oclock"; //机台整点数据列表key
                //判断是否过换班时间 ，如果过了 ，发消息，然后 将换班时间 设为下一个 时间
                //如果是早班的话  ，更新订单的yesterday数据 ，today 置0     加到企业的订单备份列表  ，判断已有，则不加  备份 在 5点  6点  7点  8点  9点  10点 执行
                var shifttimes = prolinekey_result["shifttimes"]; //  "8:00,9:00,10:30,19:20";
                if (typeof(shifttimes) == "undefined"){
                    shifttimes = entkey_result["shifttimes"];
                }else{
                    var nextshifttime;
                    //var formatter = "yyyyMMdd HH:mm";
                    var thisdate;
                    var changeshift = false;
                    if ("nextshifttime" in prolinekey_result) {
                        nextshifttime = prolinekey_result["nextshifttime"];
                        thisdate = new Date(
                            nextshifttime.replace(/(.{4})(.{2})/, "$1-$2-") + ':00'
                        );
                        //判断当前时间大于 换班时间了
                        if (ddate.getTime() > thisdate.getTime()) {
                            nextshifttime = getNextShiftTime(shifttimes); 
                            redisClient.lPushRedis("prodline:changeshifts", prolinekey,function(err,result){}); //通知换班的 设备key
                            redisClient.hsetRedis(prolinekey, "nextshifttime", nextshifttime,function(err,result){}); //设置为下一换班时间
                            redisClient.hsetRedis(pdcodekey, "deviceStatus", "结束",function(err,result){});
                            // 早班时通知订单备份
                            var morning = sdate + " 11:00";
                            thisdate = new Date(morning.replace(/(.{4})(.{2})/, "$1-$2-") + ':00');
                            if (ddate.getTime() < thisdate.getTime()) { //上午  ，认为第一次换班
                                redisClient.hgetallRedis(ordercode, function(ordercode_err, ordercode_result) {
                                    if (ordercode_err) {
                                        console.log('ordercode_result err ', ordercode_err);
                                        res.end('{ok: 0, msg: "get ' + ordercode + ' error"}');
                                        return;
                                    }
                                    if (ordercode_result) {
                                        try {
                                            if ("today" in ordercode_result) {
                                                var today = ordercode_result["today"];
                                                if (today.toUpperCase() != sdate.toUpperCase()) { //第一次
                                                    redisClient.hsetRedis(ordercode, "today", sdate,function(err,result){});
                                                    redisClient.lPushRedis("order:backup", ordercode,function(err,result){}); //通知订单备份
                                                }
                                            } else {
                                                redisClient.hsetRedis(ordercode, "today", sdate,function(err,result){});
                                                redisClient.lPushRedis("order:backup", ordercode,function(err,result){}); //通知订单备份
                                            }
                                        } catch (e) {
                                            console.log(sdate + "  , today is " + today);

                                        }
                                    }
                                });
                            }
                        }
                    }else{
                        nextshifttime = getNextShiftTime(shifttimes);
                        redisClient.hsetRedis(prolinekey, "nextshifttime", nextshifttime,function(err,result){});
                    }
                    thisdate = null;
                    //formatter = null;
                }
                //结束换班
                if (ct > 0 && ct < 65536) {
                    pdcodekey = prolinekey_result["pdcodelastkey"];
                    if (typeof(pdcodekey) == "undefined") {
                        pdcodekey = null;
                        pCycle = 0;
                    }
                    var pdcnt = prolinekey_result["pdcount"];
                    var oldstatus = prolinekey_result["deviceStatus"];
                    if (oldstatus == null){
                        oldstatus = "生产";
                    }
                    lastct = parseInt(prolinekey_result["lastct"]); //从产线读
                    if (ct >= lastct){
                        pdcount = ct - lastct;
                    }else if((65536 - lastct) > 2 * ct){
                        pdcount = ct;
                    }else{
                        pdcount = ct - lastct + 65536;
                    }

                    if (lastct == 0){ //自动录入时 ,第二次不参与计算
                        pdcount = 0;
                    }

                    if (lastct == 1){ //手工录入时的逻辑  第二次参与计算
                        pdcount = ct;
                    }
                    if (ct == 1){
                        pdcount = 0;
                    }
                    redisClient.hsetRedis(prolinekey, "lastct", ct,function(err,result){});
                    if (ndate.indexOf("null") == -1) {
                        //机台每日的 实际周期数据
                        redisClient.lPushRedis(prolinekey + ":" + sdate, ndate + "," + realCycle2 + "," + pCycle + "," + pdcount + "," + thisplanid + "," + parseFloat(module),function(err,result){});
                        redisClient.expireRedis(prolinekey + ":" + sdate, 3600 * 192,function(err,result){});
                        var keytj2 = prolinekey + ":tj2:" + sdate;
                        redisClient.openClient().hincrby(keytj2, "all" + sdate5, 1,function(err,result){});
                        redisClient.expireRedis(keytj2, 3600 * 192,function(err,result){});
                    }
                    if (pCycle == 0) {
                        if (realCycle <= 200) {
                            deviceStatus = 3; // 未排机
                            redisClient.openClient().hincrby(prolinekey, "pdcount", pdcount);
                            redisClient.hsetRedis(prolinekey, "deviceStatus", "未排",function(err,result){});
                            redisClient.hsetRedis(prolinekey, "flag", "2",function(err,result){});
                            var keytj2 = prolinekey + ":tj2:" + sdate;
                            redisClient.openClient().hincrby(keytj2, "work" + sdate5, 1);
                        }else{
                            deviceStatus = 4; //停机
                            realCycle = 0;
                            if (oldstatus == "未排"){
                                redisClient.hsetRedis(prolinekey, "pdcount", "0",function(err,result){});
                            }
                            //根据有线来源 或无线 显示停机或待机  2016/05/12
                            if (typeof(json.devicetype) != "undefined") {
                                if (json.devicetype == "zusu"){
                                    redisClient.hsetRedis(prolinekey, "deviceStatus", "待机",function(err,result){}); //无线停机
                                }
                                    
                            } else{
                                redisClient.hsetRedis(prolinekey, "deviceStatus", "停机",function(err,result){}); //有线停机
                            }
                            redisClient.hsetRedis(prolinekey, "flag", "1",function(err,result){});
                          }
                          redisClient.hsetRedis(prolinekey, "realCycle", realCycle,function(err,result){});
                          res.end('{ok:1, msg:"' + prolinekey + '无排机计划"}');
                          return; //退出程序
                        }else{
                            recordkey = "workmi:" + code + ":" + sdate; //设备每天的工作时长
                            var curmonthkey = "curmonth:" + eid + ":" + curmonth; //企业设备当月的工作时长
                            var s_cyclemin = entkey_result["cyclemin"];
                            if (typeof(s_cyclemin) == "undefined"){
                                s_cyclemin = "0.05";
                            }       
                            var s_cyclemax = entkey_result["cyclemax"];
                            if (typeof(s_cyclemax) == "undefined"){
                                s_cyclemax = "0.05";
                            }    
                            var cyclemin = pCycle - parseFloat(s_cyclemin) * pCycle;
                            var cyclemax = pCycle + parseFloat(s_cyclemax) * pCycle;

                            if (realCycle < cyclemin) {
                                deviceStatus = 0; //正常
                                redisClient.hsetRedis(prolinekey, "deviceStatus", "异常",function(err,result){});
                                redisClient.hsetRedis(prolinekey, "flag", "0",function(err,result){}); //正常 异常
                                redisClient.openClient().incrby(recordkey, 5);
                                redisClient.expireRedis(recordkey, 192,function(err,result){});
                                redisClient.openClient().hincrby(curmonthkey, code, 5);
                            }else if (realCycle <= cyclemax) {
                                deviceStatus = 0; //正常
                                redisClient.hsetRedis(prolinekey, "deviceStatus", "生产",function(err,result){});
                                redisClient.hsetRedis(prolinekey, "flag", "0",function(err,result){}); //正常 异常
                                redisClient.openClient().incrby(recordkey, 5);
                                redisClient.expireRedis(recordkey, 192,function(err,result){});
                                redisClient.openClient().hincrby(curmonthkey, code, 5);
                            }else if(realCycle <= 200){
                                deviceStatus = 2; //异常
                                redisClient.hsetRedis(prolinekey, "deviceStatus", "异常",function(err,result){});
                                redisClient.hsetRedis(prolinekey, "flag", "0",function(err,result){}); //正常 异常
                                redisClient.openClient().incrby(recordkey, 5);
                                redisClient.expireRedis(recordkey, 192,function(err,result){});
                                redisClient.openClient().hincrby(curmonthkey, code, 5);
                            }else{
                                deviceStatus = 4; //停机
                                realCycle = 0;
                                redisClient.openClient().hincrby(plankey, "stoptimes", 1,function(err,result){}); //停机数据次数
                                redisClient.openClient().hincrby(prolinekey, "stoptimes3", 1,function(err,result){}); //本次停机数据次数
                                var changeflag = prolinekey_result["changeflag"];
                                if (typeof(changeflag) == "undefined") {
                                    changeflag = "0";
                                }
                                if (changeflag == "1" || changeflag == "2") { //第二次停机

                                    if (typeof(json.devicetype) != "undefined") {
                                        if (json.devicetype == "zusu") {
                                            redisClient.hsetRedis(prolinekey, "deviceStatus", "待机",function(err,result){}); //无线停机
                                        }
                                    } else{
                                        redisClient.hsetRedis(prolinekey, "deviceStatus", "停机",function(err,result){}); //有线停机
                                    }

                                    if (changeflag == "1") {
                                        redisClient.lPushRedis("stopdevice:" + sdate, prolinekey); //停机通知
                                        redisClient.expireRedis("stopdevice:" + sdate, 192,function(err,result){});
                                        redisClient.hsetRedis(prolinekey, "flag", "1",function(err,result){}); //"flag", "1"
                                        redisClient.hsetRedis(prolinekey, "realCycle", "0",function(err,result){});
                                        redisClient.hsetRedis(prolinekey, "changeflag", "2",function(err,result){});
                                        redisClient.openClient().hincrby(plankey, "stoptimes2", 1); //停机次数 2
                                        redisClient.lPushRedis(prolinekey + ":switch:" + sdate, sdate4 + ",1," + prolinekey_result["planid"],function(err,result){});
                                    }       
                            }

                            if (changeflag == "0") { //上次是生产状态 或 待机  异常
                                redisClient.hsetRedis(prolinekey, "changeflag", "1",function(err,result){}); //第一次停机
                                redisClient.hsetRedis(prolinekey, "stoptime", sdate2,function(err,result){}); //
                            }
                            var oldflag = prolinekey_result["flag"];
                            if (oldflag == "0") { //上次是生产状态 或 待机  异常
                                redisClient.hsetRedis(prolinekey, "changeflag", "1",function(err,result){}); //第一次停机
                            }
                            res.end('{ok:1, msg:"' + prolinekey + '停机"}');
                            return;
                        }
                        var oldflag = prolinekey_result["flag"];
                        if (oldflag == "1") { //上次是生产状态 停机
                            //加机台启动记录
                            redisClient.lPushRedis(prolinekey + ":switch:" + sdate, sdate4 + ",0," + prolinekey_result["planid"],function(err,result){});
                            redisClient.expireRedis(prolinekey + ":switch:" + sdate,  192,function(err,result){});
                        }
                        // if last changeflag is stop  changeflag=1 or 2 
                        var oldchangeflag = prolinekey_result["changeflag"];
                          if (typeof(oldchangeflag) != "undefined") {
                            if (oldchangeflag == "1" || oldchangeflag == "2") {
                                var stopmsg = {};
                                stopmsg.stoptime = prolinekey_result["stoptime"];
                                stopmsg.prodline = prolinekey_result["dname"];
                                stopmsg.stoptimes = prolinekey_result["stoptimes3"];
                                stopmsg.starttime = cjtime;
                                stopmsg.code = prolinekey_result["code"];
                                redisClient.openClient().publish("ent:stopmsg", JSON.stringify(stopmsg), function(err, reply) {
                                    if (err)
                                        console.error('publish stopmsg error:' + prolinekey + " " + err);
                                    stopmsg = null;
                                });
                                console.log("ent:stopmsg  " + JSON.stringify(stopmsg));
                            }
                        }
                        redisClient.hsetRedis(prolinekey, "changeflag", "0",function(err,result){});
                        redisClient.hsetRedis(prolinekey, "stoptimes3", "0",function(err,result){});
                    }
                    redisClient.hsetRedis(prolinekey, "realCycle", realCycle,function(err,result){});
                    redisClient.hsetRedis(prolinekey, "Duration", "0",function(err,result){});

                    redisClient.hsetRedis(prolinekey, "hourPdcount", pdcount + "," + prolinekey_result["hourPdcount"],function(err,result){});
                    redisClient.hsetRedis(prolinekey, "hourRealCycle", realCycle + "," + prolinekey_result["hourRealCycle"],function(err,result){});
                    //机台产品 整点数据，数据到mongodb
                    var ddate1 = new Date();
                    var ddate2 = moment(ddate1).format("YYYY-MM-DD hh")+":00:00";
                    var bt = new Date(ddate2);
                    var diff = Math.ceil((ddate1 - bt) / (60 * 1000));
                    if (diff < 10) {
                        redisClient.lPushRedis("oclockdata", prolinekey, function(lpush_err, lpush_result) {
                            if (lpush_err){
                                console.log('lpush_err err ' + prolinekey, lpush_err);
                            }      
                        });
                    }

                    //开始判断是否有计划  ||pdcnt!=null
                    if (pdcodekey != null && realCycle > 0) {
                        modules = parseFloat(prolinekey_result["modules"]);
                        var modulenum = pdcount;
                        pdcount = Math.round(pdcount * modules);
                        var pdcodelistkey = dcodekey + ":list:" + sdate; //设备当天历史数据
                        redisClient.lPushRedis(pdcodelistkey, urldata.data,function(err,result){});
                        redisClient.expireRedis(pdcodelistkey, 3600 * 192,function(err,result){});

                        if (prolinekey_result["autocut"] == "1") { //判断机台是否连续计划生产
                            var plannum = parseInt(prolinekey_result["plannum"]);
                            var lastpdcount = parseInt(prolinekey_result["pdcount"]) + pdcount;
                            if (lastpdcount > plannum) {
                                redisClient.lPushRedis("prodline:overPlanAmount", prolinekey,function(err,result){});
                            }
                        }

                        //设备产品 的 当前key ，不存在该key  当天第一次
                        redisClient.hgetall(pdcodekey, function(pdcodekey_err, pdcodekey_result) {
                            if (pdcodekey_err) {
                                console.log('pdcodekey_result err ', pdcodekey_err);
                                res.end('{ok: 0, msg: "get ' + pdcodekey + ' error"}');
                                return;
                            }
                            if (cjtime.substring(10) == "0000") {
                                var propdcount = parseInt(prolinekey_result["pdcount"]);
                                propdcount = propdcount + pdcount;
                                redisClient.lPushRedis(prolineOclockkey, cjtime + "," + thisplanid + "," + propdcount, function(lpush_err, lpush_result) {
                                    if (lpush_err){
                                        console.log('lpush_err err ' + prolineOclockkey, lpush_err);
                                    }   
                                    redisClient.expireRedis(prolineOclockkey, 3600 * 192,function(err,result){});
                                });
                            }

                            try {
                                for (var key in json) {
                                    redisClient.hsetRedis(pdcodekey, key, json[key],function(err,result){});
                                }
                                redisClient.hsetRedis(pdcodekey, "tm", cjtime,function(err,result){});
                            } catch (ex) {}
                            if (pdcodekey_result == null) {
                                var lct = parseInt(prolinekey_result["lastct"]);
                                redisClient.hsetRedis(pdcodekey, "realCycle", realCycle,function(err,result){});
                                redisClient.hsetRedis(pdcodekey, "lastkey", prolinekey_result["lastkey"],function(err,result){});
                                redisClient.hsetRedis(pdcodekey, "pdname", prolinekey_result["pdname"],function(err,result){}); //读设备新计划数据   //读设备新计划数据
                                redisClient.hsetRedis(pdcodekey, "pdscale", prolinekey_result["pdscale"],function(err,result){});
                                redisClient.hsetRedis(pdcodekey, "plannum", prolinekey_result["plannum"],function(err,result){});
                                redisClient.hsetRedis(pdcodekey, "planid", prolinekey_result["planid"],function(err,result){});
                                redisClient.hsetRedis(pdcodekey, "modules", prolinekey_result["modules"],function(err,result){});
                                redisClient.hsetRedis(pdcodekey, "pCycle", prolinekey_result["pCycle"],function(err,result){});
                                redisClient.hsetRedis(pdcodekey, "shiftsnum", prolinekey_result["nextshiftsnum"],function(err,result){}); //轮班班次
                                redisClient.hsetRedis(ordercode, "prodlinekey", prolinekey,function(err,result){});
                                redisClient.hsetRedis(pdcodekey, "boxnum", "0",function(err,result){});
                                redisClient.hsetRedis(pdcodekey, "tailnum", "0",function(err,result){});
                                redisClient.hsetRedis(pdcodekey, "starttime", cjtime,function(err,result){});
                                if (lct == "0")
                                    redisClient.hsetRedis(pdcodekey, "startct", 0,function(err,result){}); //ct
                                else
                                    redisClient.hsetRedis(pdcodekey, "startct", ct,function(err,result){});
                                var planid = prolinekey_result["planid"];
                                redisClient.lPushRedis("planstarted", eid + "," + planid + "," + cjtime,function(err,result){});
                                redisClient.hsetRedis(pdcodekey, "pdcount", "0",function(err,result){});
                                redisClient.hsetRedis(pdcodekey, "orderkey", ordercode,function(err,result){});
                                redisClient.hsetRedis(pdcodekey, "Durationnum", "0",function(err,result){}) //停机次数
                                redisClient.lPushRedis(dcodekey + ":" + sdate, pdcodekey,function(err,result){}); //设备当天的产品 key
                                redisClient.expireRedis(dcodekey + ":" + sdate, 3600 * 192,function(err,result){});
                                redisClient.lPushRedis(ordercode + ":" + sdate, pdcodekey,function(err,result){}); //订单当天的产品 key
                                redisClient.expireRedis(ordercode + ":" + sdate, 3600 * 192,function(err,result){});
                                if (pdcount > 0) {
                                    redisClient.hsetRedis(pdcodekey, "deviceStatus", "生产",function(err,result){});
                                } else {
                                    redisClient.hsetRedis(pdcodekey, "deviceStatus", "待机",function(err,result){});
                                }
                                redisClient.expireRedis(pdcodekey, 3600 * 192,function(err,result){});
                            } else {

                                // begin
                                try {
                                    starttime = pdcodekey_result["starttime"];
                                    if (typeof(starttime) != "undefined") {
                                        diffminute = getDiffMinute(starttime, cjtime);
                                        redisClient.hsetRedis(pdcodekey, "workminute", diffminute,function(err,result){}); //当班的设备实际工作时长
                                    } else{
                                        redisClient.hsetRedis(pdcodekey, "starttime", cjtime,function(err,result){});
                                    }
                                    redisClient.hsetRedis(pdcodekey, "realCycle", realCycle,function(err,result){});
                                    redisClient.hsetRedis(pdcodekey, "hourPdcount", pdcount + "," + pdcodekey_result["hourPdcount"],function(err,result){});
                                    redisClient.hsetRedis(pdcodekey, "hourRealCycle", realCycle + "," + pdcodekey_result["hourRealCycle"],function(err,result){});
                                } catch (e) {
                                    console.log('getDiffMinute time error ,初始化失败,产品key ' + pdcodekey, e);
                                    console.log("starttime is" + starttime + ", cjtime is " + cjtime);
                                    redisClient.hsetRedis(pdcodekey, "starttime", cjtime,function(err,result){});
                                }
                                //判断停机状态,累加时间 或置零
                                if (deviceStatus == 4 || deviceStatus == 1) { //停机了
                                    redisClient.openClient().hincrby(pdcodekey, "Duration", 5); //停机总时长
                                    var oldstatus = prolinekey_result["deviceStatus"];
                                    if (oldstatus == "生产"){
                                        redisClient.openClient().hincrby(pdcodekey, "Durationnum", 1); //停机次数
                                    }    
                                    //根据有线来源 或无线 显示停机或待机  2016/05/12
                                    if (typeof(json.devicetype) != "undefined") {
                                        if (json.devicetype == "zusu")
                                            redisClient.hsetRedis(prolinekey, "deviceStatus", "待机",function(err,result){}); //无线停机
                                    } else {
                                        redisClient.hsetRedis(prolinekey, "deviceStatus", "停机",function(err,result){}); //有线停机
                                    }       
                                    redisClient.hsetRedis(prolinekey, "flag", "1",function(err,result){});
                                }
                                //保存停机记录到   record:devicekey:sdate
                                if (deviceStatus == 0 || deviceStatus == 2) { //生产中
                                    redisClient.hsetRedis(pdcodekey, "Duration", "0",function(err,result){});
                                    redisClient.hsetRedis(pdcodekey, "deviceStatus", "生产",function(err,result){});
                                    var keytj = prolinekey + ":tj:" + sdate;
                                    var keytj2 = prolinekey + ":tj2:" + sdate;
                                    redisClient.openClient().hincrby(keytj2, "work" + sdate5, 1);
                                    redisClient.lPushRedis(keytj, cjtime.substring(8) + "," + prolinekey_result["pdname"] + "," + pdcount + "," + ct, function(lpush_err, lpush_result) {
                                        if (lpush_err)
                                            console.log('lpush_err err ' + prolinekey, lpush_err);
                                    });
                                    redisClient.expireRedis(keytj, 3600 * 192,function(err,result){});
                                }

                            } //不是第一次 结束

                            if (json.tjcount != null) {
                                pdcount = parseInt(json.tjcount);
                                if (json.devicetype == "goodPD")
                                    redisClient.openClient().hincrby(ordercode, "goodPD", pdcount);
                                else if (json.devicetype == "badPD")
                                    redisClient.openClient().hincrby(ordercode, "badPD", pdcount)
                            }

                            redisClient.hsetRedis(pdcodekey, "lasttime", cjtime,function(err,result){});
                            redisClient.openClient().hincrby(pdcodekey, "pdcount", pdcount);
                            redisClient.openClient().hincrby(prolinekey, "pdcount", pdcount);
                            redisClient.openClient().hincrby(prolinekey, "todaynum", pdcount);
                            redisClient.openClient().hincrby(ordercode, "todaynum", pdcount);
                            redisClient.openClient().hincrby(plankey, "pdcount", pdcount);
                            redisClient.openClient().hincrby(plankey, "workminute", 5);
                            redisClient.openClient().hincrby(plankey, "modulenum", modulenum);
                            redisClient.openClient().hincrby(plankey, "worktimes", 1);
                            redisClient.hsetRedis(plankey, "lasttime", cjtime,function(err,result){});
                            redisClient.openClient().hincrby(ordercode, "finishednum", pdcount);
                            handlePlanRemind(prolinekey, plankey);
                            ddate = null;
                        });

                    }else{ //未排机前 的机台数据采集
                         if (prolinekey_result["pdcount"] == "0") {
                            redisClient.hsetRedis(prolinekey, "starttime", cjtime,function(err,result){});
                        }
                        redisClient.openClient().hincrby(prolinekey, "pdcount", pdcount);
                        redisClient.openClient().hincrby(prolinekey, "todaynum", pdcount);
                    }
                        

                }else{ //不存在该设备数据
                    console.log("不存在该设备或计划:" + prolinekey);
                    redisClient.hsetRedis(prolinekey, "deviceStatus", "闲置",function(err,result){});
                    redisClient.hsetRedis(prolinekey, "flag", "9",function(err,result){});
                    redisClient.hsetRedis(prolinekey, "lastct", ct,function(err,result){});
                    redisClient.hsetRedis(prolinekey, "pCycle", "0",function(err,result){});
                }
                res.end('{ok:1, msg:"' + pdcodekey + '"}');       
            }
        });
    });
}

module.exports = createHttpServer;

