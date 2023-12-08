const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const emailerModule = require('./elkov-messaging-engine/emailer-module');
const loggingModule = require('./elkov-logging-engine/logging-module');
const securityModule = require('./elkov-security-engine/security-module');

const app = express();
const port = 10000;
app.use(express.json({ limit: process.env.PAYLOAD_SIZE_LIMIT }));
app.use(express.urlencoded({ limit: process.env.PAYLOAD_SIZE_LIMIT }));

app.use(bodyParser.json());
app.use(bodyParser.json({ limit: process.env.PAYLOAD_SIZE_LIMIT }));
app.use(bodyParser.urlencoded({ limit: process.env.PAYLOAD_SIZE_LIMIT, extended: true }));

function isJsonObject(obj) {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

async function callDefaultMap(req, res) {
  try {
    if (!req.body.to || req.body.to.length === 0) {
      res.status(400).json({ error: { code: 400, message: "No recipient provided for the e-mail." } });
    }
    else if (!req.body.subject || req.body.subject.length === 0) {
      res.status(400).json({ error: { code: 400, message: "No subject provided for the e-mail." } });
    }
    else if (!req.body.content || req.body.content.length === 0) {
      res.status(400).json({ error: { code: 400, message: "No recipient provided for the e-mail." } });
    }
    else {
      let content = req.body.content;
      if (isJsonObject(req.body.content)) {
        content = JSON.stringify(req.body.content, null, 2);
      }
    console.log("Received to " + req.body.to + ", subject " + req.body.subject + ", content: "+content);
    emailerModule.emailSendWithoutAttachment(req.body.to, req.body.subject, content);
    res.json({ status: "ok" });
    }
  }
  catch (error) {
    res.status(500).json(error);
  }
}

app.post('/', (req, res) => {
  securityModule.emailKeyAuthorization(req, res);
  callDefaultMap(req, res);
});

app.post('/attachment', (req, res) => {
  securityModule.emailKeyAuthorization(req, res);
  callDefaultMap(req, res);
});

// GET so Health Check are happy
app.get('/', (req, res) => {
  try {
    res.json({ status: "healthy" });
  }
  catch (error) {
    res.status(200).json(error);
  }
});
//

app.listen(port, () => {
  console.log(`ELKOV Email Microservice is running on port ${port}`);
});

app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'ELKOV');
  next();
});