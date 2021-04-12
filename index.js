var ffmpeg = require('fluent-ffmpeg');
const express = require('express');
const app = express();
var PubSub = require("pubsub-js");
var net = require("net");
var connections = 0
const boundaryID = "BOUNDRY";
app.get('/', function(req, res) {
    res.sendfile('./index.html');
})
app.get('/test.jpg', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace;boundary="' + boundaryID + '"',
        'Connection': 'keep-alive',
        'Expires': 'Fri, 27 May 1977 00:00:00 GMT',
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache'
    });
    if (connections == 0) {
        start();
    }
    connections++;
    console.log("Start: " + connections);


    var sub = PubSub.subscribe('MJPEG', function(msg, data) {

        //console.log(data.length);

        res.write('--' + boundaryID + '\r\n')
        res.write('Content-Type: image/jpeg\r\n');
        res.write('Content-Length: ' + data.length + '\r\n');
        res.write("\r\n");
        res.write(data, 'binary');
        res.write("\r\n");
    });

    res.on('close', function() {
        connections--;
        if (connections == 0) {
            end();
        }
        console.log("End: " + connections);
        PubSub.unsubscribe(sub);
        res.end();
    });
});
var command = ffmpeg('tcp://localhost:1935').inputFormat("mpegts").inputOptions("-listen 1").videoBitrate('1024k').outputFormat("mjpeg").fps(30).size('720x480').addOptions("-q:v 7");
var ffstream = command.pipe();
ffstream.on('data', function(chunk) {
    PubSub.publish('MJPEG', chunk);
});

function start() {
    var client = new net.Socket();
    client.connect(1337, '127.0.0.1', function() {
        client.write('stream');
    });
    client.destroy();

}

function end() {
    var client = new net.Socket();
    client.connect(1337, '127.0.0.1', function() {
        client.write('end');
    });
    client.destroy();

}
app.listen(8080);