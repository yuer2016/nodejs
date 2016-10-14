/// <reference path="../../typings/node/node.d.ts"/>
/// <reference path="../../typings/async/async.d.ts"/>
/// <reference path="../../typings/redis/redis.d.ts"/>
/// <reference path="../../typings/mysql/mysql.d.ts"/>
'use strict';

var fs = require('fs');
var path = require('path');
var url = require('url');
var http = require('http');
var https = require('https');
var moment = require('moment'); 

var redisClient = require('./../bc_utils/utils_redis.js');
var mysqlClient = require('./../bc_utils/utils_mysql.js');

var options = {
    key: fs.readFileSync(path.join(__dirname, './../bc_config/privatekey.pem')).toString(),
    cert: fs.readFileSync(path.join(__dirname, './../bc_config/certificate.pem')).toString()
};

var querynamesql = "SELECT name,com_serial entcode,order_stat_table ordertable,device_stat_table devicetable,mac_address mac,date_format(create_date,'%Y-%m-%d') createdate ,date_format(expiration_date,'%Y-%m-%d') expirytime,shifttimes     FROM sys_t_organization  s where  org_type = 1  and com_serial = ? ";

var updatesql = "update sys_t_organization set mac_address =? where  com_serial = ? ";

//
var queryTemplateSql = "SELECT t.template_type modalname,t.template_head_value headmodal,t.template_table_value tablemodal,tt.com_serial  FROM m_trade_template_board_t t ,   sys_t_organization   tt  where tt.trade_type_id=t.tradetype_id and tt.com_serial=?"; 


function timeCorrect(req, res) {
    var urldata = url.parse(req.url, true).query;
    var ddate = new Date();
    console.log(moment(ddate).format('YYYYMMDD hh:mm:ss'),":",urldata.data);
    try {
        var json = JSON.parse(urldata.data);
    } catch (error) {
        res.end('{ok: 0, msg: "json parse error"}');
        console.log('json parse error ', error);
        redisClient.lPushRedis("ent:cjq:"+moment(ddate).format('YYYYMMDD'),moment(ddate).format('YYYYMMDD hh:mm:ss')+"采集器校时错误:"+urldata.data);
        redisClient.expireRedis("ent:cjq:"+moment(ddate).format('YYYYMMDD'),3600*24);
        return;
    }
    var eid = json.eid;
    var mac = json.mac;
    var entkey = "ent:" + eid;
    var last = eid.charAt(eid.length - 1);
    var lastnum = parseInt(last);
    var cc = (lastnum - 5) * 30;
    var newtime = moment(ddate).subtract(cc,'seconds').format('YYYYMMDD hh:mm:ss');
    var ok = 1;
    res.end('{"time":"'+newtime+'"}');
    console.log('return time :', newtime);
    redisClient.hgetallRedis(entkey,function (error,result) {
        var haseid = false;
        if (error) {
            console.log('result err :', err);
            return;
        }
        if (result) {
            var name = result["name"];
        }   
        if(name){
            var macs = result["mac"];
            if (macs) {
                if (macs.indexOf(mac) == -1) {    //判断是否存在ｍａｃ
                    macs = macs + "," + mac;     //添加ｍａｃ
                    redisClient.hsetRedis(entkey, "mac", macs);
                    addMac(eid, macs);
                }
            }
           redisClient.lPushRedis(entkey + ":cjq:" + moment(ddate).format('YYYYMMDD'),"采集器启动:"+moment(ddate).format('YYYYMMDD hh:mm:ss')+urldata.data);
           redisClient.expireRedis(entkey + ":cjq:" + moment(ddate).format('YYYYMMDD'),3600*24);
           //redisClient.hincrRedis(entkey, "timenum", 1);  暂时确认不用字段
           setModal(entkey, eid); //每次执行更新模板;
           console.log("setModal");
           //redisClient.hsetRedis(entkey, "timenum", "0"); 暂时确认不用字段
        }else{
            mysqlClient.querysql(querynamesql,eid,function (mysql_result) {
                haseid = true;
                macs = mysql_result[0].mac;
                //var expirytime = mysql_result[0].expirytime;  暂时确认不用字段
                for (var key in mysql_result[0]) {
                    redisClient.hsetRedis(entkey, key, mysql_result[0][key]);
                }   
            }); 
            if (!haseid){
                ok = 0;
            }
            setModal(entkey, eid);    //每次执行更新模板;
        } 
    });
}

function addMac(eid, mac) {
   mysqlClient.querysql(updatesql,{mac,eid},function (result) {
       console.log("UPDATE Return ==> :",result);
   });
}

function setModal(entkey, eid) {
    mysqlClient.querysql(queryTemplateSql,eid,function(result) {
         for (var i in result) {
            var modalname = result[i].modalname;
            var modalkey = entkey + ":" + modalname;
            for (var key in result[i]) {
                redisClient.hsetRedis(modalkey, key, result[i][key]);
            }
            console.log(result[i]);
        }
    });
}

var createHttpServer = {
    createHttpServer:function (callback) {
        http.createServer(function (req,res) {
            if (req.url ==='/favicon.ico') {
                return;
            }
            req.setEncoding('utf8');
            res.writeHead(200, {'Content-Type': 'text/plain'});
            timeCorrect(req, res);
        }).listen(8440);
     callback('Server running at 8440!');
    },
    createHttpsServer:function (callback) {
        https.createServer(options,function (req,res) {
            if (req.url ==='/favicon.ico') {
                return;
            }
            req.setEncoding('utf8');
            res.writeHead(200, {'Content-Type': 'text/plain'});
            timeCorrect(req, res);
        }).listen(8443);
     callback('Https server listening on port 8443!');
    }
}

module.exports = createHttpServer;





