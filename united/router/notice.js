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

router.get('/notice', function (req, res) {
    var sql = "select * from notice";
    db.query(sql, function (err, rows) {
        if (err) {
            console.error('Error executing query', err);
            res.status(500).send('Server error');
            return;
        }
        res.render('notice/index', {
            rows: rows || [] // rows가 undefined일 경우 빈 배열로 대체
        });
    });
});

router.get('/notice/write', function (req, res) {
    res.render('notice/write');
});

router.post('/notice/write', upload.single('file'), function (req, res) {
    var writer = req.session.user.nickname; // 세션에서 nickname 가져오기
    var title = req.body.title;
    var content = req.body.content;
    if (req.file) {
        var o_name = req.file.originalname;
        var c_name = req.file.filename;
        var path = '/' + req.file.destination + '/';
        var size = req.file.size;
        var data = [writer, title, content, o_name, c_name, path, size];
        var sql = "insert into notice(idx, writer, title, content, date, del_yn, file_o_name, file_c_name, file_path, file_size) values(null,?,?,?,now(),'N',?,?,?,?)";
        db.query(sql, data);
    } else {
        var data = [writer, title, content];
        var sql = "insert into notice(idx, writer, title, content, date, del_yn, file_o_name, file_c_name, file_path, file_size) values(null,?,?,?,now(),'N',null,null,null,null)";
        db.query(sql, data);
    }
    res.redirect('/notice');
});

router.get('/notice/view/:idx', function (req, res) {
    var idx = req.params.idx;
    var sql = "select * from notice where 1=1 and idx=?";
    db.query(sql, [idx], function (err, rows) {
        if (err) {
            console.error('Error executing query', err);
            res.status(500).send('Server error');
            return;
        }
        res.render('notice/view', {
            result: rows[0] || {} // rows[0]가 undefined일 경우 빈 객체로 대체
        });
    });
});

router.get('/notice/:type/:idx', function (req, res) {
    var type = req.params.type;
    var idx = req.params.idx;
    var title;
    if (type == "modify") {
        title = "수정";
    }
    if (type == "delete") {
        title = "삭제";
    }
    res.render('notice/auth', {
        idx: idx,
        type: type,
        title: title
    });
});

router.post('/notice/:type/:idx', function (req, res) {
    var type = req.params.type;
    var idx = req.params.idx;
    var password = req.body.password;
    var sql = "select password from notice where 1=1 and idx=?";
    db.query(sql, [idx], function (err, rows) {
        if (err) {
            console.error('Error executing query', err);
            res.status(500).send('Server error');
            return;
        }
        var temp = rows[0].password;
        if (temp != password) {
            res.render('notice/error');
        } else {
            if (type == "modify") {
                var sql = "select * from notice where 1=1 and idx=?";
                db.query(sql, [idx], function (err, rows) {
                    if (err) {
                        console.error('Error executing query', err);
                        res.status(500).send('Server error');
                        return;
                    }
                    res.render('notice/modify', {
                        head: "글 수정하기",
                        idx: idx,
                        writer: rows[0].writer,
                        title: rows[0].title,
                        content: rows[0].content
                    });
                });
            }
            if (type == "delete") {
                var sql = "update notice set del_yn='Y' where 1=1 and idx=?";
                db.query(sql, [idx], function (err) {
                    if (err) {
                        console.error('Error executing query', err);
                        res.status(500).send('Server error');
                        return;
                    }
                    res.redirect('/notice');
                });
            }
        }
    });
});

router.post('/notice/modify/:idx/ok', function (req, res) {
    var idx = req.params.idx;
    var writer = req.body.writer;
    var password = req.body.password;
    var title = req.body.title;
    var content = req.body.content;
    var data = [writer, password, title, content, idx];
    var sql = "update notice set writer=?,password=?,title=?,content=?,date=now() where 1=1 and idx=?";
    db.query(sql, data, function (err) {
        if (err) {
            console.error('Error executing query', err);
            res.status(500).send('Server error');
            return;
        }
        res.redirect('/notice/view/' + idx);
    });
});

router.get('/:path/:dir/:c_name', function (req, res) {
    var url = req.params.path + '/' + req.params.dir + '/' + req.params.c_name;
    res.download(url, req.params.c_name);
});

module.exports = router;