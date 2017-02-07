'use strict';

global.__appRoot = __dirname;

const path = require('path');
const bodyParser = require('body-parser');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const express = require('express');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const port = process.env.PORT || 3000;
const app = express();

app.use(compression());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(helmet());
app.use(morgan('combined'));
app.use('/', require('./routes/bot'));

if (cluster.isMaster) {
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  // Listen to worker exiting
  cluster.on('exit', (worker, code, signal) => {
    console.info('Worker ' + worker.process.pid + ' died!');
    if (signal) {
      console.info('Worker was killed by signal: ' + signal);
    } else if (code !== 0) {
      console.info('Worker exited with error code: ' + code);
    } else {
      console.info('Worker success!');
    }
  });
} else {
  // Workers can share any TCP connection
  app.listen(port, () => {
    console.info('Listening port: ' + port);
  });
}
