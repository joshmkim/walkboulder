// ---------------- dependencies -----------------------------------------------------------

const express = require('express'); // building API server
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // connection to postgres server
const bodyParser = require('body-parser');
const session = require('express-session'); // setting session object to allow user session through a login.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from other APIs

// ------------- connecting to DB and adding handlebars -------------------------------

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
// const hbs = handlebars.create({
//     extname: 'hbs',
//     layoutsDir: __dirname + '/views/layouts',
//     partialsDir: __dirname + '/views/partials',
//   });
  const hbs = handlebars.create({
    extname: 'hbs',
    layoutsDir: __dirname + '/views/layouts',
    partialsDir: __dirname + '/views/partials',
    helpers: {
        // Add this helper for star ratings
        times: function(n, block) {
            let accum = '';
            for (let i = 0; i < n; ++i) {
                accum += block.fn(i);
            }
            return accum;
        }
    }
});

  // database configuration
  const dbConfig = {
    host: 'db', // the database server
    port: 5432, // the database port
    database: process.env.POSTGRES_DB, // the database name
    user: process.env.POSTGRES_USER, // the user account to connect with
    password: process.env.POSTGRES_PASSWORD, // the password of the user account
  };
  
  const db = pgp(dbConfig);
  
  // test your database
  db.connect()
    .then(obj => {
      console.log('Database connection successful'); // you can view this message in the docker compose logs
      obj.done(); // success, release the connection;
    })
    .catch(error => {
      console.log('ERROR:', error.message || error);
    });

// ------- App Settings --------

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// --------------------- put APIs here --------------------------------------

app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});


app.get('/', (req, res) =>
{
    res.render('pages/home')
});

app.get('/maps', (req, res) =>
{
  res.render('pages/maps')
})

// ---------- LOGIN/LOGOUT/REGISTER ----------------------------------------

//register 

app.get('/register', (req, res) => {
  res.render('pages/register')
});

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Check if the username length exceeds 30 characters
    if (username.length > 30) {
      return res.status(400).render('pages/register', { 
        message: 'Username cannot be longer than 30 characters', 
        error: true 
      });
    }

    // 2. Check if user already exists
    const userExists = await db.oneOrNone(
      'SELECT 1 FROM users WHERE username = $1', 
      [username]
    );

    if (userExists) {
      return res.render('pages/register', {
        message: 'Username already taken',
        error: true
      });
    }

    // 3. Hash password and create user
    const hash = await bcrypt.hash(password, 12); // Increased salt rounds
    await db.none(
      'INSERT INTO users (username, password) VALUES ($1, $2)',
      [username, hash]
    );

    // 4. Auto-login after registration
    const newUser = await db.one(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    
    req.session.user = newUser;
    return res.redirect('/');

  } catch (error) {
    console.error('Registration error:', error);
    
    // Specific error for unique violation
    if (error.code === '23505') {
      return res.render('pages/register', {
        message: 'Username already taken',
        error: true
      });
    }
    
    // Generic error for other cases
    return res.render('pages/register', {
      message: 'Registration failed. Please try again.',
      error: true
    });
  }
});


// login

app.get('/login', (req, res) => {
  res.render('pages/login')
});

app.post('/login', async (req, res) => {
  const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [req.body.username,]);
  if (!user) 
  {
      return res.render('pages/login', {message: 'Incorrect username or password.',error: true,});
  }
  const match = await bcrypt.compare(req.body.password, user.password);
  if (!match) 
  {
      return res.render('pages/login', {message: 'Incorrect username or password.',error: true,});
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

// logout

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
      if (err) {
          return res.render('/', {message: 'Logout was not successful',error: true,});
      }
      return res.render('pages/logout', {message: 'Logout was successful!',error: false});
  });
});

// Authentication Required
app.use(auth); // I would advise putting routes like reviews and group walks AFTER this auth as I think users should have to login before they are allowed to post reviews or go on group walks


app.get('/reviews', async (req, res) => {
  try {
    // Get all trails first (for the modal dropdown)
    const allTrails = await db.any('SELECT * FROM trails');

    // Get trails with average ratings and review counts
    const trailsWithStats = await db.any(`
      SELECT 
        t.trail_id,
        t.trail_name,
        COALESCE(AVG(r.rating), 0) AS avg_rating,
        COUNT(r.review_id) AS review_count
      FROM trails t
      LEFT JOIN reviews r ON t.trail_id = r.trail_id
      GROUP BY t.trail_id
      ORDER BY review_count DESC, avg_rating DESC
    `);

    // Get all reviews with user info
    const allReviews = await db.any(`
      SELECT 
        r.review_id,
        r.trail_id,
        r.rating,
        r.written_review,
        u.username
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
    `);

    // Group reviews by trail_id
    const reviewsByTrail = {};
    allReviews.forEach(review => {
      if (!reviewsByTrail[review.trail_id]) {
        reviewsByTrail[review.trail_id] = [];
      }
      reviewsByTrail[review.trail_id].push(review);
    });

    res.render('pages/reviews', { 
      trails: trailsWithStats.map(trail => ({
        ...trail,
        avg_rating: parseFloat(trail.avg_rating).toFixed(1),
        reviews: reviewsByTrail[trail.trail_id] || []
      })),
      allTrails: allTrails, // Pass all trails separately for the modal
      sortBy: 'popular' // default sort
    });
  } catch (error) {
    console.error('Error loading reviews:', error);
    res.status(500).send('Failed to load reviews');
  }
});

app.post('/submit-review', async (req, res) => {
  const { trail_id, rating, written_review } = req.body;
  const userId = req.session.user.user_id;

  try {
    await db.none(
      'INSERT INTO reviews (trail_id, user_id, rating, written_review) VALUES ($1, $2, $3, $4)',
      [trail_id, userId, parseFloat(rating), written_review]
    );

    res.redirect('/reviews');
  } catch (error) {
    console.error('Error saving review:', error);
    res.status(500).send('Failed to save review');
  }
});




// ----------------------- starting the server -----------------------


const server = app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

module.exports = server;