import 'dotenv/config';
import newrelic from 'newrelic';

import express from 'express';
import fetch from 'node-fetch';

import { PubSub } from '@google-cloud/pubsub'

const app = express();

app.get('/', async (req, res) => {
  const response = await fetch(process.env.CHILD_SERVICE);
  const body = await response.text();

  console.log(`child service return`, body);
  res.send(`Child service said: ${body}!`);
});

app.get('/pubsub', async (req, res) => {
  const msg = req.query.message || 'Hello';
  console.log(`sending request to child service via pubsub`, msg);
  const topic = await createTopicClient();
  topic.publishMessage({
    data: Buffer.from(msg)
  });
  res.send(`sent "${msg}" to child service via pubsub!`);
});

const port = parseInt(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`helloworld: listening on port ${port}`);
});

async function createTopicClient() {
  console.log(`Creating topic ${process.env.TOPIC_NAME}...`);
  const pubsub = new PubSub({ projectId: process.env.GCLOUD_PROJECTID });
  const topicNameOrId = process.env.TOPIC_NAME;

  const topic = pubsub.topic(topicNameOrId);
  const [exists] = await topic.exists();
  if (!exists) await topic.create();
  return topic;
}