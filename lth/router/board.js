var express = require('express');
var router = express.Router();
var db = require('../lib/db');

router.use(express.urlencoded({
	extened: true
}));

router.get('/board/write', function (req, res) {
	res.render('board/write');
});

router.post('/board/write', function (req, res) {
	var writer = req.body.writer;
	var password = req.body.password;
	var title = req.body.title;
	var content = req.body.content;
	var data = [writer, password, title, content];
	var sql = "insert into board(idx, writer, password, title, content, date, del_yn) values(null,?,?,?,?,now(),'N')";
	db.query(sql, data);
	res.redirect('/board');
});