var request = require('request');
var fs = require('fs');
var zlib = require('zlib');
var protobuf = require('protobufjs');
var ByteBuffer = require("bytebuffer");

var authRequest = {
    "uid": "e061b8b626cc4bf4287d0b2a639891dd",
    "device_platform": "Android",
    "language": "en",
    "player_name": "",
    "bundle_id": "com.ea.game.starwarscapital_row",
    "region": "NA",
    "local_time_zone_offset_minutes": -300,
    "session_start_context": 1,
    "device_preferences": []
};

var authRequestEnv = {
  "correlation_id": 0,
  "service_name": "AuthRpc",
  "method_name": "DoAuthGuest",
  "payload": [],
  "auth_id": "",
  "auth_token": "",
  "client_version": 171473,
  "client_startup_timestamp": 1479260069,
  "platform": "Android",
  "region": "NA",
  "client_external_version": "0.6.11",
  "client_internal_version": "0.6.171473",
  "request_id": "c88bd8ae-1e2a-433a-94a8-04763361528c",
  "accept_encoding": 1,
  "flag": [],
  "telemetry_event": [],
  "current_client_time": 1479260076,
  "nimble_session_id": "201611150641243757340276",
  "timezone": "CST",
  "firmware_version": "",
  "carrier": "",
  "network_access": "W",
  "hardware_id": "18157",
  "advertiser_id": "",
  "vendor_id": "",
  "android_id": "20762407d970cd14",
  "jailbroken_flag": 0,
  "piracy_flag": 0,
  "synergy_id": "10440050988",
  "device_model": "Nexus 6P",
  "device_id": "039d7bffbd75ddade9d89f03bae3eee93b5dbb220fbd547bb685cfb9d60fd32b"
};

function toOctectArr(str) {
  var result = [];
  for(var i = 0, length = str.length; i < length; i++) {
      var code = str.charCodeAt(i);
      // Since charCodeAt returns between 0~65536, simply save every character as 2-bytes
      result.push(code & 0xff);
  }
  return result;
}

protobuf.load(['protos/RequestEnvelope.proto', 'protos/AuthGuestRequest.proto'], function(err, root) {
    if (err) throw err;
    
    var RequestEnvelope = root.lookup('Protos.RequestEnvelope');
    var AuthGuestRequest = root.lookup('Protos.AuthGuestRequest');
    
    var buffer = AuthGuestRequest.encode(authRequest).finish();
    authRequestEnv.payload = toOctectArr(buffer.toString());
    console.log(authRequestEnv.payload);
    
    var test = new RequestEnvelope(authRequestEnv);

    // Encode a message (note that reflection encodes to a writer and we need to call finish)
    var buffer = RequestEnvelope.encode(test).finish();

    var message = RequestEnvelope.decode(buffer);
    
    //var reqBuffer = RequestEnvelope.encode(authRequestEnv);
    //console.log(buffer.toString('base64'));
    console.log(message);
    
    // Decode a buffer
    //var message = RequestEnvelope.decode(reqBuffer);
    
    //console.log(message);
});

//var authBody = fs.readFileSync('authBody.bin');

/* request({
  url: 'https://swprod.capitalgames.com/rpc',
  method: 'POST',
  encoding: null,
  headers: {
    'Content-Type': 'application/x-protobuf',
    'X-Unity-Version': '5.3.5p8',
    'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 6.0.1; Nexus 5 Build/M4B30X)',
    'Connection': 'Keep-Alive',
    'Accept-Encoding': 'gzip',
  },
  body: authBody,
}, function(error, response, body){
  protobuf.load(['protos/ResponseEnvelope.proto', 'protos/AuthGuestResponse.proto'], function(err, root) {
    if (err) throw err;
    
    var ResponseEnvelope = root.lookup('Protos.ResponseEnvelope');
    var AuthGuestResponse = root.lookup('Protos.AuthGuestResponse');
    
    var message = ResponseEnvelope.decode(body);
    console.log(JSON.stringify(message));
    if (message.content_encoding) {
      zlib.gunzip(new Buffer(message.payload), function(err, buffer) {
        if (!err) {
          var authMessage = AuthGuestResponse.decode(buffer);
          console.log(JSON.stringify(authMessage));
        } else {
          console.log(err);
        }
      });
    } else {
      var authMessage = AuthGuestResponse.decode(message.payload);
      console.log(JSON.stringify(authMessage));
    }
  });
}); */
