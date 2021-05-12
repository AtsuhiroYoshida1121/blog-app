const express = require('express');
const mysql = require('mysql');
const app = express();
const session = require('express-session');
const bcrypt = require('bcrypt');


app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));
app.use(
    session({
        secret: 'my_secret_key',
        resave: false,
        saveUninitialized: false
    })
)

app.use((req,res,next) => {
    const userId = req.session.userId;

    if (userId === undefined) {
        res.locals.username = 'ゲスト';
        res.locals.isLoggedIn = false;
    } else {
        const username = req.session.username;
        res.locals.username = username
        res.locals.isLoggedIn = true;
    }

    next();
});

const connection = mysql.createConnection({
    host: 'us-cdbr-east-03.cleardb.com',
    user: 'b075743dd17e7e',
    password: '586ffa50',
    database: 'heroku_c94fa9c949cbbff'
});


app.get('/', (req, res) => {
    res.render('top.ejs');
});

app.get('/list', (req, res) => {

    connection.query(
    'SELECT * FROM articles',
    (error, results) => {
        res.render('list.ejs', { articles: results });
    }
    );
});


app.get('/article/:id', (req, res) => {
    const id = req.params.id;
    connection.query(
    'SELECT * FROM articles WHERE id = ?',
    [id],
    (error, results) => {
      // EJSファイルに渡すデータとプロパティ名を確認してください
        res.render('article.ejs', { article: results[0] });
    }
    );
});

app.get('/login',(req,res) => {

    res.render('login.ejs');
});

app.post('/login', (req,res) => {
    const email = req.body.email;

    connection.query(
        'select *  from users where email = ?',
        [email],
        (error,results) => {
            if (results.length > 0) {
                const plain = req.body.password
                const hash = results[0].password

                bcrypt.compare(plain,hash,(error,isEqual) => {
                    if (isEqual) {
                        req.session.userId = results[0].id;
                        req.session.username = results[0].username;
                        res.redirect('/list');
                    } else {
                        res.redirect('/login');
                    }
                });
            } else {
                res.redirect('/login');
            }
        }
    );
});

app.get('/logout',(req,res) => {
    req.session.destroy((error) => {
        res.redirect('/list');
    });
});

app.get('/signup', (req,res) => {
    res.render('signup.ejs',{errors: []});
});

app.post('/signup',
    (req,res,next) => {
        console.log('入力値のチェック');
        const username = req.body.username;
        const email = req.body.email;
        const password = req.body.password;
        const errors = [];
        if (username === '') {
            errors.push('ユーザー名が空です');
        }
        if (email === '') {
            errors.push('メールアドレスが空です');
        }
        if (password === '') {
            errors.push('パスワードが空です');
        }
        if (errors.length > 0 ) {
            res.render('signup.ejs', {errors:errors});
        } else {
            next();
        }

    },

    (req,res,next) => {
        const email = req.body.email;
        const errors = [];
        connection.query(
            'select * from users where email = ?',
            [email],
            (error, results) => {
                if (results.length > 0) {
                    errors.push('ユーザー登録に失敗しました');
                    res.render('signup.ejs', {errors:errors});
                } else {
                    next();
                }
            }
        );
    },

    (req,res) => {
        const username = req.body.username;
        const email = req.body.email;
        const password = req.body.password;
        bcrypt.hash(password,10,(error,hash) => {
            connection.query(
                'insert into users (username, email, password) values (?, ?, ?)',
                [username, email, hash],
                (error,results) => {
                    req.session.userId = results.insertId;
                    req.session.username = username;
                    res.redirect('/list');
                }
            );
        });
    }
);

app.get('/post',(req,res) => {
    res.render('post.ejs');
});

app.post('/create', (req,res) => {
    connection.query(
        'INSERT INTO articles (title, summary, content, category) values (?, ?, ?, ?)',
        [req.body.articleTitle, req.body.articleSummary, req.body.articleContent, req.body.articleCategory],
        (error, results) => {
            res.redirect('/list');
        }
    );
});

console.log("server start!")
app.listen(process.env.PORT || 3000);
