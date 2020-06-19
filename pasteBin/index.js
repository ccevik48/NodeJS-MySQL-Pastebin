var express = require('express');
var app = express();
var serv = require('http').Server(app);
var bodyParser = require('body-parser')
var mysql = require('mysql');
var crypto = require('crypto')
var cryptoRandStr = require('crypto-random-string');
var session = require('express-session');
var cookieParser = require('cookie-parser')
const { json } = require('body-parser');

const conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "CTRLV"
})
conn.connect(function (err) {
    if (err) { console.log("err"); }
    else { console.log("connection to database started") }
})

const PORT = process.env.PORT || 2000;
serv.listen(PORT);
console.log('server started');

app.use('/client', express.static(__dirname + '/client'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.set('views', __dirname + '/views');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'XASDASDA', resave: true, saveUninitialized: true,name: 'JSESSION' }));
app.use(cookieParser());

app.get('/', function (req, res) {
    res.render('index')
});

app.get('/upload', function (req, res) {
    res.render('upload')
});
app.post('/upload', function (req, res) {
    req.body.crs = cryptoRandStr({ length: 10, type: 'url-safe' })
    req.body.Id = req.session.uid || 0;

    conn.query("INSERT INTO `POSTS`(`CryptoString`, `Data`, `UserId`) VALUES (" + "\"" + req.body.crs + "\"" + "," + "\"" + req.body.pasteText + "\"" + "," + req.body.Id + ")", function (err, result) {
        if (err) throw err;
        console.log("1 record inserted");
    })
    res.redirect('paste/'+req.body.crs)
    
});

app.get('/login', function (req, res) {
    if (req.session.uid) { res.redirect('profile') }
    else { res.render('login') }
});
app.post('/login', function (req, res) {
    var username = req.body.username;
	var password = req.body.password;
    //console.log(req.body);
    conn.query("SELECT * FROM `USERS` WHERE `Username` = " + `'${req.body.username}' AND ` + "`Password` = " + `'${req.body.password}'`, function (err, result, fields) {
        if (err) {
            console.log("error, sign in failed");
            res.render('login')
        }
        if (result === undefined || result.length < 1) { res.render('login') }
        else if (result.length > 0) {
            //console.log(result);
            req.session.username = username;
            req.session.loggedin = true;
            req.session.uid = result[0].Id
            res.render('profile', { sess: req.session })
        }
    })
});

app.get('/signup', function (req, res) {
    res.render('signup');
});
app.post('/signup', function (req, res) {
    if (req.session.loggedin) { res.redirect('profile') }
    else {
        conn.query("SELECT `Username`, `Email` FROM `USERS` WHERE `Username` = " + "\"" + `${req.body.username}` + "\"" + " OR `Email` = " + "\"" + `${req.body.email}` + "\"", function (err, result) {
            if (err) throw err;
            if (result.length > 0) {
                //console.log(JSON.stringify( result))
                res.send("user already registered");
            }
            else {
                conn.query("INSERT INTO `USERS`(`Username`, `Email`, `Password`) VALUES (" + "\"" + `${req.body.username}` + "\"" + "," + "\"" + `${req.body.email}` + "\""  + "," + "\"" + `${req.body.password}` + "\"" + ");", function(err, result){
                    if (err) throw err;
                    //console.log(req.body.username+"   "+req.body.email+"   "+req.body.password+"   ")
                    res.render('login');
                })
            }
        })
    }
});


app.get('/profile', function (req, res) {
    if (!req.session.loggedin) { res.redirect('login') }
    else {
        conn.query("SELECT `CryptoString`,`Data` FROM `POSTS` WHERE `UserId` = " + `${req.session.uid}`, function (err, result) {
            res.render('profile', { sess: req.session, result: result })
        })
    }
})
app.get('/logout', function (req, res) {
    req.session.destroy(function (err) {
        if (err) {
            console.log(err);
        } else {
            res.redirect('/');
        }
    })
})

app.get('/profile/posts', function (req, res) {
    if (!req.session.loggedin) { res.render('login') }
    else {
        conn.query("SELECT `CryptoString`,`Data` FROM `POSTS` WHERE `UserId` = " + `${req.session.uid}`, function (err, result) {
            res.render('posts', { sess: req.session, result: result })
        })
    }
})


app.get('/paste/:id', function (req, res) {
    conn.query("SELECT `CryptoString`,`Data` FROM `POSTS` WHERE `CryptoString` = " + "\"" + req.params.id + "\"", function (err, result, fields) {
        if (err) {
            console.log("err");
        }
        if(result.length == 0){res.render('404')}
        else {
            res.render('paste',{result: result})
        }
    })
})

app.get('/about', function (req, res) {
    res.render('about')
});

app.get('/404', function(req,res){
    res.render('404')
})


// setInterval(() => {
//     console.log(sess.uid)
// }, 3000);



