const fs = require('fs');
const http = require('http');
const sleep = require('sleep');
const express = require('express');
const readline = require('readline');
const ffmpeg = require('fluent-ffmpeg');
const HLSServer = require('hls-server');
const subprocess = require('child_process');
const amqp = require('amqplib/callback_api');
var app = express();
var async = require("async")

const textVar='amirsorouri00'
const fileDirs = '/home/amirsorouri/Desktop/stream/amirh/friends'; // Directory that input files are stored
const movieLocs = '/home/amirsorouri/Desktop/stream/amirh/friends/f2.mp4'; // Directory that input files are stored

const readInterface = readline.createInterface({
    input: fs.createReadStream(fileDirs+'/keyFrameTimeList.txt'),
    console: false
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

const server = http.createServer(app)

const hls = new HLSServer(server, {
  path: '/streams', // Base URI to output HLS streams
  dir: fileDirs,    // Directory that input files are stored
  provider: {
    exists: function (req, callback) { 
      // check if a file exists (always called before the below methods)
      callback(null, true) // File exists and is ready to start streaming
    },
    getManifestStream: function (req, callback) { // return the correct .m3u8 file

      callback(null, fs.createReadStream(req.filePath))
    },
    getSegmentStream: function (req, callback) { // return the correct .ts file
      
      final = parse_segment_name(req.filePath)
      var rhhh = num_subst(final);
      var tmp = Number(rhhh);

      if (fs.existsSync(req.filePath)) {
        fs.open(req.filePath, 'r+', (err, fd) => {
          if (err) {
            console.log("Another process is working on ", final)
          }
          else{
            console.log('yohooooooo file exists', req.filePath);
            commit_future_ts(tmp+1);
            // sleep.msleep(500);
            callback(null, fs.createReadStream(req.filePath))
          }
          // writeMyData(fd);
        });
      }
      else {

        final = 'stream'.concat(rhhh).concat('.ts');
        commit_future_ts(tmp+1);
        sleep.msleep(500);

        var proc = ffmpeg_vodTSProvider(movieLocs, final);
        callback(null, proc);                
      }
    }
  }
});

// async function commit_future_ts(tsNo) {
//     console.log("here0 ", tsNo)
//     var tmp = tsNo + ((tsNo - 1) * 2);
    
//     for(var i = 0; i < 3; i++, tmp++){

//     }
// }

function commit_future_ts(tsNo) {
  // var tmp = tsNo + ((tsNo - 1) * 2);
  var tmp = tsNo + 1;
    
  // for(var i = 0; i < 3; i++, tmp++){
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(push_message(tmp));
      }, 2000);
    });
  // }
}



function push_message(message) {
  try{
    amqp.connect('amqp://localhost', function(error, connection) {
        if (error) {
            // throw error;
            console.log("error")
        }
        connection.createChannel(function(error1, channel) {
            if (error1) {
              console.log("error2")
            // throw error1;
            }

            let queue = 'node_queue';
            let msg = '' + message;

            channel.assertQueue(queue, {
              durable: true
            });
            channel.sendToQueue(queue, Buffer.from(msg), {
            persistent: true
            });
            console.log("Sent '%s'", msg);
            return 1
        });
    });
  }catch(e){
    console.log(e)
  } 
}

function num_subst(st) {
    var substr = st.replace('stream', '').replace('.ts', '');
    return substr;
}

function parse_segment_name(filepath){
    var string = filepath;
    var result = string.split('/');
    var final = result[result.length -1];
    return final
}

function ffmpeg_vodTSProvider(movie, final){
    var proc = ffmpeg(movie) 
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
          '-ss '.concat(mapStart.get(final)),
          '-itsoffset '.concat(mapStart.get(final))
        ])
        .addOptions([
          '-acodec copy' 
        ]) 
        .format('mpegts')
        .addOptions([
          '-t '.concat(mapEnd.get(final))
        ])
        .on('end', function (stdout, stderr) {
          console.log('Transcoding succeeded !', final);
        })
        .on('error', function (err) {
          console.log('an error happened: ' + err.message);
        })
        // .pipe(res)
        return proc;
  }

var httpAttach = require('http-attach')
function yourMiddleware(req, res, next) {
  // set your headers here
  res.setHeader('Access-Control-Allow-Origin', '*');
  next()
}
httpAttach(server, yourMiddleware)

server.listen(8182, () => {
  console.log('success');
});





// function call(message){
//   amqp.connect('amqp://localhost', function(error, connection) {
//       if (error) {
//           // throw error;
//           return 1
//       }
//       connection.createChannel(function(error1, channel) {
//           if (error1) {
//             // throw error1;
//             return 1
//           }

//           let queue = 'node_queue';
//           let msg = '' + message;

//           channel.assertQueue(queue, {
//             durable: true
//           });
//           channel.sendToQueue(queue, Buffer.from(msg), {
//             persistent: true
//           });
//           console.log("Sent '%s'", msg);
//           return 1
//       });
//       setTimeout(function() {
//           connection.close();
//           return 1
//           // process.exit(0)
//       }, 500);
//   });
// }