import 'dotenv/config';
import newrelic from 'newrelic';

import express from 'express';
import fetch from 'node-fetch';

const app = express();

app.get('/', async (req, res) => {
  const response = await fetch(process.env.CHILD_SERVICE);
  const body = await response.text();

  console.log(`child service return`, body);
  res.send(`Child service said: ${body}!`);
});

const port = parseInt(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`helloworld: listening on port ${port}`);
});