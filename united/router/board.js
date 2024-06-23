var express = require('express');
var router = express.Router();
var db = require('../lib/db');

// post
router.use(express.urlencoded({
    extended: true
}));

//fs
var fs = require('fs');

//multer
var multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        var dirtemp = new Date();
        var path = 'upload/';
        var dir = path + dirtemp.getFullYear() + '' + (dirtemp.getMonth() + 1) + '' + dirtemp.getDate();
        !fs.existsSync(dir) && fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '_' + file.originalname);
    }
})
const upload = multer({
    storage: storage
})

router.get('/board', function (req, res) {
    var sql = "select * from board";
    db.query(sql, function (err, rows) {
        if (err) {
            console.error('Error executing query', err);
            res.status(500).send('Server error');
            return;
        }
        res.render('board/index', {
            rows: rows || [] // rows가 undefined일 경우 빈 배열로 대체
        });
    });
});

router.get('/board/write', function (req, res) {
    res.render('board/write');
});

router.post('/board/write', upload.single('file'), function (req, res) {
    if (!req.session.user) {
        res.send(`<script type="text/javascript">alert("로그인이 필요합니다."); 
                  document.location.href="/login";</script>`);
        return;
    }
    var writer = req.session.user.nickname; // 세션에서 nickname 가져오기
    var title = req.body.title;
    var content = req.body.content;

    if (req.file) {
        var o_name = req.file.originalname;
        var c_name = req.file.filename;
        var path = '/' + req.file.destination + '/';
        var size = req.file.size;
        var data = [writer, title, content, o_name, c_name, path, size];
        var sql = "insert into board(idx, writer, title, content, date, del_yn, file_o_name, file_c_name, file_path, file_size) values(null,?,?,?,now(),'N',?,?,?,?)";
        db.query(sql, data);
    } else {
        var data = [writer, title, content];
        var sql = "insert into board(idx, writer, title, content, date, del_yn, file_o_name, file_c_name, file_path, file_size) values(null,?,?,?,now(),'N',null,null,null,null)";
        db.query(sql, data);
    }
    res.redirect('/board');
});


router.get('/board/view/:idx', function (req, res) {
    var idx = req.params.idx;
    var sql = "select * from board where 1=1 and idx=?";
    db.query(sql, [idx], function (err, rows) {
        if (err) {
            console.error('Error executing query', err);
            res.status(500).send('Server error');
            return;
        }
        res.render('board/view', {
            result: rows[0] || {} // rows[0]가 undefined일 경우 빈 객체로 대체
        });
    });
});

router.get('/board/:type/:idx', function (req, res) {
    var type = req.params.type;
    var idx = req.params.idx;
    var title;
    if (type == "modify") {
        title = "수정";
    }
    if (type == "delete") {
        title = "삭제";
    }
    res.render('board/auth', {
        idx: idx,
        type: type,
        title: title
    });
});

router.post('/board/:type/:idx', function (req, res) {
    var type = req.params.type;
    var idx = req.params.idx;
    var password = req.body.password;
    var sql = "select idx from board where 1=1 and idx=?";
    db.query(sql, [idx], function (err, rows) {
        if (err) {
            console.error('쿼리 실행 중 오류 발생', err);
            res.status(500).send('서버 오류');
            return;
        }
        if (rows.length === 0) {
            res.render('board/error');
        } else {
            var sql = "select writer from board where 1=1 and idx=?";
            db.query(sql, [idx], function (err, rows) {
                if (err) {
                    console.error('쿼리 실행 중 오류 발생', err);
                    res.status(500).send('서버 오류');
                    return;
                }
                var writer = rows[0].writer;
                // 여기서 필요에 따라 비밀번호를 확인하세요
                if (type == "modify") {
                    var sql = "select * from board where 1=1 and idx=?";
                    db.query(sql, [idx], function (err, rows) {
                        if (err) {
                            console.error('쿼리 실행 중 오류 발생', err);
                            res.status(500).send('서버 오류');
                            return;
                        }
                        res.render('board/modify', {
                            head: "글 수정하기",
                            idx: idx,
                            writer: writer,
                            title: rows[0].title,
                            content: rows[0].content
                        });
                    });
                }
                if (type == "delete") {
                    var sql = "update board set del_yn='Y' where 1=1 and idx=?";
                    db.query(sql, [idx], function (err) {
                        if (err) {
                            console.error('쿼리 실행 중 오류 발생', err);
                            res.status(500).send('서버 오류');
                            return;
                        }
                        res.redirect('/board');
                    });
                }
            });
        }
    });
});


router.post('/board/modify/:idx/ok', function (req, res) {
    var idx = req.params.idx;
    var writer = req.body.writer;
    var title = req.body.title;
    var content = req.body.content;
    var data = [writer, title, content, idx];
    var sql = "update board set writer=?,title=?,content=?,date=now() where 1=1 and idx=?";
    db.query(sql, data, function (err) {
        if (err) {
            console.error('쿼리 실행 중 오류 발생', err);
            res.status(500).send('서버 오류');
            return;
        }
        res.redirect('/board/view/' + idx);
    });
});


router.get('/:path/:dir/:c_name', function (req, res) {
    var url = req.params.path + '/' + req.params.dir + '/' + req.params.c_name;
    res.download(url, req.params.c_name);
});

module.exports = router;
