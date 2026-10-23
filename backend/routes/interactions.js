const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Interaction = require('../models/Interaction');
const User = require('../models/User');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Access denied' });
  
  const token = authHeader.split(' ')[1];
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified.user || verified; // Contains { id, username }
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// 1. GET all watchlisted movies for the logged-in user
router.get('/user/watchlist', verifyToken, async (req, res) => {
  try {
    const interactions = await Interaction.find({ userId: req.user.id, watchlist: true })
      .sort({ updatedAt: -1 });
    res.status(200).json(interactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 1b. GET all watched movies for the logged-in user
router.get('/user/watched', verifyToken, async (req, res) => {
  try {
    const interactions = await Interaction.find({ userId: req.user.id, watched: true })
      .sort({ updatedAt: -1 });
    res.status(200).json(interactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 1c. GET all watched movies for a specific user
router.get('/user/:username/watched', async (req, res) => {
  try {
    const user = await User.findOne({ username: new RegExp(`^${req.params.username}$`, 'i') });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const interactions = await Interaction.find({ userId: user.id, watched: true })
      .sort({ updatedAt: -1 });
    res.status(200).json(interactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 1c-2. GET diary entries for a user with sorting and year/month filters
router.get('/user/:username/diary', async (req, res) => {
  try {
    const user = await User.findOne({ username: new RegExp(`^${req.params.username}$`, 'i') });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { year, month, sort = 'newest' } = req.query;

    let interactions = await Interaction.find({ userId: user.id, watched: true }).lean();

    // Attach computed date: watchedDate or updatedAt or createdAt
    interactions = interactions.map(item => ({
      ...item,
      entryDate: item.watchedDate || item.createdAt || item.updatedAt || new Date()
    }));

    // Extract available years
    const availableYearsSet = new Set();
    interactions.forEach(item => {
      const y = new Date(item.entryDate).getFullYear();
      if (!isNaN(y)) availableYearsSet.add(y);
    });
    const availableYears = Array.from(availableYearsSet).sort((a, b) => b - a);

    // Filter by year if specified
    if (year && year !== 'all') {
      const targetYear = parseInt(year, 10);
      interactions = interactions.filter(item => new Date(item.entryDate).getFullYear() === targetYear);
    }

    // Filter by month if specified (1-12)
    if (month && month !== 'all') {
      const targetMonth = parseInt(month, 10);
      interactions = interactions.filter(item => (new Date(item.entryDate).getMonth() + 1) === targetMonth);
    }

    // Sort
    if (sort === 'oldest') {
      interactions.sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
    } else if (sort === 'rating-high') {
      interactions.sort((a, b) => (b.rating || 0) - (a.rating || 0) || new Date(b.entryDate) - new Date(a.entryDate));
    } else if (sort === 'rating-low') {
      interactions.sort((a, b) => (a.rating || 0) - (b.rating || 0) || new Date(b.entryDate) - new Date(a.entryDate));
    } else {
      // Default: 'newest'
      interactions.sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));
    }

    res.status(200).json({
      entries: interactions,
      total: interactions.length,
      availableYears
    });
  } catch (error) {
    console.error('Diary error:', error);
    res.status(500).json({ error: 'Server error loading diary' });
  }
});

// 1c-3. DELETE diary entry (remove watched status)
router.delete('/diary/:interactionId', verifyToken, async (req, res) => {
  try {
    const interaction = await Interaction.findById(req.params.interactionId);
    if (!interaction) return res.status(404).json({ error: 'Diary entry not found' });
    if (interaction.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    interaction.watched = false;
    interaction.watchedDate = undefined;
    interaction.rewatch = false;

    if (!interaction.liked && !interaction.watchlist && !interaction.review && !interaction.rating) {
      await Interaction.findByIdAndDelete(req.params.interactionId);
    } else {
      await interaction.save();
    }

    res.status(200).json({ message: 'Diary entry removed successfully' });
  } catch (error) {
    console.error('Error removing diary entry:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 1c-4. PUT update diary entry
router.put('/diary/:interactionId', verifyToken, async (req, res) => {
  try {
    const interaction = await Interaction.findById(req.params.interactionId);
    if (!interaction) return res.status(404).json({ error: 'Diary entry not found' });
    if (interaction.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { watchedDate, rewatch, rating, liked } = req.body;
    if (watchedDate !== undefined) interaction.watchedDate = watchedDate ? new Date(watchedDate) : new Date();
    if (rewatch !== undefined) interaction.rewatch = Boolean(rewatch);
    if (rating !== undefined) interaction.rating = rating > 0 ? rating : null;
    if (liked !== undefined) interaction.liked = Boolean(liked);

    await interaction.save();
    res.status(200).json({ message: 'Diary entry updated', interaction });
  } catch (error) {
    console.error('Error updating diary entry:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 1d. GET all liked movies for a specific user
router.get('/user/:username/likes', async (req, res) => {
  try {
    const user = await User.findOne({ username: new RegExp(`^${req.params.username}$`, 'i') });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const interactions = await Interaction.find({ userId: user.id, liked: true })
      .sort({ updatedAt: -1 });
    res.status(200).json(interactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 1e. GET all reviews for a specific user
router.get('/user/:username/reviews', async (req, res) => {
  try {
    const user = await User.findOne({ username: new RegExp(`^${req.params.username}$`, 'i') });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const interactions = await Interaction.find({ 
      userId: user.id, 
      review: { $exists: true, $ne: '' } 
    }).sort({ updatedAt: -1 });
    res.status(200).json(interactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 1f. GET popular reviews (most liked first)
router.get('/popular-reviews', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 6);
    const page = Math.max(1, Number(req.query.page || 1));
    const skip = (page - 1) * limit;

    const popularReviews = await Interaction.aggregate([
      { $match: { review: { $exists: true, $ne: '' } } },
      {
        $addFields: {
          likesCount: { $size: { $ifNull: ['$reviewLikes', []] } }
        }
      },
      { $sort: { likesCount: -1, updatedAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]);
    res.status(200).json(popularReviews);
  } catch (error) {
    console.error('Error fetching popular reviews:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 1g. GET recently reviewed films
router.get('/recent-reviews', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 6);
    const page = Math.max(1, Number(req.query.page || 1));
    const skip = (page - 1) * limit;

    const recentReviews = await Interaction.find({
      review: { $exists: true, $ne: '' }
    })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);
    res.status(200).json(recentReviews);
  } catch (error) {
    console.error('Error fetching recent reviews:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 1h. GET popular reviewers
router.get('/popular-reviewers', async (req, res) => {
  try {
    const top = await Interaction.aggregate([
      { $match: { review: { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: '$username',
          userId: { $first: '$userId' },
          reviewsCount: { $sum: 1 },
          totalLikesReceived: { $sum: { $size: { $ifNull: ['$reviewLikes', []] } } }
        }
      },
      { $sort: { totalLikesReceived: -1, reviewsCount: -1 } },
      { $limit: 6 }
    ]);

    const result = await Promise.all(
      top.map(async (u) => {
        const username = u._id || 'User';
        const filmsCount = await Interaction.countDocuments({
          $or: [{ username }, { userId: u.userId }],
          watched: true
        });
        return {
          username,
          reviews: u.reviewsCount,
          films: filmsCount || u.reviewsCount,
          likes: u.totalLikesReceived
        };
      })
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching popular reviewers:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 1i. GET user liked / high rated films for recommendations
router.get('/user-liked-films', async (req, res) => {
  try {
    const username = req.query.username;
    let userId = null;

    const authHeader = req.headers['authorization'];
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        userId = verified.user?.id || verified.id;
      } catch (e) {
        // Ignore token error
      }
    }

    if (!userId && username) {
      const user = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });
      if (user) userId = user.id;
    }

    if (!userId) {
      return res.status(200).json({ movieIds: [] });
    }

    const interactions = await Interaction.find({
      userId,
      $or: [
        { liked: true },
        { rating: { $gte: 3.5 } },
        { watched: true }
      ]
    }).sort({ liked: -1, rating: -1, updatedAt: -1 }).limit(20);

    const movieIds = interactions.map(i => i.movieId);
    res.status(200).json({ movieIds, count: movieIds.length });
  } catch (error) {
    console.error('Error fetching user liked films:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. GET aggregate activity stats for a film (Public)
router.get('/movie/:movieId/activity', async (req, res) => {
  try {
    const movieId = req.params.movieId.toString();
    const watchedCount = await Interaction.countDocuments({ movieId, watched: true });
    const watchlistCount = await Interaction.countDocuments({ movieId, watchlist: true });
    const likedCount = await Interaction.countDocuments({ movieId, liked: true });
    const reviewsCount = await Interaction.countDocuments({ movieId, review: { $exists: true, $ne: "" } });
    
    // Aggregate user ratings on this site
    const ratingsAgg = await Interaction.aggregate([
      { $match: { movieId, rating: { $exists: true, $ne: null, $gt: 0 } } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, totalRatings: { $sum: 1 } } }
    ]);
    
    const siteAvgRating = ratingsAgg.length > 0 ? ratingsAgg[0].avgRating : null;
    const siteTotalRatings = ratingsAgg.length > 0 ? ratingsAgg[0].totalRatings : 0;

    res.status(200).json({
      watchedCount,
      watchlistCount,
      likedCount,
      reviewsCount,
      siteAvgRating,
      siteTotalRatings
    });
  } catch (error) {
    console.error('Error getting movie activity:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. GET all reviews for a specific movie (Public)
router.get('/movie/:movieId/reviews', async (req, res) => {
  try {
    const interactions = await Interaction.find({ 
      movieId: req.params.movieId.toString(), 
      review: { $exists: true, $ne: "" } 
    }).sort({ createdAt: -1 });
    res.status(200).json(interactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 3b. GET single review by ID
router.get('/review/:interactionId', async (req, res) => {
  try {
    const interaction = await Interaction.findById(req.params.interactionId);
    if (!interaction) return res.status(404).json({ error: 'Review not found' });
    res.status(200).json(interaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 3c. GET single review by username and movieId
router.get('/review/by-user/:username/:movieId', async (req, res) => {
  try {
    const user = await User.findOne({ username: new RegExp(`^${req.params.username}$`, 'i') });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const interaction = await Interaction.findOne({ 
      userId: user.id, 
      movieId: req.params.movieId.toString(),
      review: { $exists: true, $ne: '' }
    });
    if (!interaction) return res.status(404).json({ error: 'Review not found' });
    res.status(200).json(interaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 3d. PUT update a review
router.put('/review/:interactionId', verifyToken, async (req, res) => {
  try {
    const interaction = await Interaction.findById(req.params.interactionId);
    if (!interaction) return res.status(404).json({ error: 'Review not found' });
    
    // Check if the current user is the owner
    if (interaction.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to edit this review' });
    }

    const { review, rating, liked, watched, watchlist } = req.body;
    if (review !== undefined) interaction.review = review;
    if (rating !== undefined) interaction.rating = (rating > 0) ? rating : null;
    if (liked !== undefined) interaction.liked = liked;
    if (watched !== undefined) interaction.watched = watched;
    if (watchlist !== undefined) interaction.watchlist = watchlist;

    await interaction.save();
    res.status(200).json({ message: 'Review updated successfully', interaction });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 3e. DELETE a review
router.delete('/review/:interactionId', verifyToken, async (req, res) => {
  try {
    const interaction = await Interaction.findById(req.params.interactionId);
    if (!interaction) return res.status(404).json({ error: 'Review not found' });
    
    // Check if the current user is the owner
    if (interaction.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this review' });
    }

    // If the interaction is also watched, liked, or on watchlist, unset review and clear review stats
    if (!interaction.watched && !interaction.liked && !interaction.watchlist) {
      await Interaction.findByIdAndDelete(req.params.interactionId);
    } else {
      interaction.review = undefined;
      interaction.replies = [];
      interaction.reviewLikes = [];
      await interaction.save();
    }

    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 4. GET user's interaction for a specific movie
router.get('/:movieId', verifyToken, async (req, res) => {
  try {
    const interaction = await Interaction.findOne({ userId: req.user.id, movieId: req.params.movieId.toString() });
    res.status(200).json(interaction || {});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 5. POST to update or create an interaction
router.post('/', verifyToken, async (req, res) => {
  try {
    const { movieId, liked, watchlist, watched, rating, review, watchedDate, rewatch } = req.body;
    
    if (!movieId) return res.status(400).json({ error: 'movieId is required' });

    const movieIdStr = movieId.toString();
    let interaction = await Interaction.findOne({ userId: req.user.id, movieId: movieIdStr });
    const user = await User.findById(req.user.id);
    const username = user ? user.username : 'Anonymous';
    
    if (interaction) {
      if (liked !== undefined) interaction.liked = liked;
      if (watchlist !== undefined) interaction.watchlist = watchlist;
      if (watched !== undefined) interaction.watched = watched;
      if (rating !== undefined) interaction.rating = (rating > 0) ? rating : null;
      if (review !== undefined) interaction.review = review;
      if (watchedDate !== undefined) interaction.watchedDate = watchedDate ? new Date(watchedDate) : new Date();
      if (rewatch !== undefined) interaction.rewatch = Boolean(rewatch);
      interaction.username = username;
    } else {
      interaction = new Interaction({
        userId: req.user.id,
        username,
        movieId: movieIdStr,
        liked: liked || false,
        watchlist: watchlist || false,
        watched: watched || false,
        rating: (rating > 0) ? rating : null,
        review,
        watchedDate: watchedDate ? new Date(watchedDate) : new Date(),
        rewatch: Boolean(rewatch)
      });
    }
    
    await interaction.save();
    res.status(200).json({ message: 'Interaction saved', interaction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 6. POST reply to a review
router.post('/:interactionId/reply', verifyToken, async (req, res) => {
  try {
    const interaction = await Interaction.findById(req.params.interactionId);
    if (!interaction) return res.status(404).json({ error: 'Review not found' });
    
    const username = req.user.username || (await User.findById(req.user.id))?.username || 'Anonymous';
    
    interaction.replies.push({
      userId: req.user.id,
      username,
      text: req.body.text
    });
    
    await interaction.save();
    res.status(200).json({ message: 'Reply added', interaction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 7. POST like a review
router.post('/:interactionId/like', verifyToken, async (req, res) => {
  try {
    const interaction = await Interaction.findById(req.params.interactionId);
    if (!interaction) return res.status(404).json({ error: 'Review not found' });
    
    const userId = req.user.id;
    const hasLiked = interaction.reviewLikes.includes(userId);
    
    if (hasLiked) {
      interaction.reviewLikes = interaction.reviewLikes.filter(id => id !== userId);
    } else {
      interaction.reviewLikes.push(userId);
    }
    
    await interaction.save();
    res.status(200).json({
      message: 'Like toggled',
      liked: !hasLiked,
      likesCount: interaction.reviewLikes.length,
      interaction
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
