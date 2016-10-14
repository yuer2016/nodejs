'use strict';

var mongoClient = require('../bc_utils/utils_mongodb.js');

var data = {name:"wangdengfeng",sex:"man"};

mongoClient.insertData("student",data,function(result){
    console.log(result);
});