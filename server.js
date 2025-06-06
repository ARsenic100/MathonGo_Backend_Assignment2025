require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const cors = require('cors');
const chaptersRouter = require('./routes/chapters');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));

// Redis Connection
const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Redis connected'));

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Redis connection error:', err);
  }
})();

// Placeholder for routes
app.get('/', (req, res) => {
  res.send('Chapter Performance Dashboard API');
});

app.use('/api/v1/chapters', chaptersRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
