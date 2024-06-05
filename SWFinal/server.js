const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const app = express();
const PORT = 3000;

// 데이터베이스 설정
const db = require('./db');

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
    res.sendFile(__dirname + '/main.html'); // main.html 파일을 반환
});

// 회원가입 페이지에 대한 라우팅
app.get('/signup.html', (req, res) => {
    res.sendFile(__dirname + '/signup.html'); // signup.html 파일을 반환
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
                      document.location.href="/signup.html";</script>`);
        } else {
            // 데이터베이스에 사용자 정보 저장
            db.query('INSERT INTO usertable (user_name, email, password, nickname, phone) VALUES (?, ?, ?, ?, ?)', 
                [username, email, password, nickname, phone], (err, result) => {
                if (err) throw err;
                console.log('User registered successfully');
                // 회원가입 완료 팝업
                res.send(`<script type="text/javascript">alert("회원가입이 완료되었습니다."); 
                          document.location.href="/login.html";</script>`);
            });
        }
    });
});

// 로그인 페이지
app.get('/login.html', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

// 로그인 프로세스
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    // 데이터베이스에서 사용자 정보 확인
    db.query('SELECT * FROM usertable WHERE email = ?', [email], (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            const hashedPassword = result[0].password; // 데이터베이스에서 가져온 해시된 비밀번호
            // bcrypt를 사용하여 비밀번호 비교
            bcrypt.compare(password, hashedPassword, function(err, isValid) {
                if (err) throw err;
                if (isValid) {
                    console.log('Login successful');
                    res.redirect('/'); // Assuming you have a route for /
                } else {
                    console.log('Invalid email or password');
                    res.send(`<script type="text/javascript">alert("로그인 정보가 일치하지 않습니다."); 
                              document.location.href="/login.html";</script>`);
                }
            });
        } else {
            console.log('Invalid email or password');
            res.send(`<script type="text/javascript">alert("로그인 정보가 일치하지 않습니다."); 
                      document.location.href="/login.html";</script>`);
        }
    });
});


// 아이디 찾기 페이지
app.get('/findid.html', (req, res) => {
    res.sendFile(__dirname + '/findid.html');
});

// 아이디 찾기 프로세스
app.post('/findid', (req, res) => {
    const { username, phone } = req.body;

    if (username && phone) {
        db.query('SELECT email FROM usertable WHERE user_name = ? AND phone = ?', [username, phone], function (error, results, fields) {
            if (error) throw error;
            if (results.length > 0) {
                res.send(`<script type="text/javascript">alert("아이디는 ${results[0].email} 입니다."); 
                document.location.href="/login.html";</script>`);
            } else {
                res.send(`<script type="text/javascript">alert("입력된 정보와 일치하는 아이디가 없습니다."); 
                document.location.href="/findid.html";</script>`);
            }
        });
    } else {
        res.send(`<script type="text/javascript">alert("이름과 전화번호를 입력하세요."); 
        document.location.href="/findid.html";</script>`);
    }
});

// 비밀번호 찾기 페이지
app.get('/findpw.html', (req, res) => {
    res.sendFile(__dirname + '/findpw.html');
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
                    res.redirect('/resetpw.html');
                });
            } else {
                res.send(`<script type="text/javascript">alert("입력된 정보와 일치하는 계정이 없습니다."); 
                document.location.href="/findpw.html";</script>`);
            }
        });
    } else {
        res.send(`<script type="text/javascript">alert("이름, 이메일, 전화번호를 입력하세요."); 
        document.location.href="/findpw.html";</script>`);
    }
});

// 비밀번호 재설정 페이지
app.get('/resetpw.html', (req, res) => {
    res.sendFile(__dirname + '/resetpw.html');
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
                    document.location.href="/login.html";</script>`);
                });
            });
        } else {
            res.send(`<script type="text/javascript">alert("입력된 비밀번호가 서로 다릅니다."); 
            document.location.href="/resetpw.html";</script>`);
        }
    } else {
        res.send(`<script type="text/javascript">alert("비밀번호를 입력하세요."); 
        document.location.href="/resetpw.html";</script>`);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
