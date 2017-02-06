'use strict';

const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).send('Lauffer Bot deployed!');
});

router.get('/webhook', (req, res) => {
  if (req.query["hub.verify_token"] === process.env.VERIFICATION_TOKEN) {
    console.log("Verified webhook");
    res.status(200).send(req.query["hub.challenge"]);
  } else {
    console.error("Verification failed. The tokens do not match.");
    res.status(403).send('Verification failed. The tokens do not match.');
  }
});

router.post('/webhook', (req, res) => {
  // Make sure this is a page subscription
  if (req.body.object === "page") {
    // Iterate over each entry there may be multiple entries if batched
    req.body.entry.forEach(function (entry) {
      // Iterate over each messaging event
      entry.messaging.forEach(function (event) {
        if (event.postback) {
          processPostback(event);
        } else if (event.message) {
          processMessage(event);
        }
      });
    });
    res.sendStatus(200);
  } else {
    res.status(400).send('Object is invalid.');
  }
});

function processMessage(event) {
  if (!event.message.is_echo) {
    let message = event.message;
    let senderId = event.sender.id;

    console.log("Received message from senderId: " + senderId);
    console.log("Message is: " + JSON.stringify(message));

    sendMessage(senderId, {text: "Sorry, I don't understand your request."});

    // You may get a text or attachment but not both
    /*if (message.text) {
     var formattedMsg = message.text.toLowerCase().trim();

     // If we receive a text message, check to see if it matches any special
     // keywords and send back the corresponding movie detail.
     // Otherwise, search for new movie.
     switch (formattedMsg) {
     case "plot":
     case "date":
     case "runtime":
     case "director":
     case "cast":
     case "rating":
     getMovieDetail(senderId, formattedMsg);
     break;

     default:
     findMovie(senderId, formattedMsg);
     }
     } else if (message.attachments) {
     sendMessage(senderId, {text: "Sorry, I don't understand your request."});
     }*/
  }
}

function processPostback(event) {
  let senderId = event.sender.id;
  let payload = event.postback.payload;

  if (payload === "Greeting") {
    // Get user's first name from the User Profile API and include it in the greeting
    fetch('https://graph.facebook.com/v2.6/' + senderId + '?access_token=process.env.PAGE_ACCESS_TOKEN&fields=first_name')
      .then(function (res) {
        let greeting = "";
        if (!res.ok) {
          console.log("Error getting user's name: " + res.statusText);
        } else {
          let body = JSON.parse(body);
          let name = body.first_name;
          greeting = "Hi " + name + ". ";
        }
        let message = greeting + "My name is SP Movie Bot. I can tell you various details regarding movies. What movie would you like to know about?";
        sendMessage(senderId, {text: message});
      })
      .catch((res) => {
        console.log("Error sending message: " + response.statusText);
      });
  } else {
    sendMessage(senderId, {text: 'Generic message for test'});
  }
}

// sends message to user
function sendMessage(recipientId, message) {
  fetch('https://graph.facebook.com/v2.6/me/messages?access_token=' + process.env.PAGE_ACCESS_TOKEN, {
    method: 'POST',
    body: JSON.stringify({
      recipient: {id: recipientId},
      message: message,
    })
  })
    .then((res) => {
      if (!res.ok) {
        console.log("Error sending message: " + response.statusText);
      }
    })
    .catch((res) => {
      console.log("Error sending message: " + response.statusText);
    });
}

module.exports = router;
