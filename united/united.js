const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const app = express();
const PORT = 3000;
const axios = require("axios");

// 데이터베이스 설정
const db = require('./lib/db');

// ejs
app.set('views', __dirname + '/views');
app.set("view engine", "ejs");

// bootstrap
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); // bootstrap JS
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); // bootstrap CSS

//jquery
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); // jquery JS

//img
app.use(express.static('upload'))

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
    const user = req.session.user || null;
    res.render('main', { user: user });
});

// 관리자 페이지
app.get('/adminPage', (req, res) => {
    res.render('admin/adminPage');
});

// 회원 관리 페이지 라우팅
app.get('/memberAdminister', function(req, res) {
    // MySQL 쿼리를 사용하여 사용자 데이터를 가져옴
    db.query('SELECT * FROM usertable', (err, rows) => {
        if (err) {
            console.error('MySQL query error:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        // memberAdminister.ejs를 렌더링하여 클라이언트에게 전송
        res.render('admin/memberAdminister', { users: rows }); // rows는 쿼리 결과를 의미
    });
});

// 회원 삭제 
app.delete('/deleteUser/:username', function(req, res) {
    const username = req.params.username; // req.params.email -> req.params.username으로 수정

    // MySQL 쿼리를 사용하여 사용자 데이터를 삭제
    db.query('DELETE FROM usertable WHERE user_name = ?', [username], (err, result) => {
        if (err) {
            console.error('MySQL 쿼리 오류:', err);
            res.status(500).send('내부 서버 오류');
            return;
        }

        // 삭제 성공 시 클라이언트에게 응답
        console.log('사용자 삭제:', username);
        res.status(200).send('사용자가 삭제되었습니다.');
    });
});

// DELETE 요청을 처리할 라우트 설정
app.delete('/deleteUser/:username', (req, res) => {
    const username = req.params.username;

    // 사용자 삭제 로직 (예: 배열에서 해당 사용자 제거)
    users = users.filter(user => user.user_name !== username);

    res.sendStatus(200); // 성공 상태 코드 응답 (옵션)
});

// 회원가입 페이지에 대한 라우팅
app.get('/signup', (req, res) => {
    res.render('login/signup'); // login 폴더 내의 signup.ejs 파일을 렌더링
});

// 회원가입 프로세스
app.post('/signup', (req, res) => {
    const { username, email, password, nickname, phone} = req.body;

    // 필수 항목 검사
    if (!username || !email || !password || !nickname || !phone) {
        return res.status(400).send("모든 필수 항목을 입력하세요.");
    }

    // 비밀번호 해싱
    bcrypt.hash(password, 10, function(err, hashedPassword) {
        if (err) {
            console.error("비밀번호 해싱 오류:", err);
            return res.status(500).send("비밀번호 해싱 오류");
        }

        // 해싱된 비밀번호를 데이터베이스에 저장
        db.query('INSERT INTO usertable (user_name, email, password, nickname, phone) VALUES (?, ?, ?, ?, ?)',
            [username, email, hashedPassword, nickname, phone], (err, result) => {
                if (err) {
                    console.error("사용자 추가 오류:", err);
                    return res.status(500).send("사용자 추가 오류");
                }

                console.log('사용자가 성공적으로 등록되었습니다.');

                // 선택적으로 세션 생성을 처리할 수 있습니다
                req.session.user = { username, email, nickname };
                req.session.save(() => {
                    // 회원가입 성공 팝업창 띄우기
                    res.send(`
                        <script>
                            alert('회원가입 되었습니다. 로그인 해주세요.');
                            window.location.href = '/login'; // 로그인 페이지로 리다이렉트
                        </script>
                    `);
                });
            });
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
                        if (user.user_name === 'admin') {
                            res.send(`
                                <script>
                                    alert('관리자로 로그인 되었습니다.');
                                    window.location.href = '/adminPage'; // 관리자 페이지로 리다이렉트
                                </script>
                            `);
                        } else {
                            // 로그인 성공 팝업창 띄우기
                            res.send(`
                                <script>
                                    alert('로그인 되었습니다.');
                                    window.location.href = '/'; // 메인 페이지로 리다이렉트
                                </script>
                            `);
                        }
                    });
                } else {
                    console.log('Invalid email or password');
                    res.send(`
                        <script>
                            alert('로그인 정보가 일치하지 않습니다.');
                            window.location.href = '/login'; // 로그인 페이지로 리다이렉트
                        </script>
                    `);
                }
            });
        } else {
            console.log('Invalid email or password');
            res.send(`
                <script>
                    alert('로그인 정보가 일치하지 않습니다.');
                    window.location.href = '/login'; // 로그인 페이지로 리다이렉트
                </script>
            `);
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

// 비밀번호 재설정 페이지 (로그인 전 사용자용)
app.get('/resetpw', (req, res) => {
    if (!req.session.user) {
        // 사용자가 로그인하지 않은 경우 로그인 전용 비밀번호 재설정 페이지로 렌더링
        res.render('login/resetpw');
    } else {
        // 사용자가 로그인한 경우 마이페이지 비밀번호 변경 페이지로 리다이렉트
        res.redirect('/mypage/resetpw');
    }
});

// 비밀번호 변경 페이지 (마이페이지에서 접근)
app.get('/mypage/resetpw', (req, res) => {
    if (!req.session.user) {
        // 사용자가 로그인하지 않은 경우 로그인 페이지로 리다이렉트
        res.redirect('/login');
    } else {
        res.render('mypage/resetpw_loggedin');
    }
});

// 비밀번호 재설정 프로세스 (비밀번호 찾기용)
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

// 비밀번호 재설정 프로세스 (마이페이지용)
app.post('/mypage/resetpw', (req, res) => {
    const { current_pwd, new_pwd, new_pwd2 } = req.body;
    const email = req.session.user.email;

    if (new_pwd && new_pwd2 && current_pwd) {
        if (new_pwd === new_pwd2) {
            // 현재 비밀번호 확인
            db.query('SELECT password FROM usertable WHERE email = ?', [email], (err, results) => {
                if (err) throw err;
                if (results.length > 0) {
                    const hashedPassword = results[0].password;
                    bcrypt.compare(current_pwd, hashedPassword, (err, isValid) => {
                        if (err) throw err;
                        if (isValid) {
                            // 새 비밀번호 해시화 및 업데이트
                            bcrypt.hash(new_pwd, 10, (err, hash) => {
                                if (err) throw err;
                                db.query('UPDATE usertable SET password = ? WHERE email = ?', [hash, email], (error, results) => {
                                    if (error) throw error;
                                    res.send(`<script type="text/javascript">alert("비밀번호가 재설정되었습니다!"); 
                                    document.location.href="/mypage";</script>`);
                                });
                            });
                        } else {
                            res.send(`<script type="text/javascript">alert("현재 비밀번호가 일치하지 않습니다."); 
                            document.location.href="/mypage/resetpw";</script>`);
                        }
                    });
                } else {
                    res.send(`<script type="text/javascript">alert("사용자 정보를 찾을 수 없습니다."); 
                    document.location.href="/mypage";</script>`);
                }
            });
        } else {
            res.send(`<script type="text/javascript">alert("입력된 새 비밀번호가 서로 다릅니다."); 
            document.location.href="/mypage/resetpw";</script>`);
        }
    } else {
        res.send(`<script type="text/javascript">alert("모든 필드를 입력하세요."); 
        document.location.href="/mypage/resetpw";</script>`);
    }
});

// 서버 측에서 전화번호 형식화 함수 추가
function formatPhoneNumber(phoneNumber) {
    // 전화번호 형식화 (예: 01012341234 -> 010-1234-1234)
    return phoneNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
}

// 마이페이지 라우트 수정
app.get('/mypage', (req, res) => {
    if (!req.session.user) {
        // 사용자가 로그인하지 않은 경우 로그인 페이지로 리다이렉트
        res.redirect('/login');
    } else {
        // 데이터베이스에서 사용자 정보를 가져와서 세션에 저장
        const userEmail = req.session.user.email; // 사용자 이메일을 이용해 정보를 가져옵니다.
        db.query('SELECT user_name, email, nickname, phone FROM usertable WHERE email = ?', [userEmail], (err, results) => {
            if (err) {
                console.error('사용자 정보 가져오기 오류:', err);
                res.status(500).send('사용자 정보 가져오기 오류');
            } else {
                if (results.length > 0) {
                    // 사용자 정보를 세션에 저장
                    req.session.user.username = results[0].user_name;
                    req.session.user.email = results[0].email;
                    req.session.user.nickname = results[0].nickname;
                    req.session.user.phone = results[0].phone;
                    // 전화번호 형식화 함수를 적용하여 전달
                    const formattedPhone = formatPhoneNumber(results[0].phone);
                    res.render('mypage/mypage', { user: req.session.user, formattedPhone });
                } else {
                    res.status(404).send('사용자를 찾을 수 없음');
                }
            }
        });
    }
});

// 약국 페이지
app.get('/pharmacy', (req, res) => {
    res.render('pharmacy/pharmacy');
});

// 응급실 페이지
app.get('/emergency', (req, res) => {
    res.render('emergency/emergency');
});

app.get('/wishlist', (req, res) => {
    // wishlist.ejs 파일을 렌더링하여 클라이언트에 전송
    res.render('wishlist/wishlist');
});

// updateUser 라우트 추가
app.get('/updateUser', (req, res) => {
    if (!req.session.user) {
        // 사용자가 로그인하지 않은 경우 로그인 페이지로 리다이렉트
        res.redirect('/login');
    } else {
        res.render('mypage/updateUser', { user: req.session.user });
    }
});

// updateUser POST 요청 처리
app.post('/updateUser', (req, res) => {
    const { nickname, phone } = req.body;
    const userEmail = req.session.user.email;

    // 데이터베이스 업데이트 쿼리
    db.query('UPDATE usertable SET nickname = ?, phone = ? WHERE email = ?', [nickname, phone, userEmail], (err, results) => {
        if (err) {
            console.error('사용자 정보 업데이트 오류:', err);
            res.status(500).send('사용자 정보 업데이트 실패');
        } else {
            // 업데이트 성공 시 세션 정보 업데이트
            req.session.user.nickname = nickname;
            req.session.user.phone = phone;
            res.redirect('/mypage'); // 마이페이지로 리다이렉트
        }
    });
});

// 회원 탈퇴 페이지 라우트
app.get('/signout', (req, res) => {
    if (!req.session.user) {
        // 사용자가 로그인하지 않은 경우 로그인 페이지로 리다이렉트
        res.redirect('login/login');
    } else {
        res.render('mypage/signout', { user: req.session.user });
    }
});

// 회원 탈퇴 요청 처리
app.post('/signout', (req, res) => {
    if (!req.session.user) {
        res.redirect('/login/login');
    } else {
        var userId = req.session.user.email;
        var sql = "DELETE FROM usertable WHERE email = ?";
        db.query(sql, [userId], function(err) {
            if (err) {
                console.error('쿼리 실행 중 오류 발생', err);
                res.status(500).send('서버 오류');
                return;
            }
            req.session.destroy(function(err) {
                if (err) {
                    console.error('세션 삭제 중 오류 발생', err);
                    res.status(500).send('서버 오류');
                    return;
                }
                // 회원 탈퇴 성공 팝업창을 클라이언트에게 보내기
                res.send(`<script type="text/javascript">
                            alert("회원 탈퇴가 완료되었습니다."); 
                            window.location.href = "/";
                         </script>`);
            });
        });
    }
});

// 로그아웃 라우트
app.get('/logout', (req, res) => {
    req.session.destroy(); // 세션 삭제

    // 로그아웃 팝업창 띄우기
    res.send(`
        <script>
            alert('로그아웃 되었습니다.');
            window.location.href = '/'; // 메인 페이지로 리다이렉트
        </script>
    `);
});

//약국 리스트
app.get("/pharmacy_list", (req, res) => {
        let api = async() => {
            let response = null;

            try {
                response = await axios.get("http://apis.data.go.kr/B552657/ErmctInsttInfoInqireService/getParmacyListInfoInqire", {
                    params: {
                        "serviceKey": "bRGHp4LED9LmCtpRIaNbJgEoBqxhSFPQ6L80seoB1xuifKVf5Prkaqq/aT6V9EnAwgFs6C+38eIGzeSBZ68i3g==",
                        "Q0": req.query.Q0,
                        "Q1": req.query.Q1,
                        "QT": req.query.QT,
                        "QN": req.query.QN,
                        "QRD": req.query.QRD,
                        "pageNo": req.query.pageNo,
                        "numOfRows": req.query.numOfRows
                }
            })
        }
        catch(e) {
            console.log(e);
        }
        return response;
    }
        api().then((response) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json(response.data.response.body);
        });
});

//응급실 리스트
app.get("/emergency_list", (req, res) => {
    let api = async() => {
        let response = null;

        try {
            response = await axios.get("http://apis.data.go.kr/B552657/ErmctInfoInqireService/getEgytBassInfoInqire", {
                params: {
                    "serviceKey": "bRGHp4LED9LmCtpRIaNbJgEoBqxhSFPQ6L80seoB1xuifKVf5Prkaqq/aT6V9EnAwgFs6C+38eIGzeSBZ68i3g==",
                    "HPID": req.query.HPID,
                    //"Q0": req.query.Q0,
                    //"Q1": req.query.Q1,
                    //"QN": req.query.QN,
                    //"QRD": req.query.QRD,
                    "pageNo": req.query.pageNo,
                    "numOfRows": req.query.numOfRows
            }
        })
    }
    catch(e) {
        console.log(e);
    }
    return response;
}
    api().then((response) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.json(response.data.response.body);
    });
});

// router 설정
const indexRouter = require('./router');
const boardRouter = require('./router/board');
const noticeRouter = require('./router/notice');

app.use('/', indexRouter);
app.use('/', boardRouter);
app.use('/', noticeRouter);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
