'use strict';

var moment = require('moment');


var dateOne = moment(new Date());

var dateTwo = moment("2016-08-11 16:10");

var time =  dateOne.diff(dateTwo,"m");

console.log(time);

