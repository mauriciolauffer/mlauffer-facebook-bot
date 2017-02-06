'use strict';

const express = require('express');
const request = require('request');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).send('Lauffer Bot deployed!');
});

router.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === process.env.VERIFICATION_TOKEN) {
    console.log('Verified webhook');
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error('Verification failed. The tokens do not match.');
    res.status(403).send('Verification failed. The tokens do not match.');
  }
});

router.post('/webhook', (req, res) => {
  // Make sure this is a page subscription
  if (req.body.object === 'page') {
    // Iterate over each entry there may be multiple entries if batched
    req.body.entry.forEach((entry) => {
      // Iterate over each messaging event
      entry.messaging.forEach((event) => {
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

    console.log('Received message from senderId: ' + senderId);
    console.log('Message is: ' + JSON.stringify(message));

    // You may get a text or attachment but not both
    if (message.text) {
      let formattedMsg = message.text.toLowerCase().trim();
      switch (formattedMsg) {
        case 'mapa':
        case 'capital':
        case 'moeda':
        case 'população':
          getCountryDetail(senderId, formattedMsg);
          break;

        default:
          findCountry(senderId, formattedMsg);
      }
    } else if (message.attachments) {
      sendMessage(senderId, {text: 'Desculpe, Não entendi sua requisição...'});
    }
  }
}

function processPostback(event) {
  let senderId = event.sender.id;
  let payload = event.postback.payload;
  if (payload === 'Greeting') {
    // Get user's first name from the User Profile API and include it in the greeting
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
        console.log("Error getting user's name: " + error);
      } else {
        let bodyObj = JSON.parse(body);
        let name = bodyObj.first_name;
        greeting = 'Olá ' + name + '. ';
      }
      let message = greeting + 'Meu nome é TripBot, eu sou um robô. Eu posso te falar informações sobre alguns países. Qual país você gostaria de conhecer?';
      sendMessage(senderId, {text: message});
    });
  } else if (payload === 'Correto') {
    sendMessage(senderId, {text: "Sweet! O que você gostaria de ver? Digite: 'mapa', 'capital', 'moeda', 'população' para mais detalhes."});
  } else if (payload === 'Incorreto') {
    sendMessage(senderId, {text: 'Oops! Deu zica! Tente digitar o nome do país corretamente  =)'});
  }
}

// sends message to user
function sendMessage(recipientId, message) {
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
      console.log('Error sending message: ' + response.error);
    }
  });
}

function getCountryDetail(userId, field) {
  request('https://restcountries.eu/rest/v1/name/' + countryName, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      let message;
      let countries = JSON.parse(body);
      let country = countries[0];
      if (country) {
        message = {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: [{
                title: country.name.concat(' (', country.nativeName, ')')
              }]
            }
          }
        };
        switch (field) {
          case 'mapa':
            let mapUrl = 'https://www.google.com.au/maps/';
            if (country.latlng.length) {
              mapUrl = mapUrl.concat('/search/', country.name);
            } else {
              mapUrl = mapUrl.concat('@', country.latlng[0], ',', country.latlng[1], ',7z');
            }
            message.attachment.payload.elements[0].subtitle = 'Veja o mapa do país';
            message.attachment.payload.elements[0].buttons = [{
              type: 'web_url',
              title: 'Google Maps'
            }];
            break;
          case 'capital':
            message.attachment.payload.elements[0].subtitle = 'Capital: ' + country.capital;
            break;
          case 'moeda':
            message.attachment.payload.elements[0].subtitle = 'Moeda: ' + country.currencies[0];
            break;
          case 'população':
            message.attachment.payload.elements[0].subtitle = 'População: ' + country.population;
            break;
          default:
            break;
        }
        sendMessage(userId, message);

      } else {
        console.log('Oops! Deu algum erro por aqui...');
        sendMessage(userId, {text: 'Oops! Deu algum erro por aqui...'});
      }
    } else {
      sendMessage(userId, {text: 'Oops! Deu algum erro por aqui...'});
    }
  });
}

function findCountry(userId, countryName) {
  request('https://restcountries.eu/rest/v1/name/' + countryName, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      let countries = JSON.parse(body);
      let country = countries[0];
      if (country) {
        let message = {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: [{
                title: country.name.concat(' (', country.nativeName, ')'),
                subtitle: 'Este é o país que você está procurando?',
                image_url: 'http://www.geognos.com/api/en/countries/flag/' + country.alpha2Code + '.png',
                buttons: [{
                  type: 'postback',
                  title: 'Sim',
                  payload: 'Correto'
                }, {
                  type: 'postback',
                  title: 'Não',
                  payload: 'Incorreto'
                }]
              }]
            }
          }
        };
        sendMessage(userId, message);

      } else {
        console.log('Oops! Deu algum erro por aqui...');
        sendMessage(userId, {text: 'Oops! Deu algum erro por aqui...'});
      }
    } else {
      sendMessage(userId, {text: 'Oops! Deu algum erro por aqui...'});
    }
  });
}

module.exports = router;
