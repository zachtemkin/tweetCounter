const cors = require("cors");
const express = require("express");
const dotenv = require("dotenv");
const needle = require("needle");
const serverless = require("serverless-http");

const app = express();

app.use(cors()).options("*", cors());
app.use();

dotenv.config();
const BearerToken = process.env.BEARER_TOKEN;

const endpointUrl = "https://api.twitter.com/2/tweets/counts/recent";

const getTweets = async (queryString) => {
  const currentDate = new Date();
  const oneMinuteAgo = new Date(currentDate.getTime() - 60000);
  const oneMinuteAgoIso = oneMinuteAgo.toISOString();

  const params = {
    query: queryString,
    start_time: oneMinuteAgoIso,
    granularity: "minute",
  };

  const response = await needle("get", endpointUrl, params, {
    headers: {
      "User-Agent": "v2RecentSearchJS",
      authorization: `Bearer ${BearerToken}`,
    },
  });

  if (response.statusCode !== 200) {
    if (response.statusCode === 403) {
      res.status(403).send(response.body);
    } else {
      throw new Error(response.body.error.message);
    }
  }

  if (response.body) {
    return response.body;
  } else {
    throw new Error("Request Unsuccessful");
  }
};

const getTweetCount = async (req, res) => {
  try {
    let twitterData = await getTweets(req.query.queryString);
    res.send(await analyze(twitterData));
  } catch (error) {
    res.send(error);
  }
};

const analyze = async (twitterData) => {
  return twitterData.meta;
};

app.get("/api/tweetCount/", getTweetCount);

// app.listen(process.env.PORT || 3001, () => {
//   console.log(`Listening on port ${process.env.PORT}`);
// });

module.exports.handler = serverless(app);
