require('dotenv').config();

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var passport = require('./config/passport');
const session = require('express-session');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var bicicletasRouter = require('./routes/bicicletas');
var bicicletasAPIRouter = require('./routes/api/bicicletas');
var usuariosRouter = require('./routes/usuarios');
var tokenRouter = require('./routes/token');

let store;
if (process.env.NODE_ENV === 'development') {
    store = new session.MemoryStore();
} else {
    store = new MongoDBStore({
        uri: process.env.MONGO_URI,
        collection: 'sessions',
    });
    store.on('error', function(error) {
        assert.ifError(error);
        assert.ok(false);
    });
}

var app = express();

app.use(session({
    //
    cookie: { maxAge: 240 * 60 * 60 * 1000 },
    store: store,
    saveUninitialized: true,
    resave: 'true',
    secret: 'red_bicis_*.-*_1239869'
}));

var mongoose = require('mongoose');

//var mongoDB = 'mongodb://localhost/red_bicicletas';
//mongodb+srv://admin:<password>@red-bicicletas.cneqc.mongodb.net/<dbname>?retryWrites=true&w=majority
//si estoy en el ambiente de desarrollo usar
//var mongoDB = 'mongodb://localhost/red_bicicletas';
//sino usar
var mongoDB = 'mongodb+srv://admin:tezQrwKMfKMivTbr@red-bicicletas.cneqc.mongodb.net/<dbname>?retryWrites=true&w=majority';

mongoose.connect(mongoDB, { useNewUrlParser: true});
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error: '));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));


app.get('/login', function(req, res) {
  res.render('session/login');
});

app.post('/login', function(req, res, next) {

    passport.authenticate('local', function(err, usuario, info) {
        if (err) return next(err);
        if (!usuario) return res.render('session/login', { info });
        req.logIn(usuario, function(err) {
          console.log(usuario);
          if (err) return next(err);
          return res.redirect('/');
        });
      })(req, res, next);


});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.get('/forgotPassword', function(req, res) {
  
});

app.post('/forgotPassword', function(req, res) {

});

app.get('/resetPassword/:token', function(req, res, next) {
  token.findOne({ token: req.params.token }, function(err, token) {
    if(!token) return res.status(400).send({ msg: 'No existe un usuario asociado al token, verifique que su token no haya expirado' });
    usuario.findById(token._userId, function(err, usuario) {
      if(!usuario) return res.status(400).send({ msg: 'No existe un usuario asociado al token.' });
      res.render('session/resetPassword', {errors: { }, usuario: usuario});
    });
  });
});

app.post('/resetPassword', function(req, res) {
  if(req.body.password != req.body.confirm_password) {
    res.render('session/resetPassword', {errors: {confirm_password: {message: 'No coincide con el password ingresado'}}, usuario: new Usuario({email: req.body.email})});
    return;
  }
  usuario.findOne({email: req.body.email}, function(err, usuario) {
    usuario.password = req.body.password;
    usuario.save(function(err) {
      if(err) {
        res.render('session/resetPassword', {errors: err.errors, usuario: new Usuario({email: req.body.email})});
      } else {
        res.redirect('/login');
      }
    });
  });
});




app.use('/', indexRouter);

app.use('/usuarios', usuariosRouter);
app.use('/token', tokenRouter);
app.use('/bicicletas', loggedIn, bicicletasRouter);
app.use('/api/bicicletas', bicicletasAPIRouter);

app.use('/googleb76e80d3afd0076e', function(req, res) {
    res.sendFile('public/googleb76e80d3afd0076e.html', { root: '.' })
});

app.get(
    '/auth/google',
    passport.authenticate('google', {
        scope: [
            'https://www.googleapis.com/auth/plus.login',
            'https://www.googleapis.com/auth/plus.profile.emails.read',
            'profile',
            'email',
        ],
    })
  );
  
  app.get(
    '/auth/google/callback',
    passport.authenticate('google', {
        successRedirect: '/',
        failureRedirect: '/error',
    })
  );
  



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

function loggedIn(req, res, next) {
  if(req.user) {
    next();
  } else {
    console.log('Usuario sin loguearse');
    res.redirect('/login');
  }
};

module.exports = app;
