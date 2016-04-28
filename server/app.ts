import express = require('express');
import bodyParser = require('body-parser');
import cookieParser = require('cookie-parser');
import passport = require('passport');
import localStrategy = require('passport-local');

passport.use(new localStrategy.Strategy({

}, function(user, pass, done) {
  // need to verify the user here
  return done(null, user);
}));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
})

var port = 8080;
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(require('express-session')({ secret: 'lk;joi;jeaf', resave: false, saveUninitialized: false }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

app.use('/node_modules', express.static('./node_modules'));
app.use('/', express.static('./client'));

app.get('/', function(req, res) {
  res.redirect('/index.html');
});

app.post('/login',
  passport.authenticate('local', { successRedirect: '/index.html', failureRedirect: '/login.html' }));

app.get('/logout',
  function(req, res){
    req.logout();
    res.redirect('/');
  });

app.get('/authenticated', function(req, res) {
  res.send({authenticated:req.isAuthenticated(), user:req.user});
});

app.post('/add', function(req, res) {
  var title = req.body.title;
  var description = req.body.description;
  res.send('1');
});

app.get('/todos', function(req, res) {
  var result = [];
  result.push({title: 'test 1', description: 'something', id: 1});
  res.send(result);
})

app.listen(port, function() {
  console.log('Server listening on port %d in %s mode', port, app.settings.env);
})
