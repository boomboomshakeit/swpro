const express = require('express');
const mysql = require('mysql2');
const path = require('path');

const app = express();
const port = 3000;

// MySQL 연결 설정
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'medical'
});

// 데이터베이스 연결
db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('Connected to database');
});

// 정적 파일 제공 설정
//app.use(express.json('kakao/mapping'));

//응급시설 지도
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'mapping', 'emergency.html'));
});

// 모든 응급시설 위치 정보 조회 API
app.get('/emergency', (req, res) => {
  db.query('SELECT emergency_name, lat, lng FROM emergency', (err, results) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: 'Database query error' });
    } else {
      res.status(200).json(results);
    }
  });
});

// 서버 시작
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
