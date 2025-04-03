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

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// --------------------- put APIs here --------------------------------------


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
      // Hash the password using bcrypt
      const hash = await bcrypt.hash(req.body.password, 10);
      const username = req.body.username; 

      // Insert username and hashed password into the 'users' table
      const query = 'INSERT INTO users (username, password) VALUES ($1, $2)';
      await db.query(query, [username, hash]); 

      return res.render('pages/register', {message: 'User registered successfully', error:false});
  } 
  catch (error) 
  {
      console.error(error);
      return res.render('pages/register', {message: 'User already registered', error:true});
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

// ----------------------- starting the server -----------------------


app.listen(3000);
console.log('Server is listening on port 3000');

