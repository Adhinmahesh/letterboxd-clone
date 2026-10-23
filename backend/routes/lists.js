const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const List = require('../models/List');
const User = require('../models/User');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findListByIdOrSlug = async (param) => {
  if (!param) return null;
  if (mongoose.Types.ObjectId.isValid(param)) {
    const byId = await List.findById(param);
    if (byId) return byId;
  }
  return await List.findOne({ name: new RegExp(`^${escapeRegex(param)}$`, 'i') });
};

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Access denied' });
  
  const token = authHeader.split(' ')[1];
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified.user || verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// Optional token verification
const optionalToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    req.user = null;
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified.user || verified;
  } catch (err) {
    req.user = null;
  }
  next();
};

// 1. POST /api/lists - Create a new list
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, description, tags, ranked, visibility, films } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'List name is required' });
    }

    const user = await User.findById(req.user.id);
    const username = user ? user.username : (req.user.username || 'Anonymous');

    const newList = new List({
      userId: req.user.id,
      username,
      name: name.trim(),
      description: description ? description.trim() : '',
      tags: Array.isArray(tags) ? tags : [],
      ranked: Boolean(ranked),
      visibility: visibility || 'public',
      films: Array.isArray(films) ? films : []
    });

    const savedList = await newList.save();
    res.status(201).json(savedList);
  } catch (err) {
    console.error('Create list error:', err);
    res.status(500).json({ error: 'Server error creating list' });
  }
});

// 2. GET /api/lists - Get all public lists (with sections/filtering)
router.get('/', optionalToken, async (req, res) => {
  try {
    const { type, limit = 20, page = 1 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skipNum = (pageNum - 1) * limitNum;

    let query = { visibility: 'public' };

    let lists;
    if (type === 'popular') {
      // Sort strictly by the number of likes, then by createdAt
      lists = await List.aggregate([
        { $match: query },
        {
          $addFields: {
            likesCount: { $size: { $ifNull: ['$likes', []] } }
          }
        },
        { $sort: { likesCount: -1, createdAt: -1 } },
        { $skip: skipNum },
        { $limit: limitNum }
      ]);
    } else if (type === 'recently-liked') {
      // Only lists that have at least one like, sorted by when they were most recently liked/updated
      lists = await List.find({
        ...query,
        'likes.0': { $exists: true }
      })
        .sort({ updatedAt: -1 })
        .skip(skipNum)
        .limit(limitNum);
    } else if (type === 'featured') {
      lists = await List.find(query)
        .sort({ viewsCount: -1, createdAt: -1 })
        .skip(skipNum)
        .limit(limitNum);
    } else {
      lists = await List.find(query)
        .sort({ createdAt: -1 })
        .skip(skipNum)
        .limit(limitNum);
    }

    res.status(200).json(lists);
  } catch (err) {
    console.error('Get lists error:', err);
    res.status(500).json({ error: 'Server error fetching lists' });
  }
});

// 3. GET /api/lists/user/:username - Get lists for a specific username
router.get('/user/:username', optionalToken, async (req, res) => {
  try {
    const targetUsername = req.params.username;
    let isOwner = false;

    if (req.user) {
      if (req.user.username && req.user.username.toLowerCase() === targetUsername.toLowerCase()) {
        isOwner = true;
      } else if (req.user.id) {
        const currentUser = await User.findById(req.user.id);
        if (currentUser && currentUser.username.toLowerCase() === targetUsername.toLowerCase()) {
          isOwner = true;
        }
      }
    }

    const query = { username: new RegExp(`^${escapeRegex(targetUsername)}$`, 'i') };
    // If not owner, only show public lists
    if (!isOwner) {
      query.visibility = 'public';
    }

    const lists = await List.find(query).sort({ updatedAt: -1 });
    res.status(200).json(lists);
  } catch (err) {
    console.error('Get user lists error:', err);
    res.status(500).json({ error: 'Server error fetching user lists' });
  }
});

// 4. GET /api/lists/:id - Get a single list by ID or name
router.get('/:id', optionalToken, async (req, res) => {
  try {
    const list = await findListByIdOrSlug(req.params.id);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    const isOwner = req.user && req.user.id === list.userId;
    if (list.visibility === 'private' && !isOwner) {
      return res.status(403).json({ error: 'This list is private' });
    }

    // Increment views
    list.viewsCount = (list.viewsCount || 0) + 1;
    await list.save();

    res.status(200).json(list);
  } catch (err) {
    console.error('Get list by id error:', err);
    res.status(500).json({ error: 'Server error fetching list' });
  }
});

// 5. PUT /api/lists/:id - Update an existing list
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const list = await findListByIdOrSlug(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });
    if (list.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this list' });
    }

    const { name, description, tags, ranked, visibility, films } = req.body;
    if (name) list.name = name.trim();
    if (description !== undefined) list.description = description.trim();
    if (tags !== undefined) list.tags = Array.isArray(tags) ? tags : [];
    if (ranked !== undefined) list.ranked = Boolean(ranked);
    if (visibility !== undefined) list.visibility = visibility;
    if (films !== undefined) list.films = Array.isArray(films) ? films : [];

    const updated = await list.save();
    res.status(200).json(updated);
  } catch (err) {
    console.error('Update list error:', err);
    res.status(500).json({ error: 'Server error updating list' });
  }
});

// 6. DELETE /api/lists/:id - Delete a list
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const list = await findListByIdOrSlug(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });
    if (list.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this list' });
    }

    await List.findByIdAndDelete(list._id);
    res.status(200).json({ message: 'List deleted successfully' });
  } catch (err) {
    console.error('Delete list error:', err);
    res.status(500).json({ error: 'Server error deleting list' });
  }
});

// 7. POST /api/lists/:id/like - Toggle like on a list
router.post('/:id/like', verifyToken, async (req, res) => {
  try {
    const list = await findListByIdOrSlug(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });

    const userId = req.user.id;
    const index = list.likes.indexOf(userId);

    if (index === -1) {
      list.likes.push(userId);
    } else {
      list.likes.splice(index, 1);
    }

    await list.save();
    res.status(200).json({ likesCount: list.likes.length, isLiked: index === -1 });
  } catch (err) {
    console.error('Like list error:', err);
    res.status(500).json({ error: 'Server error liking list' });
  }
});

// 8. POST /api/lists/:id/add-film - Toggle a film in a list
router.post('/:id/add-film', verifyToken, async (req, res) => {
  try {
    const list = await findListByIdOrSlug(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });
    if (list.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to modify this list' });
    }

    const { movieId, title, posterPath, releaseYear } = req.body;
    if (!movieId) return res.status(400).json({ error: 'movieId is required' });

    const movieIdStr = movieId.toString();
    const existingIndex = list.films.findIndex(f => f.movieId === movieIdStr);

    let inList;
    if (existingIndex !== -1) {
      list.films.splice(existingIndex, 1);
      // Re-order
      list.films = list.films.map((f, idx) => ({ ...f, order: idx + 1 }));
      inList = false;
    } else {
      list.films.push({
        movieId: movieIdStr,
        title: title || 'Movie',
        posterPath: posterPath || '',
        releaseYear: releaseYear || '',
        order: list.films.length + 1
      });
      inList = true;
    }

    await list.save();
    res.status(200).json({ inList, list });
  } catch (err) {
    console.error('Add film to list error:', err);
    res.status(500).json({ error: 'Server error modifying list' });
  }
});
// 9. POST /api/lists/:id/clone - Clone a list
router.post('/:id/clone', verifyToken, async (req, res) => {
  try {
    const original = await findListByIdOrSlug(req.params.id);
    if (!original) return res.status(404).json({ error: 'List not found' });

    const user = await User.findById(req.user.id);
    const username = user ? user.username : 'User';

    const clone = new List({
      userId: req.user.id,
      username,
      name: `${original.name} (Clone)`,
      description: original.description || '',
      tags: original.tags || [],
      ranked: Boolean(original.ranked),
      visibility: 'public',
      films: (original.films || []).map((f, idx) => ({
        movieId: f.movieId,
        title: f.title,
        posterPath: f.posterPath || '',
        releaseYear: f.releaseYear || '',
        order: idx + 1,
        notes: f.notes || ''
      }))
    });

    const saved = await clone.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Clone list error:', err);
    res.status(500).json({ error: 'Server error cloning list' });
  }
});

// 10. POST /api/lists/:id/import-to-watchlist - Import all films in this list to user's watchlist
router.post('/:id/import-to-watchlist', verifyToken, async (req, res) => {
  try {
    const list = await findListByIdOrSlug(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });

    const Interaction = require('../models/Interaction');
    let addedCount = 0;

    for (const film of list.films) {
      const movieIdStr = film.movieId.toString();
      let interaction = await Interaction.findOne({ userId: req.user.id, movieId: movieIdStr });
      if (interaction) {
        if (!interaction.watchlist) {
          interaction.watchlist = true;
          await interaction.save();
          addedCount++;
        }
      } else {
        const user = await User.findById(req.user.id);
        const username = user ? user.username : 'Anonymous';
        await Interaction.create({
          userId: req.user.id,
          username,
          movieId: movieIdStr,
          watchlist: true,
          watched: false,
          liked: false
        });
        addedCount++;
      }
    }

    res.status(200).json({ 
      message: `Successfully imported ${addedCount} film(s) to your watchlist!`, 
      addedCount, 
      totalFilms: list.films.length 
    });
  } catch (err) {
    console.error('Import to watchlist error:', err);
    res.status(500).json({ error: 'Server error importing to watchlist' });
  }
});

// 11. POST /api/lists/:id/comments - Add a comment to a list
router.post('/:id/comments', verifyToken, async (req, res) => {
  try {
    const list = await findListByIdOrSlug(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });

    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const user = await User.findById(req.user.id);
    const username = user ? user.username : (req.user.username || 'Anonymous');

    const newComment = {
      userId: req.user.id,
      username,
      text: text.trim(),
      createdAt: new Date()
    };

    if (!Array.isArray(list.comments)) {
      list.comments = [];
    }

    list.comments.push(newComment);
    await list.save();

    res.status(201).json({
      message: 'Comment added',
      comments: list.comments,
      comment: list.comments[list.comments.length - 1]
    });
  } catch (err) {
    console.error('Add list comment error:', err);
    res.status(500).json({ error: 'Server error adding comment' });
  }
});

// 12. DELETE /api/lists/:id/comments/:commentId - Delete a comment from a list
router.delete('/:id/comments/:commentId', verifyToken, async (req, res) => {
  try {
    const list = await findListByIdOrSlug(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });

    const comment = list.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Only comment author or list owner can delete
    if (comment.userId !== req.user.id && list.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    comment.deleteOne();
    await list.save();

    res.status(200).json({ message: 'Comment deleted', comments: list.comments });
  } catch (err) {
    console.error('Delete list comment error:', err);
    res.status(500).json({ error: 'Server error deleting comment' });
  }
});

module.exports = router;
