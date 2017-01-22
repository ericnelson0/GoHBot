var fs = require('fs');
var _ = require('underscore');
var request = require('request');
var zlib = require('zlib');
var uuid = require('node-uuid');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var messageGuestReqs = require('./build/protos/AuthGuestRequest_pb.js');
var messageGuestResps = require('./build/protos/AuthGuestResponse_pb.js');
var messageReqEnvelopes = require('./build/protos/RequestEnvelope_pb.js');
var messageRespEnvelopes = require('./build/protos/ResponseEnvelope_pb.js');
var messageGuildReqs = require('./build/protos/GetGuildRequest_pb.js');
var messageGuildResps = require('./build/protos/GetGuildResponse_pb.js');

var promise = new Promise(function(resolve, reject) {
  doAuthGuest()

  if (/* everything turned out fine */) {
    resolve("Stuff worked!");
  } else {
    reject(Error("It broke"));
  }
});

function requestFinished(error, response, body) {
  console.log(error);
  console.log(body);
}

function doAuthGuest() {
  var authRequest = new proto.Protos.AuthGuestRequest();
  authRequest.setUid("9d3d228b13795a0cbc68a2510b722060");
  authRequest.setDevicePlatform("Android");
  authRequest.setLanguage("en");
  authRequest.setPlayerName("");
  authRequest.setBundleId("com.ea.game.starwarscapital_row");
  authRequest.setRegion("NA");
  authRequest.setLocalTimeZoneOffsetMinutes(480);
  GOHServiceCall("AuthRpc", "DoAuthGuest", authRequest.serializeBinary());
}

function buildRequestEnvelope(serviceName, methodName, payload) {
  var reqEnv = new proto.Protos.RequestEnvelope();
  reqEnv.setCorrelationId(0);
  reqEnv.setServiceName(serviceName);
  reqEnv.setMethodName(methodName);
  reqEnv.setPayload(payload);
  reqEnv.setClientVersion(181815);
  var clientStartupTime = Math.floor((new Date).getTime() / 1000) - 10;
  reqEnv.setClientStartupTimestamp(clientStartupTime);
  reqEnv.setPlatform("Android");
  reqEnv.setRegion("NA");
  reqEnv.setClientExternalVersion("0.7.4");
  reqEnv.setClientInternalVersion("0.7.181815");
  reqEnv.setRequestId(uuid.v4());
  reqEnv.setAcceptEncoding(1);
  var currentClientTime = clientStartupTime + 8;
  reqEnv.setCurrentClientTime(currentClientTime);
  reqEnv.setNimbleSessionId("201701141659074633725979");
  reqEnv.setTimezone("CST");
  reqEnv.setCarrier("46000")
  reqEnv.setNetworkAccess("W");
  reqEnv.setHardwareId("14480");
  reqEnv.setAndroidId("9001048633645127");
  reqEnv.setSynergyId("10552419550");
  reqEnv.setDeviceModel("samsung GT-P5210");
  reqEnv.setDeviceId("9d29641dc261454239456122f13de042b3a0cc3f45d4c27e7ddc97b300eb57ae");
  return reqEnv.serializeBinary();
}

function GOHServiceCall(serviceName, methodName, payload, callback) {
  var reqEnv = buildRequestEnvelope(serviceName, methodName, payload);
  request({
    url: 'https://swprod.capitalgames.com/rpc',
    method: 'POST',
    encoding: null,
    headers: {
      'Content-Type': 'application/x-protobuf',
      'X-Unity-Version': '5.3.5p8',
      'User-Agent': 'Dalvik/1.6.0 (Linux; U; Android 4.2.2; GT-P5210 Build/JDQ39E)',
      'Connection': 'Keep-Alive',
      'Accept-Encoding': 'gzip',
    },
    body: binaryEnv,
  }, callback);
}

doAuthGuest();
return;

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/sheets.googleapis.com-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-nodejs-quickstart.json';
var oauth2Client = null;
var guildMembers = {};
var sheets = google.sheets('v4');

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Sheets API.
  authorize(JSON.parse(content));
});

var authRequest = new proto.Protos.AuthGuestRequest();

authRequest.setUid("9d3d228b13795a0cbc68a2510b722060");
authRequest.setDevicePlatform("Android");
authRequest.setLanguage("en");
authRequest.setPlayerName("");
authRequest.setBundleId("com.ea.game.starwarscapital_row");
authRequest.setRegion("NA");
authRequest.setLocalTimeZoneOffsetMinutes(480);

var binaryReq = authRequest.serializeBinary();

//console.log(binaryReq);

var authRequestDecoded = proto.Protos.AuthGuestRequest.deserializeBinary(binaryReq);

var reqEnv = new proto.Protos.RequestEnvelope();
reqEnv.setCorrelationId(0);
reqEnv.setServiceName("AuthRpc");
reqEnv.setMethodName("DoAuthGuest");
reqEnv.setPayload(binaryReq);
reqEnv.setClientVersion(181815);
var clientStartupTime = Math.floor((new Date).getTime() / 1000) - 10;
reqEnv.setClientStartupTimestamp(clientStartupTime);
reqEnv.setPlatform("Android");
reqEnv.setRegion("NA");
reqEnv.setClientExternalVersion("0.7.4");
reqEnv.setClientInternalVersion("0.7.181815");
reqEnv.setRequestId(uuid.v4());
reqEnv.setAcceptEncoding(1);
var currentClientTime = clientStartupTime + 8;
reqEnv.setCurrentClientTime(currentClientTime);
reqEnv.setNimbleSessionId("201701141659074633725979");
reqEnv.setTimezone("CST");
reqEnv.setCarrier("46000")
reqEnv.setNetworkAccess("W");
reqEnv.setHardwareId("14480");
reqEnv.setAndroidId("9001048633645127");
reqEnv.setSynergyId("10552419550");
reqEnv.setDeviceModel("samsung GT-P5210");
reqEnv.setDeviceId("9d29641dc261454239456122f13de042b3a0cc3f45d4c27e7ddc97b300eb57ae");

var binaryEnv = reqEnv.serializeBinary();

request({
  url: 'https://swprod.capitalgames.com/rpc',
  method: 'POST',
  encoding: null,
  headers: {
    'Content-Type': 'application/x-protobuf',
    'X-Unity-Version': '5.3.5p8',
    'User-Agent': 'Dalvik/1.6.0 (Linux; U; Android 4.2.2; GT-P5210 Build/JDQ39E)',
    'Connection': 'Keep-Alive',
    'Accept-Encoding': 'gzip',
  },
  body: binaryEnv,
}, function(error, response, body) {
  var respData = proto.Protos.ResponseEnvelope.deserializeBinary(new Uint8Array(body));
  var respObj = respData.toObject();
  //console.log(respObj);

  if (respData.getContentEncoding()) {
    zlib.gunzip(new Buffer(respData.getPayload()), function(err, buffer) {
      if (!err) {
        var authResp = proto.Protos.AuthGuestResponse.deserializeBinary(new Uint8Array(buffer));
        var authObj = authResp.toObject();
        //console.log(authObj);
        var  guildReqEnv = new proto.Protos.RequestEnvelope();
        guildReqEnv.setCorrelationId(1);
        guildReqEnv.setServiceName("GuildRpc");
        guildReqEnv.setMethodName("GetGuild");
        guildReqEnv.setAuthId(authObj.authId);
        guildReqEnv.setAuthToken(authObj.authToken);
        guildReqEnv.setClientVersion(181815);
        guildReqEnv.setClientStartupTimestamp(clientStartupTime);
        guildReqEnv.setPlatform("Android");
        guildReqEnv.setRegion("NA");
        guildReqEnv.setClientExternalVersion("0.7.4");
        guildReqEnv.setClientInternalVersion("0.7.181815");
        guildReqEnv.setRequestId(uuid.v4());
        guildReqEnv.setAcceptEncoding(1);
        var currentClientTime = clientStartupTime + 10;
        guildReqEnv.setCurrentClientTime(currentClientTime);
        guildReqEnv.setNimbleSessionId("201701141659074633725979");
        guildReqEnv.setTimezone("CST");
        guildReqEnv.setCarrier("46000")
        guildReqEnv.setNetworkAccess("W");
        guildReqEnv.setHardwareId("18157");
        guildReqEnv.setAndroidId("9001048633645127");
        guildReqEnv.setSynergyId("10552419550");
        guildReqEnv.setDeviceModel("samsung GT-P5210");
        guildReqEnv.setDeviceId("9d29641dc261454239456122f13de042b3a0cc3f45d4c27e7ddc97b300eb57ae");

        var binaryGuildEnv = guildReqEnv.serializeBinary();

        request({
          url: 'https://swprod.capitalgames.com/rpc',
          method: 'POST',
          encoding: null,
          headers: {
            'Content-Type': 'application/x-protobuf',
            'X-Unity-Version': '5.3.5p8',
            'User-Agent': 'Dalvik/1.6.0 (Linux; U; Android 4.2.2; GT-P5210 Build/JDQ39E)',
            'Connection': 'Keep-Alive',
            'Accept-Encoding': 'gzip',
          },
          body: binaryGuildEnv,
        }, function(error, response, body) {
          var respData = proto.Protos.ResponseEnvelope.deserializeBinary(new Uint8Array(body));
          var respObj = respData.toObject();
          console.log(respObj);
          console.log('\n\n\n');

          if (respData.getContentEncoding()) {
            zlib.gunzip(new Buffer(respData.getPayload()), function(err, buffer) {
              if (!err) {
                var guildResp = proto.Protos.GetGuildResponse.deserializeBinary(new Uint8Array(buffer));
                var guildObj = guildResp.toObject();
                updateGuildMembers(guildObj.guild.memberList);
                console.log(guildObj);
                console.log('\n\n\n');
                var guildMemberIds = _.keys(guildMembers).sort();
                var headers = _.map(guildMemberIds, function(id) {
                  return '=VLOOKUP("' + id + '", Players!A1:B51, 2, FALSE)';
                });
                updateSheetRange('rancor', 'A1:AX1', [headers]);
                updateSheetRange('aat', 'A1:AX1', [headers]);
                for (var i = 0; i < guildObj.guild.raidStatusList.length; ++i) {
                  var status = guildObj.guild.raidStatusList[i];
                  appendValues(status.raidId, [getValuesList(guildMembers, status.raidMemberList)]);
                }
              } else {
                console.log(err);
              }
            });
          } else {
            var guildResp = proto.Protos.GetGuildResponse.deserializeBinary(respData.getPayload());
            var guildObj = guildResp.toObject();
            console.log(guildObj);
          }
        });
      } else {
        console.log(err);
      }
    });
  } else {
    var authResp = proto.Protos.AuthGuestResponse.deserializeBinary(respData.getPayload());
    var authObj = authResp.toObject();
    //console.log(authObj);
    var  guildReqEnv = new proto.Protos.RequestEnvelope();
    guildReqEnv.setCorrelationId(1);
    guildReqEnv.setServiceName("GuildRpc");
    guildReqEnv.setMethodName("GetGuild");
    guildReqEnv.setAuthId(authObj.authId);
    guildReqEnv.setAuthToken(authObj.authToken);
    guildReqEnv.setClientVersion(181815);
    guildReqEnv.setClientStartupTimestamp(clientStartupTime);
    guildReqEnv.setPlatform("Android");
    guildReqEnv.setRegion("NA");
    guildReqEnv.setClientExternalVersion("0.7.4");
    guildReqEnv.setClientInternalVersion("0.7.181815");
    guildReqEnv.setRequestId(uuid.v4());
    guildReqEnv.setAcceptEncoding(1);
    var currentClientTime = clientStartupTime + 10;
    guildReqEnv.setCurrentClientTime(currentClientTime);
    guildReqEnv.setNimbleSessionId("201611150641243757340276");
    guildReqEnv.setTimezone("CST");
    guildReqEnv.setNetworkAccess("W");
    guildReqEnv.setHardwareId("18157");
    guildReqEnv.setAndroidId("20762407d970cd14");
    guildReqEnv.setSynergyId("10440050988");
    guildReqEnv.setDeviceModel("samsung GT-P5210");
    guildReqEnv.setDeviceId("039d7bffbd75ddade9d89f03bae3eee93b5dbb220fbd547bb685cfb9d60fd32b");

    var binaryGuildEnv = guildReqEnv.serializeBinary();

    request({
      url: 'https://swprod.capitalgames.com/rpc',
      method: 'POST',
      encoding: null,
      headers: {
        'Content-Type': 'application/x-protobuf',
        'X-Unity-Version': '5.3.5p8',
        'User-Agent': 'Dalvik/1.6.0 (Linux; U; Android 4.2.2; GT-P5210 Build/JDQ39E)',
        'Connection': 'Keep-Alive',
        'Accept-Encoding': 'gzip',
      },
      body: binaryGuildEnv,
    }, function(error, response, body) {
      var respData = proto.Protos.ResponseEnvelope.deserializeBinary(new Uint8Array(body));
      var respObj = respData.toObject();
      console.log(respObj);
      console.log('\n\n\n');

      if (respData.getContentEncoding()) {
        zlib.gunzip(new Buffer(respData.getPayload()), function(err, buffer) {
          if (!err) {
            var guildResp = proto.Protos.GetGuildResponse.deserializeBinary(new Uint8Array(buffer));
            var guildObj = guildResp.toObject();
            console.log(guildObj);
          } else {
            console.log(err);
          }
        });
      } else {
        var guildResp = proto.Protos.GetGuildResponse.deserializeBinary(respData.getPayload());
        var guildObj = guildResp.toObject();
        console.log(guildObj);
      }
    });
  }
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      console.log('Missing token');
    } else {
      oauth2Client.credentials = JSON.parse(token);
    }
  });
}

function getValuesList(guildMemberMap, raidMemberList) {
  var guildMemberIds = _.keys(guildMemberMap).sort();
  // var headers = _.map(guildMemberIds, function(id) {
  //   return '=VLOOKUP(' + id + ', Players!A1:B51, 2, FALSE)';
  // });
  var dmgMap = {};
  _.each(raidMemberList, function(memberStatus) {
    dmgMap[memberStatus.playerId] = memberStatus.memberProgress;
  });

  var dmgVals = [];
  _.each(guildMemberIds, function(memberId) {
    if (_.has(dmgMap, memberId)) {
      dmgVals.push(dmgMap[memberId]);
    } else {
      dmgVals.push(0);
    }
  });
  return dmgVals;
}

/**
 * Append raid data to spreadsheet
 * https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 */
function appendValues(sheetId, values) {
  sheets.spreadsheets.values.append({
    auth: oauth2Client,
    spreadsheetId: '14SdmJH5b1oE-VmsGkm4j7BpH23Bhdfx_scc8AQWU27g',
    range: sheetId,
    valueInputOption: 'USER_ENTERED',
    resource: {
      range: sheetId,
      majorDimension: "ROWS",
      values: values
    }
  }, function(err, response) {
    if (err) console.log(err);
    console.log(response);
  });
}

function clearMembersSheet() {
  sheets.spreadsheets.batchUpdate({
    auth: oauth2Client,
    spreadsheetId: '14SdmJH5b1oE-VmsGkm4j7BpH23Bhdfx_scc8AQWU27g',
    resource: {
      requests: [{
        updateCells: {
          range: {
            sheetId: 1066044824, // Players
          },
          fields: "userEnteredValue"
        }
      }]
    }
  }, function(err, response) {
    if (err) console.log(err);
    console.log(response);
  });
}

function updateSheetRange(sheetId, range, values) {
  sheets.spreadsheets.values.update({
    auth: oauth2Client,
    spreadsheetId: '14SdmJH5b1oE-VmsGkm4j7BpH23Bhdfx_scc8AQWU27g',
    range: sheetId + '!' + range,
    valueInputOption: 'USER_ENTERED',
    resource: {
      range: sheetId + '!' + range,
      majorDimension: "ROWS",
      values: values
    }
  }, function(err, response) {
    if (err) console.log(err);
    console.log(response);
  });
}

function updateGuildMembers(memberList) {
  var headers = [
    'Player ID', 'Player Name', 'Player Level', 'Member Level',
    'Leader Unit', 'Contribution', 'Guild XP', 'Last Activity Time',
    'Squad Power', 'Lifetime Contribution', 'Guild Currency Current', 'Guild Currency Lifetime',
    'Raid Tickets Current', 'Raid Tickets Lifetime', 'Donations Current', 'Donations Lifetime'
  ];
  updateSheetRange('Players', 'A1:P1', [headers]);
  _.each(memberList, function(member, idx) {
    member.lastActivityTime = '=U2Gtime(' + member.lastActivityTime + ')';
    var playerInfo = _.values(_.omit(member, 'memberContributionList'));
    // type 1 == Guild currency
    var guildCurr = _.findWhere(member.memberContributionList, function(contrib) { return contrib.type === 1; });
    playerInfo.push(guildCurr.currentValue, guildCurr.lifetimeValue);
    // type 2 == Raid tickets
    var raidTix = _.findWhere(member.memberContributionList, function(contrib) { return contrib.type === 2; });
    playerInfo.push(raidTix.currentValue, raidTix.lifetimeValue);
    // type 3 == Donations
    var donations = _.findWhere(member.memberContributionList, function(contrib) { return contrib.type === 3; });
    playerInfo.push(donations.currentValue, donations.lifetimeValue);
    guildMembers[member.playerId] = member;
    // Plus 2 for header and we need to start indexing from 1
    updateSheetRange('Players', 'A' + (idx + 2) + ':P' + (idx + 2), [playerInfo]);
  });
}