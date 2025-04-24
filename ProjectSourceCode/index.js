// ---------------- dependencies -----------------------------------------------------------
const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const multer = require('multer');
const FileType = require('file-type');

// ------------- connecting to DB and adding handlebars -------------------------------
const hbs = handlebars.create({
    extname: 'hbs',
    layoutsDir: __dirname + '/views/layouts',
    partialsDir: __dirname + '/views/partials',
    helpers: {
      times: function(n, block) {
        let accum = '';
        for (let i = 0; i < n; ++i) {
          accum += block.fn(i);
        }
        return accum;
      },
      formatDate: function(date) {
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    }
  });

app.use(express.static(path.join(__dirname, 'public')));
app.use('/styles', express.static(path.join(__dirname, 'views/styles')));

const dbConfig = {
  host: 'db',
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};

const db = pgp(dbConfig);

db.connect()
  .then(obj => {
    console.log('Database connection successful');
    obj.done();
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// ------- App Settings --------
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(express.static(path.join(__dirname, 'resources')));

// Middleware to ensure friend codes exist for existing users
app.use(async (req, res, next) => {
  if (req.session.user && !req.session.user.friend_code) {
    try {
      // Generate a random 8-character friend code
      const friendCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      await db.none(
        'UPDATE users SET friend_code = $1 WHERE user_id = $2',
        [friendCode, req.session.user.user_id]
      );
      // Refresh the session user
      const updatedUser = await db.one(
        'SELECT * FROM users WHERE user_id = $1',
        [req.session.user.user_id]
      );
      req.session.user = updatedUser;
    } catch (err) {
      console.error('Error generating friend code:', err);
    }
  }
  next();
});

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// --------------------- Routes --------------------------------------

app.get('/welcome', (req, res) => {
  res.json({ status: 'success', message: 'Welcome!' });
});

app.get('/', (req, res) => {
  res.render('pages/home');
});

app.get('/maps', (req, res) => {
  res.render('pages/maps');
});

// API endpoint to check authentication status
app.get('/api/check-auth', (req, res) => {
  res.json({ isAuthenticated: !!req.session.user });
});

// API endpoint to toggle trail saving
app.post('/api/toggle-save-trail', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { trailId } = req.body;
    const userId = req.session.user.user_id;

    // Check if trail is already saved
    const isSaved = await db.oneOrNone(
      'SELECT 1 FROM user_saved_trails WHERE user_id = $1 AND trail_id = $2',
      [userId, trailId]
    );

    if (isSaved) {
      // If already saved, unsave it
      await db.none(
        'DELETE FROM user_saved_trails WHERE user_id = $1 AND trail_id = $2',
        [userId, trailId]
      );
      return res.json({ isSaved: false });
    } else {
      // If not saved, save it
      await db.none(
        'INSERT INTO user_saved_trails (user_id, trail_id) VALUES ($1, $2)',
        [userId, trailId]
      );
      return res.json({ isSaved: true });
    }
  } catch (error) {
    console.error('Error toggling saved trail:', error);
    res.status(500).json({ error: 'Failed to toggle saved trail' });
  }
});

// Get all trails with saved status for authenticated users
app.get('/api/trails', async (req, res) => {
  try {
    let trails = await db.any('SELECT * FROM trails');
    
    // If user is logged in, check which trails they've saved
    if (req.session.user) {
      const userId = req.session.user.user_id;
      const savedTrails = await db.any(
        'SELECT trail_id FROM user_saved_trails WHERE user_id = $1',
        [userId]
      );
      
      const savedTrailIds = savedTrails.map(t => t.trail_id);
      trails = trails.map(trail => ({
        ...trail,
        is_saved: savedTrailIds.includes(trail.trail_id)
      }));
    } else {
      // For non-logged in users, set is_saved to false for all trails
      trails = trails.map(trail => ({
        ...trail,
        is_saved: false
      }));
    }
    
    res.json(trails);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ 
      error: 'Database error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Trail details page
app.get('/trail/:id', async (req, res) => {
  try {
    const trailId = req.params.id;
    
    // Get trail details
    const trail = await db.one('SELECT * FROM trails WHERE trail_id = $1', [trailId]);
    
    // Get reviews for this trail with user info
    const reviews = await db.any(`
      SELECT 
        r.*,
        u.username,
        u.user_id
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.trail_id = $1
      ORDER BY r.created_at DESC
    `, [trailId]);

    // Get images for each review
    for (const review of reviews) {
      review.images = await db.any(`
        SELECT i.image_url 
        FROM images i
        JOIN reviews_to_images ri ON i.image_id = ri.image_id
        WHERE ri.review_id = $1
      `, [review.review_id]);
    }

    res.render('pages/trail', { 
      trail: {
        ...trail,
        reviews: reviews
      },
      is_saved: req.session.user 
        ? await db.oneOrNone(
            'SELECT 1 FROM user_saved_trails WHERE user_id = $1 AND trail_id = $2',
            [req.session.user.user_id, trailId]
          )
        : false
    });
  } catch (error) {
    res.status(404).render('pages/404');
  }
});

// Reviews routes
app.get('/reviews', async (req, res) => {
  try {
    // Get all trails with their average ratings and review counts
    const trails = await db.any(`
      SELECT 
        t.trail_id,
        t.distance,
        t.start_location,
        t.end_location,
        t.name as trail_name,
        t.difficulty,
        t.description,
        t.image_url,
        COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) as avg_rating,
        COUNT(r.review_id) as review_count
      FROM trails t
      LEFT JOIN reviews r ON t.trail_id = r.trail_id
      GROUP BY t.trail_id
      ORDER BY t.name
    `);

    // Get all reviews with user information
    const allReviews = await db.any(`
      SELECT 
        r.*,
        u.username,
        u.user_id,
        t.name as trail_name,
        t.trail_id
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      JOIN trails t ON r.trail_id = t.trail_id
      ORDER BY r.created_at DESC
    `);

    // Group reviews by trail_id
    const reviewsByTrail = {};
    allReviews.forEach(review => {
      if (!reviewsByTrail[review.trail_id]) {
        reviewsByTrail[review.trail_id] = [];
      }
      reviewsByTrail[review.trail_id].push(review);
    });

    // Get all trails for the dropdown
    const allTrails = await db.any('SELECT * FROM trails ORDER BY name');

    // Pass success/error messages from session
    const successMessage = req.session.successMessage;
    const errorMessage = req.session.errorMessage;
    delete req.session.successMessage;
    delete req.session.errorMessage;

    res.render('pages/reviews', {
      trails: trails.map(trail => ({
        ...trail,
        avg_rating: trail.avg_rating, // Already formatted in SQL
        reviews: reviewsByTrail[trail.trail_id] || []
      })),
      allTrails,
      successMessage,
      errorMessage,
      helpers: {
        formatDate: function(date) {
          return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        },
        times: function(n, block) {
          let accum = '';
          for (let i = 0; i < n; ++i) {
            accum += block.fn(i);
          }
          return accum;
        }
      }
    });
  } catch (error) {
    console.error('Error loading reviews:', error);
    res.status(500).render('pages/error', {
      message: 'Failed to load reviews',
      error: true
    });
  }
});

// Handle review submission
const reviewUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

app.post('/reviews', reviewUpload.array('images', 5), async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).redirect('/login');
    }

    const { trail_id, rating, written_review } = req.body;
    const user_id = req.session.user.user_id;

    // Insert review
    const review = await db.one(`
      INSERT INTO reviews (user_id, trail_id, rating, written_review)
      VALUES ($1, $2, $3, $4)
      RETURNING review_id
    `, [user_id, trail_id, rating, written_review]);

    // Handle image uploads if any
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // In a real app, you'd upload to cloud storage, but for simplicity we'll store the URL
        const imageUrl = `/uploads/${Date.now()}-${file.originalname}`;
        
        // Insert image record
        const image = await db.one(`
          INSERT INTO images (image_url, image_caption)
          VALUES ($1, $2)
          RETURNING image_id
        `, [imageUrl, `Image for review ${review.review_id}`]);

        // Link image to review
        await db.none(`
          INSERT INTO reviews_to_images (image_id, review_id)
          VALUES ($1, $2)
        `, [image.image_id, review.review_id]);
      }
    }

    // Update trail average rating
    await db.none(`
      UPDATE trails 
      SET average_rating = (
        SELECT AVG(rating) 
        FROM reviews 
        WHERE trail_id = $1
      )
      WHERE trail_id = $1
    `, [trail_id]);

    res.redirect('/reviews');
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).render('pages/error', {
      message: 'Failed to submit review',
      error: true
    });
  }
});

app.post('/submit-review', async (req, res) => {
  const { trail_id, rating, written_review } = req.body;
  const userId = req.session.user?.user_id;

  // Basic validation
  if (!userId) {
    req.session.errorMessage = 'You must be logged in to submit a review.';
    return res.redirect('/login');
  }

  if (!trail_id || !rating || !written_review) {
    req.session.errorMessage = 'All fields are required.';
    return res.redirect('/reviews');
  }

  try {
    // Check if user already reviewed this trail
    const existingReview = await db.oneOrNone(
      'SELECT 1 FROM reviews WHERE user_id = $1 AND trail_id = $2',
      [userId, trail_id]
    );

    if (existingReview) {
      req.session.errorMessage = 'You have already reviewed this trail.';
      return res.redirect('/reviews');
    }

    // Insert the new review
    await db.none(
      'INSERT INTO reviews (trail_id, user_id, rating, written_review) VALUES ($1, $2, $3, $4)',
      [trail_id, userId, parseFloat(rating), written_review]
    );

    // Update the trail's average rating
    await db.none(`
      UPDATE trails 
      SET average_rating = (
        SELECT AVG(rating)::numeric(10,1)
        FROM reviews 
        WHERE trail_id = $1
      )
      WHERE trail_id = $1
    `, [trail_id]);

    req.session.successMessage = 'Review submitted successfully!';
    return res.redirect('/reviews');
  } catch (error) {
    console.error('Error saving review:', error);
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique violation
      req.session.errorMessage = 'You have already reviewed this trail.';
    } else {
      req.session.errorMessage = 'Failed to save review. Please try again.';
    }
    
    return res.redirect('/reviews');
  }
});
// ---------- LOGIN/LOGOUT/REGISTER ----------------------------------------
app.get('/register', (req, res) => {
  res.render('pages/register');
});

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (username.length > 30) {
      return res.status(400).render('pages/register', {
        message: 'Username cannot be longer than 30 characters',
        error: true,
      });
    }

    const userExists = await db.oneOrNone('SELECT 1 FROM users WHERE username = $1', [username]);
    if (userExists) {
      return res.render('pages/register', {
        message: 'Username already taken',
        error: true,
      });
    }

    const hash = await bcrypt.hash(password, 12);
    // Generate a random 8-character friend code
    const friendCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    await db.none(
      'INSERT INTO users (username, password, friend_code) VALUES ($1, $2, $3)',
      [username, hash, friendCode]
    );

    const newUser = await db.one('SELECT * FROM users WHERE username = $1', [username]);
    req.session.user = newUser;
    return res.redirect('/');
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === '23505') {
      return res.render('pages/register', {
        message: 'Username already taken',
        error: true,
      });
    }
    return res.render('pages/register', {
      message: 'Registration failed. Please try again.',
      error: true,
    });
  }
});

app.get('/login', (req, res) => {
  res.render('pages/login');
});

app.post('/login', async (req, res) => {
  const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [req.body.username]);
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return res.render('pages/login', {
      message: 'Incorrect username or password.',
      error: true,
    });
  }
  req.session.user = user;
  req.session.save();
  res.redirect('/');
});

const auth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.render('/', { message: 'Logout was not successful', error: true });
    }
    return res.render('pages/logout', { message: 'Logout was successful!', error: false });
  });
});

app.use(auth);

// --------------------------------------- PROFILE ENDPOINTS ------------------------------------------------------------------
const upload = multer({ storage: multer.memoryStorage() });

app.get('/profile', async (req, res) => {
  try {
    const user = req.session.user;
    const userId = req.session.user.user_id;

    // Get saved trails
    const savedTrails = await db.any(`
      SELECT t.* 
      FROM trails t
      JOIN user_saved_trails ust ON t.trail_id = ust.trail_id
      WHERE ust.user_id = $1
    `, [userId]);

    // Get friends
    const friends = await db.any(`
      SELECT u.user_id, u.username, u.avatar, u.friend_code
      FROM user_to_friend uf
      JOIN users u ON uf.friend_id = u.user_id
      WHERE uf.username = $1
    `, [userId]);
    
    // Get pending requests with sender info
    const friendRequests = await db.any(`
      SELECT 
        fr.request_id, 
        fr.created_at,
        u.user_id as sender_id,
        u.username as sender_username,
        u.avatar as sender_avatar,
        u.friend_code as sender_friend_code
      FROM friend_requests fr
      JOIN users u ON fr.sender_id = u.user_id
      WHERE fr.receiver_id = $1 AND fr.status = 'pending'
    `, [userId]);

    const userData = {
      name: user.username,
      avatar: `/avatar/${user.user_id}`,
      bio: user.bio || "This user hasn't written a bio yet.",
      friend_code: user.friend_code
    };

// achievements
    // Check if user has taken their first walk
    const firstWalk = await db.oneOrNone(
      `SELECT 1 FROM user_to_history WHERE username = $1 LIMIT 1`,
      [userId]
    );

    // Check if user has added their first friend
    const firstFriend = await db.oneOrNone(
      `SELECT 1 FROM user_to_friend WHERE username = $1 LIMIT 1`,
      [userId]
    );

    // Check if user has left their first review
    const firstReview = await db.oneOrNone(
      `SELECT 1 FROM reviews WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    // Collect earned achievements
    const achievements = [];
    if (firstWalk) achievements.push({ title: "Take your first walk" });
    if (firstFriend) achievements.push({ title: "Add your first friend" });
    if (firstReview) achievements.push({ title: "Leave your first review" });

    // recent walks
    const recentWalksQuery = `SELECT history.date, history.buddy 
                              FROM history INNER JOIN user_to_history 
                              ON history.history_id = user_to_history.history_id 
                              INNER JOIN users ON users.user_id = user_to_history.username 
                              WHERE user_to_history.username = $1
                              ORDER BY history.date DESC 
                              LIMIT 3`;
    const recentWalks = await db.any(recentWalksQuery, [userId]);

    res.render('pages/profile', { 
      userData,
      savedTrails: savedTrails || [],
      friends: friends || [],
      friendRequests: friendRequests || []
    });
  } catch (error) {
    console.error('Error loading profile:', error);
    res.status(500).render('pages/error', { 
      message: 'Error loading profile',
      error: true
    });
  }
});

// Friend system endpoints
app.post('/api/friends/request', async (req, res) => {
  try {
    const { friend_code } = req.body;
    const userId = req.session.user.user_id;
    
    // Find user with this friend code
    const friendUser = await db.oneOrNone(
      'SELECT user_id FROM users WHERE friend_code = $1 AND user_id != $2',
      [friend_code, userId]
    );
    
    if (!friendUser) {
      return res.status(404).json({ message: 'User not found with this friend code' });
    }
    
    const friendId = friendUser.user_id;
    
    // Check if request already exists
    const existingRequest = await db.oneOrNone(
      `SELECT * FROM friend_requests 
       WHERE (sender_id = $1 AND receiver_id = $2) 
          OR (sender_id = $2 AND receiver_id = $1)`,
      [userId, friendId]
    );
    
    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already exists' });
    }
    
    // Check if already friends
    const existingFriend = await db.oneOrNone(
      `SELECT * FROM user_to_friend 
       WHERE (username = $1 AND friend_id = $2) 
          OR (username = $2 AND friend_id = $1)`,
      [userId, friendId]
    );
    
    if (existingFriend) {
      return res.status(400).json({ message: 'You are already friends with this user' });
    }
    
    // Create new friend request
    await db.none(
      'INSERT INTO friend_requests (sender_id, receiver_id) VALUES ($1, $2)',
      [userId, friendId]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.put('/api/friends/request/:requestId', async (req, res) => {
  try {
    const { action } = req.body;
    const requestId = req.params.requestId;
    const userId = req.session.user.user_id;
    
    // Verify request exists and belongs to user
    const request = await db.oneOrNone(
      `SELECT * FROM friend_requests 
       WHERE request_id = $1 AND receiver_id = $2 AND status = 'pending'`,
      [requestId, userId]
    );
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    const { sender_id, receiver_id } = request;
    
    if (action === 'accept') {
      try {
        await db.tx(async t => {
          // Use INSERT ... ON CONFLICT DO NOTHING to safely handle duplicates
          await t.none(`
            INSERT INTO user_to_friend (username, friend_id) 
            VALUES ($1, $2) 
            ON CONFLICT (username, friend_id) DO NOTHING`,
            [receiver_id, sender_id]
          );
          
          await t.none(`
            INSERT INTO user_to_friend (username, friend_id) 
            VALUES ($1, $2) 
            ON CONFLICT (username, friend_id) DO NOTHING`,
            [sender_id, receiver_id]
          );

          // Update request status
          await t.none(
            'UPDATE friend_requests SET status = $1 WHERE request_id = $2',
            ['accepted', requestId]
          );
        });
      } catch (err) {
        console.error('Transaction error:', err);
        throw err;
      }
    } else if (action === 'reject') {
      await db.none(
        'UPDATE friend_requests SET status = $1 WHERE request_id = $2',
        ['rejected', requestId]
      );
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error processing friend request:', err);
    res.status(500).json({ 
      message: 'Server Error',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

app.get('/api/friends', async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const friends = await db.any(`
      SELECT u.user_id, u.username, u.avatar, u.friend_code
      FROM user_to_friend uf
      JOIN users u ON uf.friend_id = u.user_id
      WHERE uf.username = $1
    `, [userId]);
    
    res.json(friends);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.get('/api/friends/requests', async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const requests = await db.any(`
      SELECT fr.request_id, fr.created_at, 
             u.user_id, u.username, u.avatar, u.friend_code
      FROM friend_requests fr
      JOIN users u ON fr.sender_id = u.user_id
      WHERE fr.receiver_id = $1 AND fr.status = 'pending'
    `, [userId]);
    
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.post('/upload-avatar', upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.session.user?.user_id;
    if (!userId || !req.file) return res.status(400).send('Missing user or file.');
    await db.query('UPDATE users SET avatar = $1 WHERE user_id = $2', [req.file.buffer, userId]);
    const updatedUser = await db.one('SELECT * FROM users WHERE user_id = $1', [userId]);
    req.session.user = updatedUser;
    res.redirect('/settings');
  } catch (err) {
    res.status(500).send('Server error while uploading avatar.');
  }
});

app.get('/avatar/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const rows = await db.any('SELECT avatar FROM users WHERE user_id = $1', [userId]);
    if (!rows.length || !rows[0].avatar) {
      return res.redirect('https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg');
    }
    const fileType = await FileType.fromBuffer(rows[0].avatar);
    res.set('Content-Type', fileType?.mime || 'application/octet-stream');
    res.send(rows[0].avatar);
  } catch (err) {
    res.status(500).send('Server error.');
  }
});

// document.addEventListener("DOMContentLoaded", function () {
//   const input = document.getElementById('friendSearchInput');
//   const resultsContainer = document.getElementById('searchResults');

//   if (!input || !resultsContainer) return;

//   input.addEventListener('input', async function () {
//     const query = input.value.trim();

//     if (query.length < 2) {
//       resultsContainer.innerHTML = '';
//       return;
//     }

//     try {
//       const res = await fetch(`/search-friends?q=${encodeURIComponent(query)}`);
//       const data = await res.json();

//       if (data.length === 0) {
//         resultsContainer.innerHTML = '<p class="text-muted">No users found.</p>';
//       } else {
//         resultsContainer.innerHTML = data.map(user => `
//           <div class="d-flex justify-content-between align-items-center mb-2">
//             <span>${user.username}</span>
//             <form method="POST" action="/add-friend">
//               <input type="hidden" name="search" value="${user.username}">
//               <button type="submit" class="btn btn-sm btn-success">Add</button>
//             </form>
//           </div>
//         `).join('');
//       }
//     } catch (err) {
//       resultsContainer.innerHTML = '<p class="text-danger">Error searching users.</p>';
//     }
//   });
// });

// Friend Search
app.post('/add-friend', async (req, res) => {
  const currentUserId = req.session.userId;
  const searchTerm = req.body.search;

  // Find the user by username
  const userResult = await db.query(
    'SELECT user_id FROM users WHERE username = $1 AND user_id != $2',
    [searchTerm, currentUserId]
  );

  if (userResult.rows.length === 0) {
    return res.send('User not found or already added.');
  }

  const friendId = userResult.rows[0].user_id;

  // Check if already friends
  const existing = await db.query(
    'SELECT * FROM user_to_friend WHERE user_id = $1 AND friend_id = $2',
    [currentUserId, friendId]
  );

  if (existing.rows.length === 0) {
    // Add to user_to_friend

    // if we want to make it one way
      // await db.query(
      //   'INSERT INTO user_to_friend (user_id, friend_id) VALUES ($1, $2)',
      //   [currentUserId, friendId]
      // );

    // to make it bidirectional
    await db.query(
      `INSERT INTO user_to_friend (user_id, friend_id)
       VALUES ($1, $2), ($2, $1)
       ON CONFLICT DO NOTHING`,
      [currentUserId, friendId]
    );
  }

  res.redirect('/profile');
});
// // Friend search API
// app.get('/search-friends', async (req, res) => {
//   const search = req.query.q;
//   const currentUserId = req.session.userId;

//   if (!search) return res.json([]);

//   try {
//     const users = await db.any(
//       `SELECT username FROM users 
//        WHERE username ILIKE $1 AND user_id != $2 
//        LIMIT 10`, 
//       [`%${search}%`, currentUserId]
//     );
//     res.json(users);
//   } catch (err) {
//     console.error('Search error:', err);
//     res.status(500).json([]);
//   }
// });

// // In your route handler
// router.get("/find-friends", async (req, res) => {
//   const currentUser = req.session.user;

//   const allUsers = await db.any('SELECT user_id AS id, username AS name, encode(avatar, \'base64\') AS avatar FROM users');

//   // Convert avatars if needed
//   const usersWithAvatars = allUsers.map(user => ({
//     ...user,
//     avatar: user.avatar 
//       ? `data:image/png;base64,${user.avatar}` 
//       : 'https://i.pravatar.cc/100?u=' + user.id
//   }));

//   res.render("find-friends", {
//     userData: currentUser,
//     allUsers: usersWithAvatars
//   });
// });


// --------------------------------------- SETTINGS ENDPOINTS ------------------------------------------------------------------
app.get('/settings', (req, res) => {
  const user = req.session.user;
  const userData = {
    username: user.username,
    avatar: `/avatar/${user.user_id}`,
    bio: user.bio || "This user hasn't written a bio yet.",
    password: user.password,
    email: user.email || "",
    firstname: user.firstname || "",
    lastname: user.lastname || ""
  };
  res.render('pages/settings', { userData });
});

app.post('/settings', async (req, res) => {
  const {
    username,
    firstname,
    lastname,
    email,
    currentPassword,
    newPassword,
    confirmPassword
  } = req.body;
  try {
    const userId = req.session.user.user_id;
    const currentUser = await db.one('SELECT * FROM users WHERE user_id = $1', [userId]);

    if (newPassword || confirmPassword) {
      if (!currentPassword || !(await bcrypt.compare(currentPassword, currentUser.password))) {
        return res.render('pages/settings', { userData: currentUser, message: 'Current password is incorrect.', error: true });
      }
      if (newPassword !== confirmPassword) {
        return res.render('pages/settings', { userData: currentUser, message: 'New passwords do not match.', error: true });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await db.none('UPDATE users SET password = $1 WHERE user_id = $2', [hashedPassword, userId]);
    }

    await db.none('UPDATE users SET username = $1, firstname = $2, lastname = $3, email = $4 WHERE user_id = $5', [username, firstname, lastname, email, userId]);

    const updatedUser = await db.one('SELECT * FROM users WHERE user_id = $1', [userId]);
    req.session.user = updatedUser;

    res.render('pages/settings', {
      userData: {
        ...updatedUser,
        avatar: `/avatar/${updatedUser.user_id}`,
        bio: updatedUser.bio || "This user hasn't written a bio yet."
      },
      message: 'Settings updated successfully!',
      error: false
    });
  } catch (err) {
    console.error(err);
    res.render('pages/settings', {
      userData: req.session.user,
      message: 'Something went wrong updating your settings.',
      error: true
    });
  }
});

// ----------------------- starting the server -----------------------
const server = app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

module.exports = server;