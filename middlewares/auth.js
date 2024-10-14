require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Session = require('../models/session');

const auth = async (req, res, next) => {
  // console.log('auth middlewares hit');
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    // No token, return error message
    return res.status(401).json({ message: "Access token missing" });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the session associated with this access token
    const session = await Session.findOne({ accessToken: token, userId: decoded.userId });

    if (!session) {
      // No session found under the token, or expired, or invalid
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    // Fetch the user based on the decoded userId
    const user = await User.findById(decoded.userId);

    if (!user) {
      // No user found, unlikely
      return res.status(404).json({ message: "User not found" });
    }

    // Attach the user to the request object
    req.user = user;
    next();
  } catch (err) {
    res.status(403).json({ message: "Invalid or expired token" });
  }
};

module.exports = auth;
