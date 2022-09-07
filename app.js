const express = require("express");
const cors = require("cors");
const needle = require("needle");
const mcache = require("memory-cache");
const dotenv = require("dotenv");

const app = express();
app.use(cors()).options("*", cors());

dotenv.config();
const BearerToken = process.env.BEARER_TOKEN;

const cache = (duration) => {
  return (req, res, next) => {
    let key = "__express__" + req.originalUrl || req.url;
    let cachedBody = mcache.get(key);

    if (cachedBody) {
      res.send(cachedBody);
      return;
    } else {
      res.sendResponse = res.send;
      res.send = (body) => {
        mcache.put(key, body, duration * 1000);
        res.sendResponse(body);
      };
      next();
    }
  };
};

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

const getTweetCount = async (query) => {
  try {
    let twitterData = await getTweets(query);
    return await analyze(twitterData);
  } catch (error) {
    console.log(error);
  }
};

const analyze = async (twitterData) => {
  return twitterData.meta;
};

// test counter --------------------------------------------

const counters = [];

setInterval(() => {
  counters.map(async (counter) => {
    const newCount = await getTweetCount(counter.query);
    counter.count = newCount;
  });
}, 7000);

const getTestCount = async (req, res) => {
  const queryVal = req.query.queryString;

  if (!counters.find((e) => e.query === queryVal)) {
    const newCount = await getTweetCount(queryVal);

    const newCounter = {
      query: queryVal,
      count: newCount,
    };

    counters.push(newCounter);
    console.log(`just added ${newCounter.query}`);
  }

  const currentCounter =
    counters[counters.findIndex((e) => e.query === queryVal)];

  res.send(currentCounter.count);
};

app.get("/", getTestCount);

app.listen(process.env.PORT || 3001, () => {
  console.log(`Listening on port ${process.env.PORT}`);
});
