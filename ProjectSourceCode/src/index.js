// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

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

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

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

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'resources')));

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************

/************************ 
 Login Page Routes
*************************/

// Redirect to the /login endpoint
app.get('/', (req, res) => {
    res.redirect('/login');
  });
  
  // Render login page for /login route
  app.get('/login', (req, res) => {
    res.render('pages/login');
  });
  
  // Trigger login form to check database for matching username and password
  app.post('/login', async (req, res) => {
    try {
  
      // Check if username exists in DB
      const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', req.body.username);
  
      if (!user) {
        // Redirect user to login screen if no user is found with the provided username
        return res.redirect('/register');
      }
  
      // Check if password from request matches with password in DB
      const match = await bcrypt.compare(req.body.password, user.password);
  
      // Check if mathc returns no data
      if (!match) {
        // Render the login page with the message parameter
        return res.render('pages/login', { message: 'Password does not match' });
      }
  
      // Save user information in the session variable
      req.session.user = user;
      req.session.save();
  
      // Redirect user to the home page
      res.redirect('/home');
      
    } catch (error) {
      // Direct user to login screen if no user is found with matching password
      res.redirect('/register');
    }
  });
  
  /************************ 
   Registration Page Routes
  *************************/
  
  // Render registration page for /register route
  app.get('/register', (req, res) => {
    res.render('pages/register');
  });
  
  // Trigger Registration Form to Post
  app.post('/register', async (req, res) => {
    try {
      // Hash the password using bcrypt library
      const hash = await bcrypt.hash(req.body.password, 10);
  
      // Insert username and hashed password into the 'users' table
      await db.none('INSERT INTO users (username, password) VALUES ($1, $2)', [req.body.username, hash]);
  
      // Direct user to login screen after data has been inserted successfully
      res.redirect('/login');
    } catch (error) {
      // If the insert fails, redirect to GET /register route
      res.redirect('/register');
    }
  });
  
  /************************ 
   Discover Page Routes
  *************************/
  
  // Render registration page for /register route
  app.get('/home', (req, res) => {
    res.render('pages/home');
  });


// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');