import 'dotenv/config';
import newrelic from 'newrelic';

import express from 'express';
const app = express();

app.get('/', (req, res) => {
  const name = process.env.NAME || 'World';
  res.send(`Hello ${name}!`);
});

const port = parseInt(process.env.PORT) || 8081;
app.listen(port, () => {
  console.log(`helloworld: listening on port ${port}`);
});