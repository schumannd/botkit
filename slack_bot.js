/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
           ______     ______     ______   __  __     __     ______
          /\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
          \ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
           \ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
            \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/


This is a sample Slack bot built with Botkit.

This bot demonstrates many of the core features of Botkit:

* Connect to Slack using the real time API
* Receive messages based on "spoken" patterns
* Reply to messages
* Use the conversation system to ask questions
* Use the built in storage system to store and retrieve information
  for a user.

# RUN THE BOT:

  Get a Bot token from Slack:

    -> http://my.slack.com/services/new/bot

  Run your bot from the command line:

    token=<MY TOKEN> node slack_bot.js

# USE THE BOT:

  Find your bot inside Slack to send it a direct message.

  Say: "Hello"

  The bot will reply "Hello!"

  Say: "who are you?"

  The bot will tell you its name, where it running, and for how long.

  Say: "Call me <nickname>"

  Tell the bot your nickname. Now you are friends.

  Say: "who am I?"

  The bot will tell you your nickname, if it knows one for you.

  Say: "shutdown"

  The bot will ask if you are sure, and then shut itself down.

  Make sure to invite your bot into other channels using /invite @<my bot>!

# EXTEND THE BOT:

  Botkit has many features for building cool and useful bots!

  Read all about it here:

    -> http://howdy.ai/botkit

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/


var FormData = require('form-data');
var request = require('request');
const http = require('http');
const https = require('https');
var fs = require('fs');



if (!process.env.slack_token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('./lib/Botkit.js');
var os = require('os');

var controller = Botkit.slackbot({
    debug: true,
});

var bot = controller.spawn({
    token: process.env.slack_token
}).startRTM();

MESSAGES = {};

function check_complete_query(bot, message){
  if(MESSAGES[message['user']] === undefined){
    bot.reply(message, 'Now what do you want to know about that picture?');
  }else if(!fs.existsSync(message['user'] + '.jpeg')){
    bot.reply(message, 'I have not yet recieved a picture that I can analyze.');
  }
  else{
    formData = {
      image: fs.createReadStream(message['user'] + '.jpeg'),
      question: MESSAGES[message['user']]
    }

    apiRequest = request.post({url:'http://roboteyes-api.herokuapp.com', formData: formData}, function optionalCallback(err, httpResponse, body) {
      if (err) {
        return console.error('upload failed:', err);
      }

      bot.reply(message, body);
    });
  }
}

controller.hears(['(.*)'], 'direct_message', function(bot, message) {
  console.log(message);
  MESSAGES[message['user']] = message['text'];
  check_complete_query(bot, message);
});


controller.hears(['(.*)'], 'file_shared,file_share', function(bot, message) {
    bot.reply(message, "Let's take a look...");

    var file = fs.createWriteStream(message['user'] + 'jpeg');

    var options = {
      url: message['file']['url_private_download'].replace("https", "http"),
      headers: {
        'Authorization': 'Bearer ' + process.env.slack_token
      }
    };

    request(options)
      .pipe(fs.createWriteStream(message['user'] + '.jpeg'))
      .on('close', function() {

        // http://roboteyes-api.herokuapp.com
        if (message["file"]["comments_count"] > 0) {
          MESSAGES[message['user']] = message["file"]["initial_comment"]["comment"];
        }
        check_complete_query(bot, message);
      });


});

function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}
