const mongoose = require('mongoose');
const crypto = require('crypto');

const favoriteFilmSchema = new mongoose.Schema({
  movieId: { type: String, required: true },
  title: { type: String, required: true },
  posterPath: { type: String, default: '' },
  releaseYear: { type: String, default: '' }
}, { _id: false });

const userSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => crypto.randomUUID()
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  givenName: {
    type: String,
    default: ''
  },
  familyName: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  pronoun: {
    type: String,
    default: 'They / their'
  },
  posters: {
    type: String,
    default: 'Any'
  },
  replies: {
    type: String,
    default: 'Anyone'
  },
  includeInMembers: {
    type: Boolean,
    default: true
  },
  adultContent: {
    type: Boolean,
    default: false
  },
  favoriteFilms: {
    type: [favoriteFilmSchema],
    default: []
  },
  following: {
    type: [String],
    default: []
  },
  followers: {
    type: [String],
    default: []
  },
  blockedUsers: {
    type: [String],
    default: []
  },
  badge: {
    type: String,
    default: ''
  },
  backdropUrl: {
    type: String,
    default: ''
  },
  displayName: {
    type: String,
    default: ''
  },
  followersCount: {
    type: Number,
    default: 0
  },
  listsCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
