import 'dotenv/config';
import newrelic from 'newrelic';

import express from 'express';

import { PubSub } from '@google-cloud/pubsub'

const app = express();

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
global.console.log = (...args) => logger.info.call(logger, ...args);

app.get('/', (req, res) => {
  const name = process.env.NAME || 'World';
  res.send(`Hello ${name}!`);
});

const port = parseInt(process.env.PORT) || 8081;
app.listen(port, () => {
  listenForMessages();
  console.log(`child service listening on port ${port} and on topic ${process.env.TOPIC_NAME}`);
});


async function listenForMessages() {
  const { topic, subscription } = await createSubscription();

  // Receive callbacks for new messages on the subscription

  subscription.on('message', message => {
    const headersObject = message.attributes;

    newrelic.startBackgroundTransaction('pubsub-background', function executeTransaction() {
      const transaction = newrelic.getTransaction();

      const isSampled = transaction.isSampled();
      console.log(`calling acceptDistributedTraceHeaders on headers, (isSampled = ${isSampled}):`, headersObject);
      transaction.acceptDistributedTraceHeaders('Queue', headersObject);

      // add custom span attribute
      const attributes = {
        message: message.data.toString()
      };
      newrelic.addCustomSpanAttributes(attributes);

      transaction.end();
      console.log(`Received message:`, message.data.toString());
    });
  });

  // Receive callbacks for errors on the subscription
  subscription.on('error', error => {
    console.error('Received error:', error);
  });
}


async function createSubscription() {
  const pubsub = new PubSub({ projectId: process.env.GCLOUD_PROJECTID });
  const topicNameOrId = process.env.TOPIC_NAME;
  const subscriptionName = 'childservice';

  const topic = pubsub.topic(topicNameOrId);
  const [exists] = await topic.exists();
  if (!exists) await topic.create();

  const subscription = topic.subscription(subscriptionName);
  const [subexists] = await subscription.exists();
  if (!subexists) await subscription.create();

  return { topic, subscription };
}
