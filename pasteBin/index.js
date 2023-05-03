var express = require('express');
var app = express();
var serv = require('http').Server(app);
var bodyParser = require('body-parser')
var mysql = require('mysql');
var cryptoRandStr = require('crypto-random-string');
var session = require('express-session');
var cookieParser = require('cookie-parser')
const { json } = require('body-parser');

require('dotenv').config();

const conn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
})
conn.connect(function (err) {
    if (err) { console.log("error, problem connecting to database"); }
    else { console.log("connection to database started") }
})

const PORT = process.env.PORT || 3000;
serv.listen(PORT);
console.log('server started');

app.use('/client', express.static(__dirname + '/client'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.set('views', __dirname + '/views');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'XASDASDA', resave: false, saveUninitialized: false, name: 'JSESSION' }));
app.use(cookieParser());


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const passport = require('passport');

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, cb) {
    cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
    cb(null, obj);
});

const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
},
    function (accessToken, refreshToken, profile, done) {
        return done(null, profile);
    }
));

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/404' }),
    function (req, res) {
        // console.log("zxc: "+JSON.stringify(req.user))
        console.log(req.user._json.email + " " + req.user._json.sub)
        req.session.uid = req.user.id
        req.session.email = req.user._json.email
        // Successful authentication, redirect success.
        res.redirect('/profileOauth');
    });

app.get('/success', function (req, res) {
    if (req.session.uid) {
        res.render('profileOauth', { sess: req.session })
    }
    else {
        res.render('loginOauth')
    }
})

app.get('/logoutOauth', function (req, res, next) {
    req.session.destroy(function (err) {
        if (err) {
            console.log(err);
        } else {
            res.redirect('/loginOauth');
        }
    })
});

app.get('/profileOauth', function (req, res) {
    if (!req.session.uid) { res.redirect('loginOauth') }
    else {
        conn.query("SELECT `CryptoString`,`Data` FROM `POSTS` WHERE `UserId` = " + `${req.session.uid}`, function (err, result) {
            res.render('profileOauth', { sess: req.session, result: result })
        })
    }
})
app.get('/postsOauth', function (req, res) {
    if (!req.session.uid) { res.redirect('loginOauth') }
    else {
        conn.query("SELECT `CryptoString`,`Data` FROM `POST` WHERE `UserId` = " + `${req.session.uid}`, function (err, result) {
            res.render('postsOauth', { sess: req.session, result: result })
        })
    }
})


app.get('/uploadOauth', function (req, res) {
    res.render('uploadOauth')
});
app.post('/uploadOauth', function (req, res) {
    req.body.crs = cryptoRandStr({ length: 10, type: 'url-safe' })
    req.body.Id = req.session.uid || 1;

    conn.query("INSERT INTO `POST`(`CryptoString`, `Data`, `UserId`) VALUES (" + "\"" + req.body.crs + "\"" + "," + "\"" + req.body.pasteText + "\"" + "," + req.body.Id + ")", function (err, result) {
        if (err) throw err;
        console.log("1 record inserted");
    })
    res.redirect('pasteOauth/' + req.body.crs)

});


app.get('/pasteOauth/:id', function (req, res) {
    conn.query("SELECT `CryptoString`,`Data` FROM `POST` WHERE `CryptoString` = " + "\"" + req.params.id + "\"", function (err, result, fields) {
        if (err) {
            console.log("err");
        }
        if (result.length == 0) { res.render('404') }
        else {
            res.render('pasteOauth', { result: result })
        }
    })
})


app.get('/loginOauth', function (req, res) {
    res.render('loginOauth')
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////////



app.get('/', function (req, res) {
    res.render('index')
});

// app.get('/upload', function (req, res) {
//     res.render('upload')
// });
// app.post('/upload', function (req, res) {
//     req.body.crs = cryptoRandStr({ length: 10, type: 'url-safe' })
//     req.body.Id = req.session.uid || 1;

//     conn.query("INSERT INTO `POSTS`(`CryptoString`, `Data`, `UserId`) VALUES (" + "\"" + req.body.crs + "\"" + "," + "\"" + req.body.pasteText + "\"" + "," + req.body.Id + ")", function (err, result) {
//         if (err) throw err;
//         console.log("1 record inserted");
//     })
//     res.redirect('paste/'+req.body.crs)

// });

// app.get('/login', function (req, res) {
//     if (req.session.uid) { res.redirect('profile') }
//     else { res.render('login') }
// });
// app.post('/login', function (req, res) {
//     var username = req.body.username;
//     var password = req.body.password;
//     //console.log(req.body);
//     conn.query("SELECT * FROM `USERS` WHERE `Username` = " + `'${req.body.username}' AND ` + "`Password` = " + `'${req.body.password}'`, function (err, result, fields) {
//         if (err) {
//             console.log("error, sign in failed");
//             res.render('login')
//         }
//         if (result === undefined || result.length < 1) { res.render('login') }
//         else if (result.length > 0) {
//             //console.log(result);
//             req.session.username = username;
//             req.session.loggedin = true;
//             req.session.uid = result[0].Id
//             res.render('profile', { sess: req.session })
//         }
//     })
// });

// app.get('/signup', function (req, res) {
//     if (req.session.loggedin) { res.redirect('profile') }
//     else { res.render('signup'); }
// });
// app.post('/signup', function (req, res) {
//     if (req.session.loggedin) { res.redirect('profile') }
//     else {
//         conn.query("SELECT `Username`, `Email` FROM `USERS` WHERE `Username` = " + "\"" + `${req.body.username}` + "\"" + " OR `Email` = " + "\"" + `${req.body.email}` + "\"", function (err, result) {
//             if (err) throw err;
//             if (result.length > 0) {
//                 //console.log(JSON.stringify( result))
//                 res.send("user already registered");
//             }
//             else {
//                 conn.query("INSERT INTO `USERS`(`Username`, `Email`, `Password`) VALUES (" + "\"" + `${req.body.username}` + "\"" + "," + "\"" + `${req.body.email}` + "\"" + "," + "\"" + `${req.body.password}` + "\"" + ");", function (err, result) {
//                     if (err) throw err;
//                     //console.log(req.body.username+"   "+req.body.email+"   "+req.body.password+"   ")
//                     res.render('login');
//                 })
//             }
//         })
//     }
// });


// app.get('/profile', function (req, res) {
//     if (!req.session.loggedin) { res.redirect('login') }
//     else {
//         conn.query("SELECT `CryptoString`,`Data` FROM `POSTS` WHERE `UserId` = " + `${req.session.uid}`, function (err, result) {
//             res.render('profile', { sess: req.session, result: result })
//         })
//     }
// })

// app.get('/logout', function (req, res) {
//     req.session.destroy(function (err) {
//         if (err) {
//             console.log(err);
//         } else {
//             res.redirect('/');
//         }
//     })
// })

// app.get('/profile/posts', function (req, res) {
//     if (!req.session.loggedin) { res.render('login') }
//     else {
//         conn.query("SELECT `CryptoString`,`Data` FROM `POSTS` WHERE `UserId` = " + `${req.session.uid}`, function (err, result) {
//             res.render('posts', { sess: req.session, result: result })
//         })
//     }
// })


// app.get('/paste/:id', function (req, res) {
//     conn.query("SELECT `CryptoString`,`Data` FROM `POSTS` WHERE `CryptoString` = " + "\"" + req.params.id + "\"", function (err, result, fields) {
//         if (err) {
//             console.log("err");
//         }
//         if(result.length == 0){res.render('404')}
//         else {
//             res.render('paste',{result: result})
//         }
//     })
// })

app.get('/about', function (req, res) {
    res.render('about')
});

app.get('/404', function (req, res) {
    res.render('404')
})



// setInterval(() => {
//     console.log(sess.uid)
// }, 3000);



