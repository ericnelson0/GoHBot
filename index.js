const fs = require('fs');
const Discord = require('discord.js');
const moment = require('moment-timezone');
const limit = require("simple-rate-limiter");
const request = require('request');
const schedule = require('node-schedule');
const zlib = require('zlib');
const uuid = require('node-uuid');
const google = require('googleapis');
const googleAuth = require('google-auth-library');
const messageGuestReqs = require('./build/protos/AuthGuestRequest_pb.js');
const messageGuestResps = require('./build/protos/AuthGuestResponse_pb.js');
const messageReqEnvelopes = require('./build/protos/RequestEnvelope_pb.js');
const messageRespEnvelopes = require('./build/protos/ResponseEnvelope_pb.js');
const messageGuildReqs = require('./build/protos/GetGuildRequest_pb.js');
const messageGuildResps = require('./build/protos/GetGuildResponse_pb.js');
const _ = require('underscore');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/sheets.googleapis.com-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-nodejs-quickstart.json';
var oauth2Client = null;
var guildMembers = {};
var monitorJob = null;
var sheets = google.sheets('v4');
var sheetsAppend = limit(sheets.spreadsheets.values.append).to(1).per(1000);
var sheetsUpdate = limit(sheets.spreadsheets.values.update).to(1).per(1000);


const client = new Discord.Client({autoReconnect:true});

const swChannelId = '218823335738343424';
const testChannelId = '173524646690422784';

const currentRancorCap = '500,000';

const charLookupRE = /!char\s+([A-Za-z0-9_-]+)/;
const tankDmgRE = /!tank\s+([0-9]+)/;
const defaultChannelId = swChannelId;

const activities = ['Cantina battles', 'Light side battles', 'Galactic wars', 'Hard mode battles', 'Challenges', 'Dark-side battles', 'PVP battles'];

var reminderJob = null;
var monitorJob = null;

function authReqFinished(error, response, body) {
  if(error) console.log(error);
  var respEnvObj = proto.Protos.ResponseEnvelope.deserializeBinary(new Uint8Array(body));
  if (respEnvObj.getContentEncoding()) {
    zlib.gunzip(new Buffer(respEnvObj.getPayload()), function(err, buffer) {
      if (!err) {
        var authResp = proto.Protos.AuthGuestResponse.deserializeBinary(new Uint8Array(buffer));
        var authObj = authResp.toObject();
        if (monitorJob) {
          monitorJob.cancel();
        }

        var rule = new schedule.RecurrenceRule();
        rule.minute = new schedule.Range(0, 59, 5);

        monitorJob = schedule.scheduleJob(rule, function() {
          doGuildRequest(authObj);
        });
      }
    });
  } else {
    var authResp = proto.Protos.AuthGuestResponse.deserializeBinary(new Uint8Array(respEnvObj.getPayload()));
    var authObj = authResp.toObject();

    if (monitorJob) {
      monitorJob.cancel();
    }

    var rule = new schedule.RecurrenceRule();
    rule.minute = new schedule.Range(0, 59, 5);

    monitorJob = schedule.scheduleJob(rule, function() {
      doGuildRequest(authObj);
    });
  }
}

function appendRaidDamage(guildObj) {
  console.log(monitorJob);
  if (guildObj.guild.raidStatusList.length === 0) {
    monitorJob.cancel();
    return; // We're done
  }

  // Update who's in guild
  updateGuildMembers(guildObj.guild.memberList);

  // Let's build a header for every guild member so their damage is easily tracked
  var guildMemberIds = _.keys(guildMembers).sort();
  var headers = _.map(guildMemberIds, function(id) {
    return '=VLOOKUP("' + id + '", Players!A1:B51, 2, FALSE)';
  });
  updateSheetRange('rancor', 'A1:AX1', [headers]);
  updateSheetRange('aat', 'A1:AX1', [headers]);

  // Now update damage values
  for (var i = 0; i < guildObj.guild.raidStatusList.length; ++i) {
    var status = guildObj.guild.raidStatusList[i];
    appendValues(status.raidId, [getValuesList(guildMembers, status.raidMemberList)]);
  }
}

function guidReqFinished(error, response, body) {
  if (error) {
    console.log(error);
    return;
  }

  var respEnvObj = proto.Protos.ResponseEnvelope.deserializeBinary(new Uint8Array(body));
  if (respEnvObj.getContentEncoding()) {
    zlib.gunzip(new Buffer(respEnvObj.getPayload()), function(err, buffer) {
      if (!err) {
        var guildResp = proto.Protos.GetGuildResponse.deserializeBinary(new Uint8Array(buffer));
        var guildObj = guildResp.toObject();
        appendRaidDamage(guildObj);
      } else {
        console.log(err);
      }
    });
  } else {
    var guildResp = proto.Protos.GetGuildResponse.deserializeBinary(respData.getPayload());
    var guildObj = guildResp.toObject();
    appendRaidDamage(guildObj);
  }
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
  GOHServiceCall("AuthRpc", "DoAuthGuest", authRequest.serializeBinary(), null, authReqFinished);
}

function doGuildRequest(authObj) {
  GOHServiceCall("GuildRpc", "GetGuild", null, authObj, guidReqFinished);
}

function buildRequestEnvelope(serviceName, methodName, payload, authObj) {
  var reqEnv = new proto.Protos.RequestEnvelope();
  reqEnv.setCorrelationId(0);
  reqEnv.setServiceName(serviceName);
  reqEnv.setMethodName(methodName);
  if (authObj!==null) {
    reqEnv.setAuthId(authObj.authId);
    reqEnv.setAuthToken(authObj.authToken);
  }
  if (payload!==null) {
    reqEnv.setPayload(payload);
  }
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

function GOHServiceCall(serviceName, methodName, payload, authObj, callback) {
  var reqEnv = buildRequestEnvelope(serviceName, methodName, payload, authObj);
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
    body: reqEnv,
  }, callback);
}

function doSheetsAuth() {
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
}

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
  sheetsAppend({
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
  sheetsUpdate({
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
    console.log(_.findWhere(member.memberContributionList, { type: 1 }));
    member.lastActivityTime = '=U2Gtime(' + member.lastActivityTime + ')';
    var playerInfo = _.values(_.omit(member, 'memberContributionList'));
    // type 1 == Guild currency
    var guildCurr = _.findWhere(member.memberContributionList, { type: 1 });
    playerInfo.push(guildCurr.currentValue, guildCurr.lifetimeValue);
    // type 2 == Raid tickets
    var raidTix = _.findWhere(member.memberContributionList, { type: 2 });
    playerInfo.push(raidTix.currentValue, raidTix.lifetimeValue);
    // type 3 == Donations
    var donations = _.findWhere(member.memberContributionList, { type: 3 });
    playerInfo.push(donations.currentValue, donations.lifetimeValue);
    guildMembers[member.playerId] = member;
    // Plus 2 for header and we need to start indexing from 1
    updateSheetRange('Players', 'A' + (idx + 2) + ':P' + (idx + 2), [playerInfo]);
  });
}

function linkChar(message) {
  var charMatch = message.content.match(charLookupRE);
  message.reply('https://swgoh.gg/characters/' + charMatch[1] + '/');
}

function linkMeta(message) {
  message.reply('https://swgoh.gg/meta-report/');
}

function postReminders() {
  var channel = client.channels.get(defaultChannelId);
  var day = moment().tz("America/Denver").day();
  switch (day) {
    case 0: // Sunday
      channel.sendMessage("REMINDER: Save your galactic wars tomorrow to maximize guild currency!");
      break;
    case 1:
      channel.sendMessage("REMINDER: Save your galactic wars today and tomorrow to maximize guild currency!");
      break;
    case 5:
      channel.sendMessage("REMINDER: Wait on your PVP battles until guild reset tomorrow to maximize guild currency!");
      break;
    default: break;
  }
  channel.sendMessage(activities[(day) % 7] + ' are the guild activity for today.');
}

function getTimeToReset(message) {
  var now = moment().tz("America/Denver");
  var then = moment().tz("America/Denver").startOf('day').hour(19).minute(30);
  message.reply(moment.utc(moment(then.diff(now))).format("HH:mm:ss"));
}

function getServerTime(message) {
  var d = new Date();
  message.reply(d.toString());
}
//['Cantina battles', 'Light side battles', 'Galactic wars', 'Hard mode battles', 'Challenges', 'Dark-side battles', 'PVP battles'];
function mod(n, m) {
  return ((n % m) + m) % m;
}

function getGuildActivity(message) {
  var now = moment().tz("America/Denver");
  var then = moment().tz("America/Denver").startOf('day').hour(19).minute(30);
  var day = now.day();
  var isAfterReset = now >= then;

  day = (isAfterReset) ? day : mod((day - 1), 7);
  message.reply(activities[(day % 7)] + ' are the guild activity as of now.');
}

function printHelp(message) {
  message.reply('Commands:\n !meta - show the current meta characters\n !char <char-name> - lookup a character\n !reset - print time to reset\n !activity - print the activity as of now\n !help - print this message\n !rancor - print rancor damage per phase\n !tank - print tank damage per phase\n !rules - print our raid rules');
}

function printRancorDMG(message) {
  var dmgMsg =  'Rancor raid damage values per phase:\n\n' +
                'Heroic:\n' +
                'Phase I: 1,800,000 500K: 27.77%\n' +
                'Phase II: 3,000,000 500K: 16.66%\n' +
                'Phase III: 3,300,000 500K: 15.15%\n' +
                'Phase IV: 2,100,000 500K: 23.80%';
  message.reply(dmgMsg);
}

function printTankDMG(message) {
  var dmgMsg =  'Tank raid damage values per phase:\n\n' +
                'Normal:\n' +
                'Phase I: 15,600,000\n' +
                'Phase II: 22,700,000\n' +
                'Phase III: 12,250,000\n' +
                'Phase IV: 13,550,000\n\n' +
                'Heroic:\n' +
                'Phase I: 4,300,000\n' +
                'Phase II: 19,200,000\n' +
                'Phase III: 12,000,000\n' +
                'Phase IV: 12,000,000';
  message.reply(dmgMsg);
}

function printRules(message) {
  message.reply('The tank raid is a free-for-all.\nFor the rancor raid each player should do no more than the current cap of ' + currentRancorCap + '. After a 24 hour period it becomes a free-for-all.');
}

function monitorRaids(message) {
  let adminRole = message.guild.roles.find("name", "Admin");
  if (message.member.roles.has(adminRole.id)) {
    startRaidMonitor();
    message.reply("Monitoring raids");
  } else {
    message.reply("You don't have the required permissions.");
  }
}

function startRaidMonitor() {
  doSheetsAuth();
  doAuthGuest();
}

var commandMap = {
  '!meta' : linkMeta,
  '!char' : linkChar,
  '!reset' : getTimeToReset,
  '!activity' : getGuildActivity,
  '!servertime' : getServerTime,
  '!help' : printHelp,
  '!rancor' : printRancorDMG,
  '!tank' : printTankDMG,
  '!rules' : printRules,
  '!monitor' : monitorRaids
};

client.on('ready', () => {
  console.log('I am ready!');

  if (reminderJob) {
    reminderJob.cancel();
  }

  var rule = new schedule.RecurrenceRule();
  rule.dayOfWeek = new schedule.Range(0, 6);
  rule.hour = 1;
  rule.minute = 30;

  reminderJob = schedule.scheduleJob(rule, postReminders);
});

client.on('disconnected', function (e) {
	console.log(e);
  client.destroy().then(client.login.bind(client));
});

client.on('message', message => {
  var command = message.content.split(' ')[0];
  if (command.startsWith('!')) {
    if (commandMap[command]) {
      commandMap[command](message);
    }
  }
});

client.login('MjQyNDI5NDI1NzQ2OTY4NTc3.CvgVAg.ihSQRnpK-eVIfebwoAbC1Iajo8g');
