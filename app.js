require('dotenv').config();

const express = require('express');
const logger = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path'); // to access public directory
const aiRoutes = require("./routes/api/aiRoutes");

// Import routes
const {router: usersRouter} = require('./routes/api/users');
const {router: contactsRouter} = require('./routes/api/contacts');

// Swagger setup
const { swaggerDocs, swaggerUi } = require('./swaggerConfig');  // Import swagger configuration

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

// Routes
app.use('/api/users', usersRouter);
app.use('/api/contacts', contactsRouter);

// Add the AI routes
app.use("/api/ai", aiRoutes);

// Swagger docs route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));  // Serve swagger documentation

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' })
})

app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message })
})

const PORT = process.env.PORT || 3000;
const host = '0.0.0.0';  // Explicitly bind to 0.0.0.0

app.listen(PORT, host, () => {
  console.log(`Server running on http://${host}:${PORT}`);
});

module.exports = app