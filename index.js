import 'dotenv/config';
import newrelic from 'newrelic';

import express from 'express';
import fetch from 'node-fetch';

import { PubSub } from '@google-cloud/pubsub'

import winston from 'winston';
import newrelicFormatter from '@newrelic/winston-enricher';
const newrelicWinstonFormatter = newrelicFormatter(winston);
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.json(),
    newrelicWinstonFormatter()
  ),
  defaultMeta: { service: 'parent' },
  transports: [
    new winston.transports.Console()
  ],
});


const app = express();

app.get('/', async (req, res) => {
  const response = await fetch(process.env.CHILD_SERVICE);
  const body = await response.text();

  logger.info(`child service return ${body}`);
  res.send(`Child service said: ${body}!`);
});

app.get('/pubsub', async (req, res) => {
  const msg = req.query.message || 'Hello';
  logger.info(`sending request to child service via pubsub: ${msg}`);

  // This could be a header object from an incoming request as well
  const newRelicHeaders = {};
  newrelic.startBackgroundTransaction('pubsub-parent', async function executeTransaction() {
    const transaction = newrelic.getTransaction();
    // generate the headers
    transaction.insertDistributedTraceHeaders(newRelicHeaders);
    const isSampled = transaction.isSampled();
    logger.info(`parent newRelicHeaders, (isSampled = ${isSampled}, message sent: ${msg}): ${JSON.stringify(newRelicHeaders)}`);

    // add custom span attribute
    const attributes = {
      userAgent: req.headers['user-agent']
    };

    newrelic.addCustomSpanAttributes(attributes);

    const topic = await createTopicClient();
    topic.publishMessage({
      data: Buffer.from(msg),
      attributes: {
        ...newRelicHeaders
      }
    });
    transaction.end();
    res.send(`sent "${msg}" to child service via pubsub!`);
  });
});

const port = parseInt(process.env.PORT) || 8080;
app.listen(port, () => {
  logger.info(`helloworld: listening on port ${port}`);
});

async function createTopicClient() {
  logger.info(`Creating topic ${process.env.TOPIC_NAME}...`);
  const pubsub = new PubSub({ projectId: process.env.GCLOUD_PROJECTID });
  const topicNameOrId = process.env.TOPIC_NAME;

  const topic = pubsub.topic(topicNameOrId);
  const [exists] = await topic.exists();
  if (!exists) await topic.create();
  return topic;
}