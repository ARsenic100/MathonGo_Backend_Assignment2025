const express = require('express');
const multer = require('multer');
const Chapter = require('../models/Chapter');
const router = express.Router();
const { RateLimiterRedis } = require('rate-limiter-flexible');
const redis = require('redis');

// Redis client for rate limiting
const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
});

// Rate limiter configuration
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rate_limit',
  points: 30, // Number of requests
  duration: 60, // Per minute
});

// Rate limiting middleware
const rateLimiterMiddleware = async (req, res, next) => {
  console.log(`[RateLimiter] Checking rate limit for IP: ${req.ip}`);
  try {
    await rateLimiter.consume(req.ip);
    console.log(`[RateLimiter] IP ${req.ip} passed rate limit.`);
    next();
  } catch (error) {
    console.error(`[RateLimiter] IP ${req.ip} failed rate limit:`, error.message);
    res.status(429).json({ message: 'Too many requests, please try again later.' });
  }
};

// Apply rate limiting to all routes
router.use(rateLimiterMiddleware);

// Middleware for admin authentication
function adminAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === process.env.ADMIN_API_KEY) {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden: Admins only' });
}

// Multer setup for JSON file upload
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json') cb(null, true);
    else cb(new Error('Only JSON files are allowed!'));
  },
});

// GET /api/v1/chapters (with filters, pagination, caching)
router.get('/', async (req, res) => {
  try {
    const {
      class: classFilter,
      unit,
      status,
      isWeakChapter,
      subject,
      year,
      page = 1,
      limit = 10
    } = req.query;

    // Build filter object
    const filter = {};
    if (classFilter) filter.class = classFilter;
    if (unit) filter.unit = unit;
    if (status) filter.status = status;
    if (isWeakChapter) filter.isWeakChapter = isWeakChapter === 'true';
    if (subject) filter.subject = subject;

    // Calculate skip value for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Try to get from cache first
    const cacheKey = `chapters:${JSON.stringify(filter)}:${page}:${limit}`;
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // If not in cache, get from database
    const [chapters, total] = await Promise.all([
      Chapter.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Chapter.countDocuments(filter)
    ]);

    // If year filter is provided, calculate total questions for that year
    let yearStats = null;
    if (year) {
      yearStats = chapters.reduce((acc, chapter) => {
        return acc + (chapter.yearWiseQuestionCount[year] || 0);
      }, 0);
    }

    const response = {
      chapters,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      ...(yearStats !== null && { yearStats })
    };

    // Cache the response for 1 hour
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(response));

    res.json(response);
  } catch (error) {
    console.error('Error fetching chapters:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/v1/chapters/:id
router.get('/:id', async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    res.json(chapter);
  } catch (error) {
    console.error('Error fetching chapter:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/v1/chapters/stats/yearly
router.get('/stats/yearly', async (req, res) => {
  try {
    const { subject, class: classFilter } = req.query;
    const filter = {};
    if (subject) filter.subject = subject;
    if (classFilter) filter.class = classFilter;

    const chapters = await Chapter.find(filter);
    
    const yearlyStats = chapters.reduce((acc, chapter) => {
      Object.entries(chapter.yearWiseQuestionCount).forEach(([year, count]) => {
        if (!acc[year]) acc[year] = 0;
        acc[year] += count;
      });
      return acc;
    }, {});

    res.json(yearlyStats);
  } catch (error) {
    console.error('Error fetching yearly stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/v1/chapters (admin only, file upload)
router.post('/', adminAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const chaptersData = JSON.parse(req.file.buffer.toString());
    const results = {
      successful: [],
      failed: []
    };

    // Process each chapter
    for (const chapterData of chaptersData) {
      try {
        const chapter = new Chapter(chapterData);
        await chapter.validate();
        await chapter.save();
        results.successful.push(chapter);
      } catch (error) {
        results.failed.push({
          data: chapterData,
          error: error.message
        });
      }
    }

    // Invalidate cache after successful upload
    const keys = await redisClient.keys('chapters:*');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }

    res.json({
      message: 'Chapters processed',
      results
    });
  } catch (error) {
    console.error('Error processing chapters:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router; 