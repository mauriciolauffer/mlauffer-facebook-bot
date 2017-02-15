'use strict';

const express = require('express');
const request = require('request');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).send('Lauffer Bot deployed!');
});

router.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === process.env.VERIFICATION_TOKEN) {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).send('Verification failed. The tokens do not match.');
  }
});

router.post('/webhook', (req, res) => {
  console.info('webhook...');
  if (req.body.object === 'page') {
    req.body.entry.forEach((entry) => {
      entry.messaging.forEach((event) => {
        if (event.optin) {
          console.info('receivedAuthentication');
        } else if (event.message) {
          console.info('receivedMessage');
          processMessage(event);
        } else if (event.delivery) {
          console.info('receivedDeliveryConfirmation');
        } else if (event.postback) {
          console.info('receivedPostback');
          processPostback(event);
        } else if (event.read) {
          console.info('receivedMessageRead');
        } else if (event.account_linking) {
          console.info('receivedAccountLink');
        } else {
          console.info("Webhook received unknown messagingEvent: ", event);
        }
      });
    });
    res.sendStatus(200);
  }
});

function processMessage(event) {
  console.info('processMessage...');
  if (!event.message.is_echo) {
    let message = event.message;
    let senderId = event.sender.id;
    console.info('Received message from senderId: ' + senderId);
    console.info('Message is: ' + JSON.stringify(message));
    if (message.text) {
      let formattedMsg = message.text.toLowerCase().trim();
      findCountry(senderId, formattedMsg);
    } else if (message.attachments) {
      sendMessage(senderId, {text: 'Desculpe, Não entendi sua requisição...'});
    } else {
      console.info('Not handled...');
    }
  }
}

function processPostback(event) {
  console.info('Payload is: ' + event.postback.payload);
  let senderId = event.sender.id;
  let payload = event.postback.payload;
  if (payload === 'Greeting') {
    request({
      url: 'https://graph.facebook.com/v2.6/' + senderId,
      qs: {
        access_token: process.env.PAGE_ACCESS_TOKEN,
        fields: 'first_name'
      },
      method: 'GET'
    }, (error, response, body) => {
      let greeting;
      if (error) {
        console.info("Error getting user's name: " + error);
      } else {
        let bodyObj = JSON.parse(body);
        greeting = 'Olá ' + bodyObj.first_name + '. ';
      }
      let message = greeting + 'Meu nome é TripBot, eu sou um robô em teste. Eu posso te falar algumas informações sobre países. Qual país você gostaria de conhecer?';
      sendMessage(senderId, {text: message});
    });
  } else {
    console.info('Not handled...');
  }
}

function sendMessage(recipientId, message) {
  console.info('sendMessage...');
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
    method: 'POST',
    json: {
      recipient: {id: recipientId},
      message: message,
    }
  }, (error, response, body) => {
    if (error) {
      console.info('Error sending message: ' + response.error);
    } else {
      console.info('Message sent');
    }
  });
}

function findCountry(userId, countryName) {
  console.info('findCountry...');
  let url = 'https://restcountries.eu/rest/v1/name/' + countryName + '?fullText=true';
  request(url, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      let countries = JSON.parse(body);
      let country = countries[0];
      if (country) {
        let mapUrl = 'https://www.google.com.au/maps/';
        if (country.latlng.length) {
          mapUrl = mapUrl.concat('@', country.latlng[0], ',', country.latlng[1], ',7z');
        } else {
          mapUrl = mapUrl.concat('search/', country.name);
        }
        let message = {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: [{
                title: country.name.concat(' (', country.nativeName, ')'),
                subtitle: 'Capital: ' + country.capital,
                image_url: 'http://www.geognos.com/api/en/countries/flag/' + country.alpha2Code + '.png',
                buttons: [{
                  type: 'web_url',
                  url: mapUrl,
                  title: 'Onde fica???'
                }]
              }]
            }
          }
        };
        sendMessage(userId, message);
      } else {
        sendMessage(userId, {text: 'Oops! Estranho... Não encontrei nenhum país chamado ' + countryName});
      }
    } else {
      sendMessage(userId, {text: 'Oops! Deu algum erro por aqui...'});
    }
  });
}

module.exports = router;
