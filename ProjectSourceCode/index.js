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
const multer = require('multer');


// ------------- connecting to DB and adding handlebars -------------------------------

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
    extname: 'hbs',
    layoutsDir: __dirname + '/views/layouts',
    partialsDir: __dirname + '/views/partials',
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


// Google Maps API key AIzaSyBFJWukbwIMrbF7mwJFtuY06XHvlvF95I4

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
    // Get the new user's ID
    req.session.user = newUser;
    return res.redirect('/');

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
  const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [req.body.username]);
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

// --------------------------------------- PROFILE ENDPOINTS ------------------------------------------------------------------

const upload = multer({ storage: multer.memoryStorage() });

app.get('/profile', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  try {
    const userId = req.session.userId;

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
      `SELECT 1 FROM reviews WHERE username = $1 LIMIT 1`,
      [userId]
    );

    // User's ID - for adding friends
    const IDQuery = `SELECT users.user_id
                     FROM users`;
    const ID = await db.any(IDQuery, [userId]);

    // Collect earned achievements
    const achievements = [];
    if (firstWalk) achievements.push({ title: "Take your first walk" });
    if (firstFriend) achievements.push({ title: "Add your first friend" });
    if (firstReview) achievements.push({ title: "Leave your first review" });

    // friends
    const friendQuery = `SELECT users.username 
                         FROM users 
                         WHERE users.user_id IN (SELECT friend_id FROM user_to_friend WHERE user_id = $1)`;         
    const friends = await db.any(friendQuery, [userId]);
    
    // recent walks
    const recentWalksQuery = `SELECT history.date, history.buddy 
                              FROM history INNER JOIN user_to_history 
                              ON history.history_id = user_to_history.history_id 
                              INNER JOIN users ON users.user_id = user_to_history.username 
                              WHERE user_to_history.username = $1
                              ORDER BY history.date DESC 
                              LIMIT 3`;
    const recentWalks = await db.any(recentWalksQuery, [userId]);

    // for debugging purposes
    console.log(achievements);
    console.log(friends);
    console.log(recentWalks);
    
    const user = req.session.user;
    const userData = {
    name: user.username,
    avatar: `/avatar/${user.user_id}`,
    ID: user.ID,
    bio: user.bio || "This user hasn’t written a bio yet.",
    friends: friends,
    recentWalks: recentWalks,
    achievements: achievements
  };
  res.render('pages/profile', { userData });
}
catch (err) {
  res.status(500).send('Profile error');
}
});

// Uploading avatars
app.post('/upload-avatar', upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.session.user?.user_id;
    if (!userId) {
      return res.status(401).send('Unauthorized');
    }

    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const avatarBuffer = req.file.buffer;

    await db.query(
      'UPDATE users SET avatar = $1 WHERE user_id = $2',
      [avatarBuffer, userId]
    );

    const updatedUser = await db.one(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );
    req.session.user = updatedUser;

    res.redirect('/settings');
  } catch (err) {
    res.status(500).send('Server error while uploading avatar.');
  }
});

// Fetching avatars
const FileType = require('file-type');
app.get('/avatar/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const rows = await db.any('SELECT avatar FROM users WHERE user_id = $1', [userId]);

    if (!rows.length || !rows[0].avatar) {
      return res.redirect('https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg');
    }

    const avatarBuffer = rows[0].avatar;

    const fileType = await FileType.fromBuffer(avatarBuffer);
    res.set('Content-Type', fileType?.mime || 'application/octet-stream');
    res.send(avatarBuffer);
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
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const user = req.session.user;
  const userData = {
    username: user.username,
    avatar: `/avatar/${user.user_id}`,
    bio: user.bio || "This user hasn’t written a bio yet.",
    password: user.password,
    email: user.email || "",
    firstname: user.firstname || "",
    lastname: user.lastname || ""
  };

  res.render('pages/settings', {userData});
});

app.post('/settings', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

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

    // Get latest session user from DB for fresh state
    const currentUser = await db.one('SELECT * FROM users WHERE user_id = $1', [userId]);

    // Check if password update is requested
    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        return res.render('pages/settings', {
          userData: currentUser,
          message: 'Please enter your current password.',
          error: true
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, currentUser.password);
      if (!isMatch) {
        return res.render('pages/settings', {
          userData: currentUser,
          message: 'Current password is incorrect.',
          error: true
        });
      }

      if (newPassword !== confirmPassword) {
        return res.render('pages/settings', {
          userData: currentUser,
          message: 'New passwords do not match.',
          error: true
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await db.none('UPDATE users SET password = $1 WHERE user_id = $2', [hashedPassword, userId]);
    }

    await db.none(
      `UPDATE users 
       SET username = $1, firstname = $2, lastname = $3, email = $4 
       WHERE user_id = $5`,
      [username, firstname, lastname, email, userId]
    );

    const updatedUser = await db.one('SELECT * FROM users WHERE user_id = $1', [userId]);
    req.session.user = updatedUser;

    res.render('pages/settings', {
      userData: {
        ...updatedUser,
        avatar: `/avatar/${updatedUser.user_id}`,
        bio: updatedUser.bio || "This user hasn’t written a bio yet."
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
