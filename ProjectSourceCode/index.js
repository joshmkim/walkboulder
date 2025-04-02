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
app.use(session({ secret: 'somevalue' }));
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


// ----------------------- starting the server -----------------------

app.listen(3000);
console.log('Server is listening on port 3000');



// ----------------------- User Reviews -----------------------

const reviews = [];

function saveReview() {
  let written_review = document.getElementById("written_review").value;
  let trail = document.getElementById("trail").value;
  let star_rating = document.getElementById("star_rating").value;

  const reviewDetails = {
      written_review: written_review,
      trail: trail,
      star_rating: star_rating
  }

  reviews.push(reviewDetails);
  document.getElementById('review_modal').querySelector('form').reset();

}
