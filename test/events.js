var events = require('events');

var eventEmitter = new events.EventEmitter();

var connectHander = function connected(){
    console.log("链接成功！");
    eventEmitter.emit('data_received');
}

eventEmitter.on('connect',connectHander);

eventEmitter.on('data_received',function(){
    console.log('数据接收！');
});

eventEmitter.emit('connect');

console.log('执行完毕！');

