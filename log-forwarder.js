const https = require("https");

exports.nrLogForwarder = (message, context) => {
  const pubSubMessage = Buffer.from(message.data, "base64").toString();

  /* Setup the payload for New Relic with decoded message from Pub/Sub
      with "message", "logtype" as atrributes
   */

  let logPayload = {
    message: pubSubMessage,
    logtype: "gcpStackdriverLogs",
  };

  let parsedJson = JSON.parse(pubSubMessage);
  if (parsedJson.jsonPayload) {
    // flatten the jsonPayload
    parsedJson = {
      ...parsedJson,
      ...parsedJson.jsonPayload
    };
    delete parsedJson.jsonPayload;

    logPayload = {
      message: JSON.stringify(parsedJson),
      logtype: "gcpStackdriverLogs",
    };
  } else {
  }


  // configure the New Relic Log API http options for POST
  const options = {
    hostname: "log-api.newrelic.com",
    port: 443,
    path: "/log/v1",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key":
        process.env
          .API_KEY /* ADD YOUR NR INSIGHTS INSERT LICENSE TO THE RUNTIME ENV VAR */,
    },
  };

  // HTTP Request with the configured options
  const req = https.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode}`);
    const body = [];

    res.on("data", (d) => {
      body.push(d);
    });
    res.on("end", () => {
      const resString = Buffer.concat(body).toString();
      console.log(`res: ${resString}`);
    });
  });

  req.on("error", (error) => {
    console.error(error);
    callback(null, "error!");
  });

  // write the payload to our request
  req.write(JSON.stringify(logPayload));

  req.end();
};