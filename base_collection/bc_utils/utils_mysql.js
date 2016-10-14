/// <reference path="../../typings/node/node.d.ts"/>
/// <reference path="../../typings/async/async.d.ts"/>
/// <reference path="../../typings/redis/redis.d.ts"/>
/// <reference path="../../typings/mysql/mysql.d.ts"/>
'use strict';

var mysql = require('mysql');
var configUtils = require('./utils_config.js');
var mysqlConfig = configUtils.zusumysql;

var pool = mysql.createPool({
    host: mysqlConfig.dbip,
    user: mysqlConfig.user,
    password: mysqlConfig.pwd,
    database: mysqlConfig.dbname,
    connectionLimit: 50,
    port: mysqlConfig.port
});

function queryList(sql, params, callback) {
    pool.getConnection(function(err, conn) {
        if (err) console.log("POOL ==> " + err);
        conn.query(sql, params, function(errsql, results, fields) {
            if (errsql) {
                console.log("---" + errsql);
                results = [];
            }
            conn.release();
            if (results.length > 0)
                callback(results);
            else
                callback([]);
        });
    });
}

var  mysqlPool = {
   querysql:function (sql, params, callback) {
        pool.getConnection(function(err, conn) {
        if(err){
            console.log();
        }
        conn.query(sql, params, function(errsql, results, fields) {
          if (errsql) {
                console.log("sql error:" , errsql);
                results = [];
            }
            conn.release();
            if (results.length > 0)
                callback(results);
            else
                 callback([]);
            });
        });
    }
}

module.exports = mysqlPool;



