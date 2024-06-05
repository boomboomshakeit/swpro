// express
var express = require('express');
var app = express();

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

//db


// router
var indexRouter = require('./router');
var boardRouter = require('./router/board');

app.use('/', indexRouter);
app.use('/', boardRouter);

app.listen(3000, function () {
	console.log("3000포트로 노드서버 오픈!!");
})
