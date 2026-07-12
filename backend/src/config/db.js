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
async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
  }
}

module.exports = connectDB;
