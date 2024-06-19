const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const app = express();
const PORT = 3000;

// 데이터베이스 설정
const db = require('./lib/db');

// ejs 설정
app.set('views', path.join(__dirname, 'views'));
app.set("view engine", "ejs");

// static 파일 설정 (Bootstrap, jQuery, img)
app.use('/js', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/js'))); // bootstrap JS
app.use('/css', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/css'))); // bootstrap CSS
app.use('/js', express.static(path.join(__dirname, '/node_modules/jquery/dist'))); // jquery JS
app.use(express.static('upload'));

// 미들웨어 설정
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// 세션 설정
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // 개발 환경에서는 secure를 false로 설정합니다.
}));

// 메인 화면
app.get('/', (req, res) => {
    res.locals.user = req.session.user || {}; // 세션에 사용자 정보가 없을 경우를 대비하여 user 변수 설정
    res.render('main'); // main.ejs 파일을 렌더링
});


// 회원가입 페이지에 대한 라우팅
app.get('/signup', (req, res) => {
    res.render('login/signup'); // login 폴더 내의 signup.ejs 파일을 렌더링
});

// 회원가입 프로세스
app.post('/signup', (req, res) => {
    const { username, email, password, nickname, phone } = req.body;
    // 데이터베이스에서 이메일 중복 확인
    db.query('SELECT * FROM usertable WHERE email = ?', [email], (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            // 이미 있는 이메일 팝업
            res.send(`<script type="text/javascript">alert("이미 사용 중인 이메일입니다."); 
                      document.location.href="/signup";</script>`);
        } else {
            // 비밀번호 해시 처리
            bcrypt.hash(password, 10, function(err, hashedPassword) {
                if (err) throw err;
                // 데이터베이스에 사용자 정보 저장
                db.query('INSERT INTO usertable (user_name, email, password, nickname, phone) VALUES (?, ?, ?, ?, ?)', 
                    [username, email, hashedPassword, nickname, phone], (err, result) => {
                    if (err) throw err;
                    console.log('User registered successfully');
                    // 회원가입 완료 후 세션에 사용자 정보 저장
                    req.session.user = { username, email, nickname };
                    req.session.save(() => {
                        // 회원가입 완료 팝업
                        res.send(`<script type="text/javascript">alert("회원가입이 완료되었습니다."); 
                                  document.location.href="/";</script>`);
                    });
                });
            });
        }
    });
});

// 로그인 페이지
app.get('/login', (req, res) => {
    res.render('login/login');
});

// 로그인 프로세스
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    // 데이터베이스에서 사용자 정보 확인
    db.query('SELECT * FROM usertable WHERE email = ?', [email], (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            const user = result[0];
            const hashedPassword = user.password; // 데이터베이스에서 가져온 해시된 비밀번호
            // bcrypt를 사용하여 비밀번호 비교
            bcrypt.compare(password, hashedPassword, function(err, isValid) {
                if (err) throw err;
                if (isValid) {
                    console.log('Login successful');
                    // 로그인 성공 후 세션에 사용자 정보 저장
                    req.session.user = { username: user.user_name, email: user.email, nickname: user.nickname };
                    req.session.save(() => {
                        res.redirect('/'); // 로그인 성공 후 메인 페이지로 리다이렉트
                    });
                } else {
                    console.log('Invalid email or password');
                    res.send(`<script type="text/javascript">alert("로그인 정보가 일치하지 않습니다."); 
                              document.location.href="/login";</script>`);
                }
            });
        } else {
            console.log('Invalid email or password');
            res.send(`<script type="text/javascript">alert("로그인 정보가 일치하지 않습니다."); 
                      document.location.href="/login";</script>`);
        }
    });
});



// 아이디 찾기 페이지
app.get('/findid', (req, res) => {
    res.render('login/findid');
});

// 아이디 찾기 프로세스
app.post('/findid', (req, res) => {
    const { username, phone } = req.body;

    if (username && phone) {
        db.query('SELECT email FROM usertable WHERE user_name = ? AND phone = ?', [username, phone], function (error, results, fields) {
            if (error) throw error;
            if (results.length > 0) {
                res.send(`<script type="text/javascript">alert("아이디는 ${results[0].email} 입니다."); 
                document.location.href="/login";</script>`);
            } else {
                res.send(`<script type="text/javascript">alert("입력된 정보와 일치하는 아이디가 없습니다."); 
                document.location.href="/findid";</script>`);
            }
        });
    } else {
        res.send(`<script type="text/javascript">alert("이름과 전화번호를 입력하세요."); 
        document.location.href="/findid";</script>`);
    }
});

// 비밀번호 찾기 페이지
app.get('/findpw', (req, res) => {
    res.render('login/findpw');
});

// 비밀번호 찾기 프로세스
app.post('/findpw', (req, res) => {
    const { username, email, phone } = req.body;

    if (username && email && phone) {
        db.query('SELECT * FROM usertable WHERE user_name = ? AND email = ? AND phone = ?', [username, email, phone], function (error, results, fields) {
            if (error) throw error;
            if (results.length > 0) {
                // 비밀번호 재설정 과정을 위해 이메일을 세션에 저장
                req.session.reset_email = email;
                req.session.save(function() {
                    res.redirect('/resetpw');
                });
            } else {
                res.send(`<script type="text/javascript">alert("입력된 정보와 일치하는 계정이 없습니다."); 
                document.location.href="/findpw";</script>`);
            }
        });
    } else {
        res.send(`<script type="text/javascript">alert("이름, 이메일, 전화번호를 입력하세요."); 
        document.location.href="/findpw";</script>`);
    }
});

// 비밀번호 재설정 페이지
app.get('/resetpw', (req, res) => {
    res.render('login/resetpw');
});

// 비밀번호 재설정 프로세스
app.post('/resetpw', (req, res) => {
    const { new_pwd, new_pwd2 } = req.body;
    const email = req.session.reset_email;

    if (new_pwd && new_pwd2) {
        if (new_pwd === new_pwd2) {
            bcrypt.hash(new_pwd, 10, function(err, hash) {
                if (err) throw err;
                db.query('UPDATE usertable SET password = ? WHERE email = ?', [hash, email], function (error, results, fields) {
                    if (error) throw error;
                    delete req.session.reset_email;
                    res.send(`<script type="text/javascript">alert("비밀번호가 재설정되었습니다!"); 
                    document.location.href="/login";</script>`);
                });
            });
        } else {
            res.send(`<script type="text/javascript">alert("입력된 비밀번호가 서로 다릅니다."); 
            document.location.href="/resetpw";</script>`);
        }
    } else {
        res.send(`<script type="text/javascript">alert("비밀번호를 입력하세요."); 
        document.location.href="/resetpw";</script>`);
    }
});

// 로그아웃 라우트
app.get('/logout', (req, res) => {
    req.session.destroy(); // 세션 삭제
    res.redirect('/'); // 메인 페이지로 리다이렉트
});


// router 설정
const indexRouter = require('./router');
const boardRouter = require('./router/board');

app.use('/', indexRouter);
app.use('/', boardRouter);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

app.use(express.static("views"));