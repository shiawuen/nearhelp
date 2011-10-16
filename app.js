

/********************************
 ********************************
 ********************************
          DB & Data Model
 ********************************
 ********************************
 ********************************/
var mongoose = require('mongoose')
  , everyauth = require('everyauth')
  , mongooseAuth = require('mongoose-auth')
  , useTimestamps = require("mongoose-types").useTimestamps
  , Query = mongoose.Query
  , Schema = mongoose.Schema
  , Promise = mongoose.Promise
  , ObjectId = mongoose.SchemaTypes.ObjectId;

/********************************
          User Model
 ********************************/
var UserSchema, User;

UserSchema = new Schema({
  friends: [UserSchema]
})

// Inject timestamp (createAt, updatedAt)
UserSchema.plugin(useTimestamps);
// Plug-in auth
UserSchema.plugin(mongooseAuth, {
  everymodule: {
    everyauth: {
      User: function() { return User; }
    }
  }
, password: {
    loginWith: 'email'
  , extraParams: {
      name: String
    }
  , everyauth: {
        getLoginPath: '/signin'
      , postLoginPath: '/signin'
      , loginView: 'users/signin.jade'
      , getRegisterPath: '/register'
      , postRegisterPath: '/register'
      , registerView: 'users/register.jade'
      , loginSuccessRedirect: '/'
      , registerSuccessRedirect: '/'
    }
  }
});

UserSchema.methods.allFriends = function() {
  
};
UserSchema.statics.list = function(offset, max) {
  
};
UserSchema.statics.nearby = function(latlng, offset, max) {
  
};

mongoose.model('User', UserSchema);

/********************************
          Task Model
 ********************************/
var TaskSchema, Task;
var monthArr = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'
                ,'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

TaskSchema = new Schema({
    title: String
  , description: String
  , due: Date
  , location: String
  , loc: {
        lat: Number
      , lng: Number
    }
  , willpay: Boolean
  , bounty: Number
  , user: { type: ObjectId, ref: 'User' }
  , comments: [{ type: ObjectId, ref: 'Comment' }]
});

TaskSchema.statics.list = function(type, opts) {
  var promise = new Promise
    , q, sort;

  switch (type) {
    case 'nearby':
      q = { willpay: true, bounty: { $gt: 0 } };
      sort = 'bounty';
      break;
    case 'bounty':
      q = { willpay: true, bounty: { $gt: 0 } };
      sort = 'bounty';
      break;
    case 'mine':
      q = { user: opts.user._id };
      sort = 'due';
      break;
    case 'friends':
      q = { user: { $in: opts.users } };
      sort = 'due';
      break;
    default:
      q = {};
      sort = 'due';
  }

  this.find(q)
      .populate('user')
      .populate('comments')
      .sort(sort, 1)
      .run(promise.resolve.bind(promise));

  return promise;
}

TaskSchema
  .virtual('descriptionInPara')
  .get(function() {
    // DANGER: COULD BE SOURCE OF SECURITY ATTACK
    // TODO: DO PROPER ESCAPE FOR HTML
    return asPara(this.description);
  });
TaskSchema
  .virtual('dateMonthDay')
  .get(function() {
    var due = this.due;
    return due.getDate() +' '+ monthArr[due.getMonth()];
  });

TaskSchema.plugin(useTimestamps);
mongoose.model('Task', TaskSchema);

/********************************
        Notifications Model
 ********************************/
var NotificationSchema, Notification;

NotificationSchema = new Schema({
    from: { type: ObjectId, ref: 'User' }
  , ref: ObjectId
});

NotificationSchema.plugin(useTimestamps);
mongoose.model('Notification', NotificationSchema);

/********************************
          Comment Model
 ********************************/
var CommentSchema, Comment;

CommentSchema = new Schema({
    content: String
  , user: { type: ObjectId, ref: 'User' }
  , task: { type: ObjectId, ref: 'Task' }
});

CommentSchema
  .virtual('contentInPara')
  .get(function() {
    return asPara(this.content);
  });
CommentSchema
  .virtual('prettyCreateAt')
  .get(function() {
    return prettyDate(this.createdAt);
  });

CommentSchema.plugin(useTimestamps);
mongoose.model('Comment', CommentSchema);


/********************************
        Connect to DB
 ********************************/
mongoose.connect('mongodb://localhost/nearhelp');


/********************************
        Define Model
 ********************************/
User = mongoose.model('User');
Comment = mongoose.model('Comment');
Task = mongoose.model('Task');
Notification = mongoose.model('Notification');



/********************************
 ********************************
 ********************************
            Web Server 
 ********************************
 ********************************
 ********************************/
var express = require('express');
var prettyDate = require('./lib/prettydate');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'soemtnig-53cretsoemtnig-53cret' }));
  app.use(mongooseAuth.middleware());
  app.use(express.static(__dirname + '/public'));
  app.use(express.logger({ format: '\x1b[1m:method\x1b[0m \x1b[33m:url\x1b[0m :response-time ms' }));
  app.use(function(req, res, next) {
    require('./lib/express-mongoose');
    next();
  });
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});





//////////// Routes /////////////

/********************************
 ********************************
              Home 
 ********************************
 ********************************/
app.get('/', function(req, res) {
  var mineTasks, friendTasks;

  if (req.loggedIn) {
    mineTasks = Task.list('mine', {user: req.user});
    //friendTasks = Task.list('friend');
  }

  res.render('index.jade', {
      title: 'NearHelp'
    , bountyTasks: Task.list('bounty')
    , nearbyTasks: Task.list('nearby')
    , mineTasks: mineTasks
    , friendTasks: friendTasks
  });
});


app.get('/ls/nearby', function(req, res) {
  list('nearby', req, res);
});
app.get('/ls/friends', function(req, res) {
  list('friends', req, res);
});
app.get('/ls/bounty', function(req, res) {
  list('bounty', req, res);
});
app.get('/ls/mine', function(req, res) {
  list('mine', req, res);
});

function list(type, req, res){

  res.render('tasks/list', {
    title: 'Tasks'
  });
}


/********************************
            Notifications 
 ********************************/
app.get('notifications', function(req, res) {
  
  res.render('notifications', {
    title: 'Notifications'
  });

});


/********************************
            Tasks 
 ********************************/
/*
  TaskSchema = new Schema({
      title: String
    , description: String
    , due: Date
    , location: String
    , loc: {
          lat: Number
        , lng: Number
      }
    , bounty: Number
    , willpay: Boolean
    , comments: [ObjectId]
  });
*/
app.get('/tasks', function(req, res) {
  res.render('tasks/list', {
    title: 'All Tasks'
  });

});
app.get('/t/:id', function(req, res, next) {
  if (req.params.id === 'new') { return next(); }

  Task.findById(req.params.id, function(err, task) {

    if (err) throw err

    if (task)
      res.render('tasks/view', {
          title: task.title
        , task: task
      });
    else
      res.render('errors/404', {
          title: 'Record not foudn'
      });
  });
});
app.get('/t/new', function(req, res) {

  res.render('tasks/new', {
    title: 'New Tasks'
  });

});
app.post('/t/new', function(req, res) {

  var task = new Task();

  task.title = req.body.title;
  task.description = req.body.description;
  task.due = req.body.date;
  task.willpay = !!req.body.willpay;
  task.location = req.body.location;
  task.loc.lat = req.body.lat;
  task.loc.lng = req.body.lng;
  task.user = req.user._id
  
  if (task.willpay) {
    task.bounty = req.body.bounty;
  }

  console.log('Saving task');
  console.log(task)

  task.save(function(err) {
    if (err) {
      res.render('tasks/new', {
        title: 'New Tasks'
      });
    } else {
      res.redirect('/t/' +task._id);
    }
  });
});

app.get('/t/:id/offer', function(req, res) {

  res.render('tasks/icanhelp', {
    title: 'I Can Help'
  });

});
app.get('/t/:id/i-can-help', function(req, res) {
  
});
app.post('/t/:id/comment', function(req, res) {

  console.log(req.body);

  res.end('doh')
});


/********************************
      User Account Section 
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

app.get('/me/tasks', function(req, res){
  
  res.render('tasks/list', {
    title: 'USERNAME&rsquo;s Tasks'
  });
});



/********************************
 ********************************
          Authentication 
 ********************************
 ********************************/
// Handles by mongoose-auth Yay!




mongooseAuth.helpExpress(app);


app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);


/*
  Helpers
*/
function asPara(content) {
  var arr = content.split('\r\n\r\n');

  arr.forEach(function(c, i) {
    arr[i] = c.replace('\r\n', '<br />');
  });

  return '<p>' + arr.join('</p><p>') + '</p>';
}