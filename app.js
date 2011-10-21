

/********************************
 ********************************
          DB & Data Model
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
    followers:  [{ type: ObjectId, ref: 'User' }]
  , following: [{ type: ObjectId, ref: 'User' }]
});


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

UserSchema.statics.withId = function(id) {
  var promise = new Promise()

  this
    .findById(id)
    .populate('following', ['_id', 'name'])
    .populate('followers', ['_id', 'name'])
    .run(promise.resolve.bind(promise));

  return promise;
};
UserSchema.statics.isFollowing = function(uid, followerId) {
  var promise = new Promise()

  this
    .findOne({_id: uid, followers: followerId}, ['_id'])
    .run(promise.resolve.bind(promise));

  return promise;
};

mongoose.model('User', UserSchema);

/********************************
          Task Model
 ********************************/
var TaskSchema, Task;
var monthArr = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'
                ,'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

TaskSchema = new Schema({
    title:       String
  , description: String
  , due:         Date
  , location:    String
  , loc:         { lat: Number , lng: Number }
  , willpay:     { type: Boolean, default: false }
  , bounty:      { type: Number, default: 0 }
  , completed:   { type: Boolean, default: false }
  , user:        { type: ObjectId, ref: 'User' }
  , helpers:     [{ type: ObjectId, ref: 'Helper' }]
  , comments:    [{ type: ObjectId, ref: 'Comment' }]
});

TaskSchema.statics.list = function(type, opts) {
  var promise = new Promise
    , q, sort;

  switch (type) {
    case 'nearby':
      q = {  };
      sort = 'due';
      break;
    case 'bounty':
      q = { willpay: true, bounty: { $gt: 0 } };
      sort = 'bounty';
      break;
    case 'mine':
      q = { user: opts.user };
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
      .populate('user', ['_id', 'name'])
      .populate('comments')
      .sort(sort, 1)
      .run(promise.resolve.bind(promise));

  return promise;
}
TaskSchema.statics.withId = function(id) {
  var promise = new Promise();

  this
    .findById(id)
    .populate('user', ['_id', 'name'])
    .run(promise.resolve.bind(promise));

  return promise;
}
TaskSchema.statics.withUserId = function(uid) {
    var promise = new Promise();

  this
    .find({user: uid}, ['_id', 'title'])
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
        Helper Model
 ********************************/
var HelperSchema, Helper;

HelperSchema = new Schema({
    helper:      { type: ObjectId, ref: 'User' }
  , creator:     { type: ObjectId, ref: 'User' }
  , task:        { type: ObjectId, ref: 'Task' }
  , notified:    { type: Boolean, default: false }
  , accepted:    { type: Boolean, default: false }
  , completed:   { type: Boolean, default: false }
  , completedOn: { type: Date }
});

HelperSchema.statics.withTaskId = function(tid) {
  var promise = new Promise();

  this
    .find({task: tid})
    .populate('helper')
    .run(promise.resolve.bind(promise));

  return promise;
}
HelperSchema.statics.isHelper = function(uid) {
  var promise = new Promise();

  this
    .findOne({user: uid})
    .run(promise.resolve.bind(promise));

  return promise;
}
HelperSchema.statics.list = function(opts) {
  var promise = new Promise();

  this
    .find({helper: opts.uid, completed: opts.completed})
    .populate('task', ['title', '_id'])
    .sort('completedOn', 1)
    .run(promise.resolve.bind(promise));

  return promise;
}

HelperSchema
  .virtual('prettyCompletedOn')
  .get(function() {
    return prettyDate(this.completedOn.toLocaleString());
  });

HelperSchema.plugin(useTimestamps);
mongoose.model('Helper', HelperSchema);

/********************************
          Comment Model
 ********************************/
var CommentSchema, Comment;

CommentSchema = new Schema({
    content: String
  , user: { type: ObjectId, ref: 'User' }
  , task: { type: ObjectId, ref: 'Task' }
});

CommentSchema.plugin(useTimestamps);


CommentSchema.statics.withTaskId = function(tid) {
  var promise = new Promise();

  this
    .find({task: tid})
    .populate('user')
    .sort('createdAt', -1)
    .sort('updatedAt', -1)
    .run(promise.resolve.bind(promise));

  return promise;
}

CommentSchema
  .virtual('contentInPara')
  .get(function() {
    return asPara(this.content);
  });
CommentSchema
  .virtual('prettyAt')
  .get(function() {
    return prettyDate((this.createdAt || this.updatedAt).toLocaleString());
  });


mongoose.model('Comment', CommentSchema);


/********************************
        Connect to DB
 ********************************/
mongoose.connect('mongodb://localhost/nearhelp');


/********************************
        Define Model
 ********************************/
User = mongoose.model('User');
Task = mongoose.model('Task');
Helper = mongoose.model('Helper');
Comment = mongoose.model('Comment');
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
              Home 
 ********************************/
app.get('/', function(req, res) {
  var mineTasks, friendTasks;

  list('nearby', res);
  
  return;

  if (req.loggedIn) {
    mineTasks = Task.list('mine', {user: req.user._id});
    friendTasks = Task.list('friends', {users:req.user.following});
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
  list('nearby', res);
});
app.get('/ls/friends', function(req, res) {
  list('friends', res, {users: req.user.following});
});
app.get('/ls/bounty', function(req, res) {
  list('bounty', res);
});
app.get('/ls/mine', function(req, res) {
  list('mine', res, {user: req.user._id});
});

function list(type, res, opts){
  res.render('tasks/tasks', {
      tTitle: type
    , tasks: Task.list(type, opts)
    , layout: 'layout2'
  });
}


/********************************
          Notifications 
              CUT 
 ********************************/
app.get('notifications', function(req, res) {
  
  res.render('notifications', {
    title: 'Notifications'
  });

});


/********************************
            Tasks 
 ********************************/
app.get('/t/:id', function(req, res, next) {
  var tid = req.params.id
    , isHelper = false;

  if (tid === 'new') { return next(); }

  if (req.loggedIn) {
    isHelper = Helper.isHelper(req.user._id); 
  }

  res.render('tasks/view', {
      task: Task.withId(tid)
    , comments: Comment.withTaskId(tid)
    , helpers: Helper.withTaskId(tid)
    , isHelper: isHelper
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



});
app.get('/t/:id/i-can-help', function(req, res) {
  
  var tid = req.params.id;
  
  if (!req.user) { 
    res.redirect('/t/' +tid);
    return;
  };

  Task.findById(tid, function(err, task){
    if (!task || task.user == req.user) {
      res.redirect('/t/' +tid);
      return;
    }

    var helper = new Helper();
    
    helper.task = task._id;
    helper.helper = req.user._id;

    helper.save(function(err) {
      if (err) throw err;

      res.redirect('/t/' +tid);
    });

  });
});
// CommentSchema = new Schema({
//     content: String
//   , user: { type: ObjectId, ref: 'User' }
//   , task: { type: ObjectId, ref: 'Task' }
// });
app.post('/t/:id/comment', function(req, res) {

  var tid = req.params.id;

  if (!req.user) { 
    res.redirect('/t/'+tid);
    return;
  };
  
  Task.findById(tid, function(err, task) {

    if (!task)
      return res.redirect('/t/'+tid);

    var comment = new Comment();

    comment.content = req.body.comment;
    comment.user    = req.user._id;
    comment.task    = task._id;
    comment.save(function(err) {
      if (err) throw err;

      task.comments.push( comment._id );
      task.save(function(err) {
        if (err) throw err;

        res.redirect('/t/'+tid);
      });
    });
  });
});


/********************************
      User Account Section 
 ********************************/
app.get('/u/:id', showAccount);
app.get('/me', showAccount);

function showAccount(req, res) {
  var uid = getUidOrRedirect(req, res, '/me');
  var isFollowing;

  if (req.loggedIn && uid != req.user._id)
    isFollowing = User.isFollowing(uid, req.user._id)

  res.render('users/account', {
      profile: User.withId(uid)
    , tasks: Task.list('mine', {user:uid})
    , helps: Helper.list({uid: uid, completed: true})
    , isFollowing: isFollowing
  });
}

app.get('/u/:id/follow', function(req, res) {
  var uid = req.params.id;

  User.findById(uid, function(err, user) {
    if (!(uid in user.followers)) {

      user.followers.push(req.user._id)
      user.save(function(err){
        if (err) throw err;

        if (!(uid in req.user.following)) {
          req.user.following.push(uid);
          req.user.save(function(err){
            res.redirect('/u/'+uid);
          });
          
        } else res.redirect('/u/'+uid);
      });
    } else res.redirect('/u/'+uid);
  })

});

app.get('/u/:id/unfollow', function(req, res) {
  var uid = req.params.id;

  User.findById(uid, function(err, user) {
    if (err) throw err;
    
    var index = user.followers.indexOf(req.user._id);

    user.followers = user.followers.splice(index, 1);
    user.save(function(err) {
      if (err) throw err;

      var index = req.user.following.indexOf(uid);

      req.user.following = req.user.following.splice(index, 1);
      req.user.save(function(err) {
        res.redirect('/u/'+uid);
      });
    });
  });
});


// List of friends user have
app.get('/me/followers', getFollowers);
app.get('/u/:id/followers', getFollowers);
function getFollowers(req, res) {
  var uid = getUidOrRedirect(req, res, '/me/followers');

  res.render('users/friends', {
      profile: User.withId(uid)
    , prop: 'followers'
  });
}
app.get('/me/following', getFollowing);
app.get('/u/:id/following', getFollowing);
function getFollowing(req, res) {
  var uid = getUidOrRedirect(req, res, '/me/following');

  res.render('users/friends', {
      profile: User.withId(uid)
    , prop: 'following'
  });
}

app.get('/me/tasks', getTasks);
app.get('/u/:id/tasks', getTasks);
function getTasks(req, res){
  var uid = getUidOrRedirect(req, res, '/me/tasks');

  res.render('tasks/list', {
      profile: User.withId(uid)
    , tasks: Task.withUserId(uid)
  });
}

function getUidOrRedirect(req, res, selfPath) {
  var uid = req.params.id;

  if (!uid && req.loggedIn)
    uid = req.user._id;
  else if (req.route.path == selfPath)
    return res.redirect('/signin');

  return uid;
}


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