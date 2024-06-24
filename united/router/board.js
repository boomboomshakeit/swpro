var express = require('express');
var router = express.Router();
var db = require('../lib/db');

// post
router.use(express.urlencoded({
    extended: true
}));

// fs
var fs = require('fs');

// multer
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
        var result = rows[0] || {}; // rows[0]가 undefined일 경우 빈 객체로 대체
        
        var sessionUser = req.session.user; // 세션에서 사용자 정보 가져오기
        var writer = result.writer || ''; // 작성자 가져오기
        
        res.render('board/view', {
            result: result,
            sessionUser: sessionUser, // 세션 사용자 정보 전달
            writer: writer, // 작성자 정보 전달
            idx: idx // 게시글 번호 전달
        });
    });
});

router.get('/board/modify/:idx', function (req, res) {
    var idx = req.params.idx;
    var sql = "select * from board where idx=?";
    db.query(sql, [idx], function (err, rows) {
        if (err) {
            console.error('쿼리 실행 중 오류 발생', err);
            res.status(500).send('서버 오류');
            return;
        }
        if (rows.length === 0) {
            res.render('board/error'); // 해당 글이 없는 경우 에러 페이지로 이동
            return;
        }
        
        var writer = rows[0].writer || ''; // 작성자 가져오기
        var sessionUser = req.session.user; // 세션에 저장된 사용자 정보 가져오기
        
        // 작성자와 세션에 저장된 사용자 정보의 닉네임 비교
        if (!sessionUser || writer !== sessionUser.nickname) {
            res.render('board/error'); // 권한이 없는 경우 에러 페이지로 이동
            return;
        }
        
        var title = rows[0].title || ''; // title이 없을 경우 기본값으로 빈 문자열 설정
        var content = rows[0].content || ''; // content가 없을 경우 기본값으로 빈 문자열 설정
        
        res.render('board/modify', {
            head: "글 수정하기",
            idx: idx,
            writer: writer,
            title: title,
            content: content,
            sessionUser: sessionUser // 세션 사용자 정보 전달
        });
    });
});

router.post('/board/modify/:idx', function (req, res) {
    var idx = req.params.idx;
    var writer = req.body.writer;
    var title = req.body.title;
    var content = req.body.content;
    var data = [writer, title, content, idx];
    var sql = "update board set writer=?, title=?, content=?, date=now() where idx=?";
    db.query(sql, data, function (err) {
        if (err) {
            console.error('쿼리 실행 중 오류 발생', err);
            res.status(500).send('서버 오류');
            return;
        }
        res.redirect('/board/view/' + idx);
    });
});

router.get('/board/delete/:idx', function (req, res) {
    var idx = req.params.idx;
    var sql = "update board set del_yn='Y' where 1=1 and idx=?";
    db.query(sql, [idx], function (err) {
        if (err) {
            console.error('쿼리 실행 중 오류 발생', err);
            res.status(500).send('서버 오류');
            return;
        }
        res.redirect('/board'); // 삭제 후 board 페이지로 리다이렉트
    });
});

router.get('/:path/:dir/:c_name', function (req, res) {
    var url = req.params.path + '/' + req.params.dir + '/' + req.params.c_name;
    res.download(url, req.params.c_name);
});

module.exports = router;
