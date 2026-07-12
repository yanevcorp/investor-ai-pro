const mongoose = require('mongoose');

// On Vercel this module is loaded once per serverless container and that
// container is reused across requests — calling process.exit() here on a
// connection failure (bad auth, network blip, expired credentials) doesn't
// just fail Mongo, it kills the whole Node process. Every other request
// that lands on that same warm container afterward then fails immediately
// with a hard crash (FUNCTION_INVOCATION_FAILED) instead of a normal JSON
// error response — including requests that don't even touch the DB.
// Logging and letting Mongoose's own buffering/timeout handle a failed
// connection turns "the entire API is down" into "this one query failed",
// which the existing error middleware and the frontend's retry UI already
// handle gracefully.
//
// A few retries with a short backoff are attempted before giving up —
// confirmed live that Atlas connectivity from Vercel's serverless network
// is sometimes transiently flaky (some cold-start containers connect
// fine, others fail with a network-level "could not connect to any
// servers" error), so a container that hits one of those on its first
// attempt gets a couple of quick chances to recover instead of staying
// disconnected for its entire lifetime. A short serverSelectionTimeoutMS
// keeps each attempt failing fast rather than hanging, so the retries
// actually fit in a reasonable total window.
const CONNECT_RETRIES = 3;
const CONNECT_RETRY_DELAY_MS = 1500;
const SERVER_SELECTION_TIMEOUT_MS = 5000;

async function connectDB() {
  for (let attempt = 1; attempt <= CONNECT_RETRIES; attempt += 1) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
      });
      console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
      return;
    } catch (err) {
      console.error(`MongoDB connection error (attempt ${attempt}/${CONNECT_RETRIES}): ${err.message}`);
      if (attempt < CONNECT_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, CONNECT_RETRY_DELAY_MS));
      }
    }
  }
}

module.exports = connectDB;
