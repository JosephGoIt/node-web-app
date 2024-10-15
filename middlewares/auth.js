require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Session = require('../models/session');

const auth = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Access token missing" });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the session associated with this access token
    const session = await Session.findOne({ accessToken: token });

    if (!session) {
      return res.status(403).json({ message: 'Invalid or no session' });
    }

    // Fetch the user based on the decoded id (not userId)
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Attach the user to the request object
    req.user = user;
    next();
  } catch (err) {
    console.error('Error verifying token:', err);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

module.exports = auth;