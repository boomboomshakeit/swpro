var express = require('express');
var router = express.Router();

var template = require('./template.js');
var db = require('./db');

// 로그인 화면
router.get('/login', function (request, response) {
    var title = '로그인';
    var html = template.HTML(title, `
            <h2>로그인</h2>
            <form action="/auth/login_process" method="post">
            <p><input class="login" type="text" name="email" placeholder="이메일"></p>
            <p><input class="login" type="password" name="pwd" placeholder="비밀번호"></p>
            <p><input class="btn" type="submit" value="로그인"></p>
            </form>            
            <p>계정이 없으신가요? <a href="/auth/register">회원가입</a></p> 
        `, '');
    response.send(html);
});

// 로그인 프로세스
router.post('/login_process', function (request, response) {
    var email = request.body.email;
    var password = request.body.pwd;
    if (email && password) { // email과 password가 입력되었는지 확인
        db.query('SELECT * FROM usertable WHERE email = ? AND password = ?', [email, password], function (error, results, fields) {
            if (error) throw error;
            if (results.length > 0) { // db에서의 반환값이 있으면 로그인 성공
                request.session.is_logined = true; // 세션 정보 갱신
                request.session.nickname = results[0].nickname;
                request.session.save(function () {
                    response.redirect(`/`);
                });
            } else {
                response.send(`<script type="text/javascript">alert("로그인 정보가 일치하지 않습니다."); 
                document.location.href="/auth/login";</script>`);
            }
        });
    } else {
        response.send(`<script type="text/javascript">alert("이메일과 비밀번호를 입력하세요!"); 
        document.location.href="/auth/login";</script>`);
    }
});

// 로그아웃
router.get('/logout', function (request, response) {
    request.session.destroy(function (err) {
        response.redirect('/');
    });
});

// 회원가입 화면
router.get('/register', function (request, response) {
    var title = '회원가입';
    var html = template.HTML(title, `
    <h2>회원가입</h2>
    <form action="/auth/register_process" method="post">
    <p><input class="login" type="text" name="username" placeholder="이름"></p>
    <p><input class="login" type="text" name="email" placeholder="이메일"></p>
    <p><input class="login" type="text" name="nickname" placeholder="닉네임"></p>
    <p><input class="login" type="password" name="pwd" placeholder="비밀번호"></p>
    <p><input class="login" type="password" name="pwd2" placeholder="비밀번호 재확인"></p>
    <p><input class="btn" type="submit" value="제출"></p>
    </form>
    <p><a href="/auth/login">로그인화면으로 돌아가기</a></p>
    `, '');
    response.send(html);
});

// 회원가입 프로세스
router.post('/register_process', function (request, response) {
    var username = request.body.username;
    var email = request.body.email;
    var nickname = request.body.nickname;
    var password = request.body.pwd;
    var password2 = request.body.pwd2;

    if (username && email && nickname && password && password2) {
        db.query('SELECT * FROM usertable WHERE email = ?', [email], function (error, results, fields) {
            if (error) throw error;
            if (results.length <= 0 && password == password2) { // DB에 같은 이름의 회원아이디가 없고, 비밀번호가 올바르게 입력된 경우
                db.query('INSERT INTO usertable (user_name, email, nickname, password) VALUES(?,?,?,?)', [username, email, nickname, password], function (error, data) {
                    if (error) throw error;
                    response.send(`<script type="text/javascript">alert("회원가입이 완료되었습니다!");
                    document.location.href="/";</script>`);
                });
            } else if (password != password2) { // 비밀번호가 올바르게 입력되지 않은 경우
                response.send(`<script type="text/javascript">alert("입력된 비밀번호가 서로 다릅니다."); 
                document.location.href="/auth/register";</script>`);
            } else { // DB에 같은 이메일의 회원아이디가 있는 경우
                response.send(`<script type="text/javascript">alert("이미 존재하는 이메일입니다."); 
                document.location.href="/auth/register";</script>`);
            }
        });
    } else { // 입력되지 않은 정보가 있는 경우
        response.send(`<script type="text/javascript">alert("입력되지 않은 정보가 있습니다."); 
        document.location.href="/auth/register";</script>`);
    }
});

module.exports = router;
