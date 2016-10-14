'use strict';

var correctTimeSocket = require('./bc_socket/socket_correctTime.js');

var httpSocket = require('./bc_socket/socket_http.js');

var msg2mongoSocket = require('./bc_socket/socket_msg2mongo.js');

var onTimeSocket = require('./bc_socket/socket_onTime.js');

var timerSocket = require('./bc_socket/socket_timer.js');

correctTimeSocket.createHttpServer(function(result){
    console.log(result);
});

correctTimeSocket.createHttpsServer(function(result){
    console.log(result);
});

httpSocket.createHttpServer(function(result){
    console.log(result);
});

httpSocket.createHttpsServer(function(result){
    console.log(result);
});

msg2mongoSocket.stopSubscribe();

onTimeSocket.timerjob();

onTimeSocket.times2job();

timerSocket.timerjob();