var express = require('express');
var router = express.Router();

// post
router.use(express.urlencoded({
	extened: true
}));

//multer
var multer = require('multer');

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, 'upload') // 파일 업로드 경로
	},
	filename: function (req, file, cb) {
		cb(null, Date.now() + '_' + file.originalname) //파일 이름 설정
	}
})
const upload = multer({
	storage: storage
})

router.get('/', function (req, res) {
	res.render('index');
});

router.get(function(req,res){
	res.status(404).send('not found');
});

router.get('/get_send', function (req, res) {
	res.render('get_send');
});

router.get('/post_send', function (req, res) {
	res.render('post_send');
});

router.get('/method_result', function (req, res) {
	var val1 = req.query.val1;
	var val2 = req.query.val2;
	res.render('method_result', {
		'val1': val1,
		'val2': val2
	});
});

router.post('/method_result', function (req, res) {
	val1 = req.body.val1;
	val2 = req.body.val2;
	res.render('method_result', {
		'val1': val1,
		'val2': val2
	});
});

router.get('/upload', function (req, res) {
	res.render('upload');
});

router.post('/upload_result', upload.single('file'), function (req, res) {
	o_name = req.file.originalname;
	c_name = req.file.filename;
	size = req.file.size;
	res.render('upload_result', {
		'o_name': o_name,
		'c_name': c_name,
		'size': size
	});
});

module.exports = router;
