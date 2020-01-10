const fs = require('fs');
var async = require("async");
const express = require('express');
const readline = require('readline');
var ffmpegs = require('fluent-ffmpeg');
const amqp = require('amqplib/callback_api');
var app = express();

const textVar='amirsorouri00'
const fileDirs = '/home/amirsorouri/Desktop/stream/amirh/node-queue/semi'; // Directory that input files are stored
const movieLocs = '/home/amirsorouri/Desktop/stream/amirh/node-queue/semi/f2.mp4'; // Directory that input files are stored
const readInterface = readline.createInterface({
    input: fs.createReadStream(fileDirs+'/keyFrameTimeList.txt'),
    console: true
});
var mapStart = new Map();
var mapEnd = new Map(); 
let ii = 0;
readInterface.on('line', function (line) {
  mapStart.set("stream".concat(ii).concat(".ts"), line)
  if(ii==0)
    console.log(mapStart)
  
  if (ii > 0) 
    mapEnd.set("stream".concat(ii - 1).concat(".ts"), line)
  ii++
});

function watermarker(proc) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(proc.run());
      }, 2000);
    });
}
  
async function try_to_watermark(proc){
    await watermarker(proc);
}
 

amqp.connect('amqp://localhost', function(error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function(error1, channel) {
    if (error1) {
      throw error1;
    }
    var queue = 'node_queue';

    channel.assertQueue(queue, {
      durable: true
    });
    channel.prefetch(1);
    
    console.log("Waiting for messages in %s", queue);
    channel.consume(queue, function(msg) {

        console.log("Received '%s'", msg.content.toString());
        var head = Number(msg.content.toString());
        console.log(head)

        var tmp = head + (head - 1)*2;
        console.log(tmp)
        for (var i = 0; i < 3; i++, tmp++) {
            final = 'stream'.concat(tmp).concat('.ts');
            console.log(final)
            if (fs.existsSync(fileDirs + '/' + final)) {
                console.log('*** Another process doing it. ***');
                continue;
            }
            if(mapStart.get(final) && mapEnd.get(final)) {
                var proc = convert_segment_vod(mapStart.get(final), mapEnd.get(final), movieLocs, final, textVar);
                try_to_watermark(proc, final).then(() => {
                // console.log("SUBPROCESS ", sgStartNo, ": ",final, " now exist.");
                })
            }
            else {
                console.log(final)
                break;
            }
        }
        console.log(head);

        setTimeout(function() {
            channel.ack(msg);
        }, 50);
    });
  });
});


function convert_segment_vod(mapStart, mapEnd, movieLocs, final, textVar){

    var proc = ffmpegs(movieLocs) 
      .videoFilters({
        filter: 'drawtext',
        options: {
          text: textVar,
          fontsize: 36,
          fontcolor: 'white',
          x: '(main_w/2-text_w/2)',
          y: '(text_h/2)+15',
          shadowcolor: 'black',
          shadowx: 2,
          shadowy: 2
        }
      })
      .videoCodec('libx264')
      .inputOption([
        '-ss '.concat(mapStart),
        '-itsoffset '.concat(mapStart)
      ])
      .addOptions([
        '-acodec copy' 
      ]) 
      .format('mpegts')
      .addOptions([
        '-t '.concat(mapEnd)
      ])
      .on('end', function (stdout, stderr) {
        console.log('SUBPROCESS: Transcoding succeeded !', movieLocs, final);
      })
      .on('error', function (err) {
        console.log('SUBPROCESS: an error happened: ' + err.message);
      })
      .output(fileDirs+'/'+final)
      // .pipe(res)
      return proc;
}