var mysql = require('mysql');
var db = mysql.createConnection({
	host : '127.0.0.1',
	user : 'root',
	password : '12345678',
	database : 'sw',
});
db.connect();

module.exports = db;