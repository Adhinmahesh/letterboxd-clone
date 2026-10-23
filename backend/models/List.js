const mongoose = require('mongoose');

const listItemSchema = new mongoose.Schema({
  movieId: { type: String, required: true },
  title: { type: String, required: true },
  posterPath: { type: String, default: '' },
  releaseYear: { type: String, default: '' },
  order: { type: Number, default: 0 },
  notes: { type: String, default: '' }
});

const commentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const listSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  tags: { type: [String], default: [] },
  ranked: { type: Boolean, default: false },
  visibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
  films: [listItemSchema],
  likes: { type: [String], default: [] },
  viewsCount: { type: Number, default: 0 },
  comments: [commentSchema]
}, { timestamps: true });

module.exports = mongoose.model('List', listSchema);
