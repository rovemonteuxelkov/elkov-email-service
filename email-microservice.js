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

function isValidBase64(str) {
  if (str === '' || str.trim() === '') return false;
  try {
      return Buffer.from(str, 'base64').toString('base64') === str;
  } catch (e) {
      return false;
  }
}

function decodeBase64Attachments(jsonData) {
  jsonData.attachments.forEach(attachment => {
      if (isValidBase64(attachment.content)) {
          attachment.content = Buffer.from(attachment.content, 'base64');
      }
  });
}

function encodeToBase64Attachments(jsonData) {
  jsonData.attachments.forEach(attachment => {
      attachment.content = Buffer.from(attachment.content).toString('base64');
  });
}

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
      else if (Array.isArray(req.body.content)) {
        content = JSON.stringify(req.body.content, null, 2);
      } 
      else if (typeof req.body.content !== 'string') {
        content = JSON.stringify(req.body.content);
      }
    //console.log("Received to " + req.body.to + ", subject " + req.body.subject + ", content: "+content);
    emailerModule.emailSendWithoutAttachment(req.body.to, req.body.subject, content);
    res.json({ status: "ok" });
    }
  }
  catch (error) {
    res.status(500).json(error);
  }
}

async function callAttachmentMap(req, res) {
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
    else if (!req.body.attachments || req.body.attachments.length === 0) {
      res.status(400).json({ error: { code: 400, message: "No Base64 attachments provided for the e-mail." } });
    }
    else {
      decodeBase64Attachments(req.body);
      let content = req.body.content;
      if (isJsonObject(req.body.content)) {
        content = JSON.stringify(req.body.content, null, 2);
      }
      else if (Array.isArray(req.body.content)) {
        content = JSON.stringify(req.body.content, null, 2);
      } 
      else if (typeof req.body.content !== 'string') {
        content = JSON.stringify(req.body.content);
      }
    //console.log("Received to " + req.body.to + ", subject " + req.body.subject + ", content: "+content);
    emailerModule.emailSendWithEncodedAttachments(req.body.to, req.body.subject, content, req.body.attachments);
    res.json({ status: "ok" });
    }
  }
  catch (error) {
    res.status(500).json(error);
  }
}

async function callAttachmentCollect(req, res) {
  try {
    if (!req.body.subject) {
      res.status(400).json({ error: { code: 400, message: "No subject provided for collecting the e-mail." } });
    }
    else if (!req.body.attachment) {
      res.status(400).json({ error: { code: 400, message: "No attachment subject provided for collecting the e-mail." } });
    }
    else if (!req.body.newer) {
      res.status(400).json({ error: { code: 400, message: "No date range provided for collecting the e-mail, for example 1 hour, 2 hours, 1 day, 2 days, 1 month, 2 months." } });
    }
    else if (!req.body.delete || req.body.delete.length === 0) {
      res.status(400).json({ error: { code: 400, message: "No delete boolean provided for deleting the collected the e-mail." } });
    }
    else {
      let attachment = emailerModule.emailCollect(req.body.subject, req.body.attachment, req.body.newer, eq.body.delete);
      res.json({ "content": attachment });
    }
  }
  catch (error) {
    res.status(500).json(error);
  }
}

app.post('/collect', (req, res) => {
  securityModule.emailKeyAuthorization(req, res);
  callAttachmentCollect(req, res);
});

app.post('/', (req, res) => {
  securityModule.emailKeyAuthorization(req, res);
  callDefaultMap(req, res);
});

app.post('/attachment', (req, res) => {
  securityModule.emailKeyAuthorization(req, res);
  callAttachmentMap(req, res);
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