require('dotenv').config();
const mongoose = require('mongoose');
const List = require('./models/List');

const seedLists = [
  {
    userId: 'official',
    username: 'Letterboxd',
    name: 'Top 500 Narrative Feature Films',
    description: 'The definitive ranking of the top 500 highest-rated narrative feature films on Letterboxd.',
    tags: ['top 500', 'ranking', 'canon', 'favorites'],
    ranked: true,
    visibility: 'public',
    likes: ['user1', 'user2', 'user3', 'user4', 'user5'],
    viewsCount: 14200,
    films: [
      { movieId: '238', title: 'The Godfather', posterPath: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', releaseYear: '1972', order: 1 },
      { movieId: '424', title: "Schindler's List", posterPath: '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg', releaseYear: '1993', order: 2 },
      { movieId: '240', title: 'The Godfather Part II', posterPath: '/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg', releaseYear: '1974', order: 3 },
      { movieId: '389', title: '12 Angry Men', posterPath: '/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg', releaseYear: '1957', order: 4 },
      { movieId: '19404', title: 'Dilwale Dulhania Le Jayenge', posterPath: '/lfRkUr7DYdHldAqi3PwdQGBRBPM.jpg', releaseYear: '1995', order: 5 },
      { movieId: '155', title: 'The Dark Knight', posterPath: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', releaseYear: '2008', order: 6 },
      { movieId: '496243', title: 'Parasite', posterPath: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', releaseYear: '2019', order: 7 }
    ]
  },
  {
    userId: 'official',
    username: 'Letterboxd',
    name: 'Most Fans on Letterboxd',
    description: 'The films with the most user fans on Letterboxd in 2026.',
    tags: ['fans', 'favorites', 'popular'],
    ranked: true,
    visibility: 'public',
    likes: ['user1', 'user2', 'user3'],
    viewsCount: 8900,
    films: [
      { movieId: '157336', title: 'Interstellar', posterPath: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', releaseYear: '2014', order: 1 },
      { movieId: '27205', title: 'Inception', posterPath: '/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg', releaseYear: '2010', order: 2 },
      { movieId: '550', title: 'Fight Club', posterPath: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', releaseYear: '1999', order: 3 },
      { movieId: '680', title: 'Pulp Fiction', posterPath: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', releaseYear: '1994', order: 4 },
      { movieId: '244786', title: 'Whiplash', posterPath: '/7fn624j5lj3xTme2SgiLCeuedmO.jpg', releaseYear: '2014', order: 5 }
    ]
  },
  {
    userId: 'alexander',
    username: 'alexander',
    name: 'One Million Watched Club',
    description: 'Every film with over one million members who have watched it.',
    tags: ['million', 'stats', 'milestones'],
    ranked: false,
    visibility: 'public',
    likes: ['user1', 'user2'],
    viewsCount: 6500,
    films: [
      { movieId: '496243', title: 'Parasite', posterPath: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', releaseYear: '2019', order: 1 },
      { movieId: '155', title: 'The Dark Knight', posterPath: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', releaseYear: '2008', order: 2 },
      { movieId: '157336', title: 'Interstellar', posterPath: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', releaseYear: '2014', order: 3 },
      { movieId: '27205', title: 'Inception', posterPath: '/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg', releaseYear: '2010', order: 4 },
      { movieId: '550', title: 'Fight Club', posterPath: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', releaseYear: '1999', order: 5 }
    ]
  },
  {
    userId: 'sophie',
    username: 'sophie',
    name: 'classic movies for beginners.',
    description: 'A curated starter pack for getting into cinema history from the golden age to new wave.',
    tags: ['beginners', 'classics', 'essential'],
    ranked: false,
    visibility: 'public',
    likes: ['user1', 'user4'],
    viewsCount: 4200,
    films: [
      { movieId: '238', title: 'The Godfather', posterPath: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', releaseYear: '1972', order: 1 },
      { movieId: '680', title: 'Pulp Fiction', posterPath: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', releaseYear: '1994', order: 2 },
      { movieId: '389', title: '12 Angry Men', posterPath: '/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg', releaseYear: '1957', order: 3 },
      { movieId: '424', title: "Schindler's List", posterPath: '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg', releaseYear: '1993', order: 4 },
      { movieId: '244786', title: 'Whiplash', posterPath: '/7fn624j5lj3xTme2SgiLCeuedmO.jpg', releaseYear: '2014', order: 5 }
    ]
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    const count = await List.countDocuments();
    if (count === 0) {
      await List.insertMany(seedLists);
      console.log('Seeded sample lists successfully');
    } else {
      console.log(`Lists collection already has ${count} lists`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

seed();
