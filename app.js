require('dotenv').config();

const express = require('express');
const logger = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path'); // to access public directory

const {router: usersRouter} = require('./routes/api/users');

const app = express();

const formatsLogger = app.get('env') === 'development' ? 'dev' : 'short';

app.use(logger(formatsLogger));
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('Database connection successful'))
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

// serve static files from the public folder
app.use('/avatars', express.static(path.join(__dirname, 'public/avatars')));

app.use('/api/users', usersRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' })
})

app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message })
})

const PORT = process.env.PORT || 3000;

app.listen(PORT, '::1', () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app