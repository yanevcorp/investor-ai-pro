const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const GUEST_EMAIL = 'guest@investorai.local';

async function getOrCreateGuestUser() {
  let guest = await User.findOne({ email: GUEST_EMAIL });
  if (!guest) {
    guest = await User.create({
      username: 'guest',
      email: GUEST_EMAIL,
      password: crypto.randomBytes(32).toString('hex'),
    });
  }
  return guest;
}

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
}

async function protect(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user no longer exists' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, invalid or expired token' });
  }
}

// Attaches the signed-in user when a valid token is present; otherwise falls
// back to a shared guest account so routes work without requiring login.
async function optionalAuth(req, res, next) {
  const token = extractToken(req);

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
        return next();
      }
    } catch (err) {
      // invalid/expired token — fall through to guest access
    }
  }

  try {
    req.user = await getOrCreateGuestUser();
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { protect, optionalAuth };
