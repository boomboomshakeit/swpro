var mysql = require('mysql2');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);

var connect = {
    host: '127.0.0.1',
    user: 'root',
    password: '1234',
    database: 'SW',
    dateStrings: "date",
};

var db = mysql.createConnection(connect);

var sessionStore = new MySQLStore(connect);

module.exports = db;
