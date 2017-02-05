'use strict';

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).send('Deployed!');
});

router.post('/webhook', (req, res) => {
  if (req.query["hub.verify_token"] === process.env.VERIFICATION_TOKEN) {
    console.log("Verified webhook");
    res.status(200).send(req.query["hub.challenge"]);
  } else {
    console.error("Verification failed. The tokens do not match.");
    res.status(403).send('Verification failed. The tokens do not match.');
  }
});

module.exports = router;
