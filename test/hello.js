var events  = require('events');

var eventEmitter = new events.EventEmitter();

eventEmitter.on("message",function (message) {
    console.log(message);
});

eventEmitter.emit("message","i am a message");