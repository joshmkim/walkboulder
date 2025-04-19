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
});




app.get('/api/trails', async (req, res) => {
  try {
    console.log('Attempting to fetch trails...'); // Debug log
    const trails = await db.any('SELECT * FROM trails');
    console.log('Trails found:', trails); // Debug log
    
    if (!trails || trails.length === 0) {
      console.warn('No trails found in database'); // Debug log
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
    await db.none('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hash]);

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

app.get('/profile', (req, res) => {
  const user = req.session.user;
  const userData = {
    name: user.username,
    avatar: `/avatar/${user.user_id}`,
    bio: user.bio || "This user hasn’t written a bio yet."
  };
  res.render('pages/profile', { userData });
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

// --------------------------------------- SETTINGS ENDPOINTS ------------------------------------------------------------------

app.get('/settings', (req, res) => {
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
