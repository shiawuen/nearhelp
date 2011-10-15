
/**
 * Module dependencies.
 */

var express = require('express');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'soemtnig-53cretsoemtnig-53cret' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes



/********************************
 ********************************
              Home 
 ********************************
 ********************************/
app.get('/', function(req, res){
  res.render('index', {
    title: 'NearHelp'
  });
});



/********************************
 ********************************
          Authentication 
 ********************************
 ********************************/
app.get('/signin', function(req, res) {
  
  res.render('users/signin', {
    title: 'Sign In'
  })
});
app.get('/register', function(req, res) {
  
  res.render('users/register', {
    title: 'Register'
  })
});
app.get('/signout', function(req, res) {

  res.redirect('/')
});



/********************************
 ********************************
      Requests 
 ********************************
 ********************************/
app.get('/requests', function(req, res) {

  res.render('requests/list', {
    title: 'All Requests'
  });

});
app.get('/r/:id', function(req, res, next) {
  if (req.params.id === 'new') { return next(); }

  res.render('requests/view', {
    title: 'REQUESTS TITLE'
  });

});
app.get('/r/new', function(req, res) {

  

  res.render('requests/new', {
    title: 'New Requests'
  });

});
app.get('/r/:id/comments', function(req, res) {

  res.render('comments/list', {
    title: 'Comments'
  });

});
app.get('/r/:id/comment', function(req, res) {

  res.render('comments/new', {
    title: 'Comment'
  });

});
app.get('/r/:id/i-can-help', function(req, res) {

  res.render('requests/icanhelp', {
    title: 'I Can Help'
  });

});


/********************************
 ********************************
      User Account Section 
 ********************************
 ********************************/
app.get('/me', function(req, res) {
  
  res.render('users/account', {
    title: 'USERNAME'
  });
});

// List of friends user have
app.get('/me/friends', function(req, res) {
  
  res.render('users/friends', {
    title: 'USERNAME&rsquo;s Friends'
  });
});

app.get('/me/requests', function(req, res){
  
  res.render('requests/list', {
    title: 'USERNAME&rsquo;s Requests'
  });
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
