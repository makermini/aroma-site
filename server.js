const express = require('express');
const cors = require('cors');
const path = require('path');
const { google } = require('googleapis');
const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 환경 변수 설정
const PORT = process.env.PORT || 8080;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const API_KEY = process.env.API_KEY;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// Google Sheets API 클라이언트 설정
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        api_key: API_KEY
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

// API 엔드포인트: 설문 제출
app.post('/api/submit', async (req, res) => {
    try {
        const data = req.body;
        const sheets = google.sheets({ version: 'v4', auth });
        
        // 현재 데이터 가져오기
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'A:A'
        });
        
        const nextRow = response.data.values ? response.data.values.length + 1 : 2;
        
        // 데이터 준비
        const values = [[
            data.name,
            data.phone,
            data.registrationDate,
            data.skinTone,
            data.skinType,
            data.concerns
        ]];
        
        // 데이터 업데이트
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `A${nextRow}:F${nextRow}`,
            valueInputOption: 'RAW',
            resource: { values }
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: '제출 실패' });
    }
});

// API 엔드포인트: 고객 목록 조회
app.get('/api/customers', async (req, res) => {
    try {
        const sheets = google.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'A:F'
        });

        if (!response.data.values || response.data.values.length <= 1) {
            return res.json([]);
        }

        const customers = response.data.values.slice(1).map((row, index) => ({
            id: index + 1,
            name: row[0] || '',
            phone: row[1] || '',
            registrationDate: row[2] || '',
            skinTone: row[3] || '',
            skinType: row[4] || '',
            concerns: row[5] || ''
        }));

        res.json(customers);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: '고객 데이터 조회 실패' });
    }
});

// API 엔드포인트: 고객 상세 정보 조회
app.get('/api/customers/:id', async (req, res) => {
    try {
        const sheets = google.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'A:F'
        });

        if (!response.data.values || response.data.values.length <= 1) {
            return res.status(404).json({ error: '고객을 찾을 수 없습니다.' });
        }

        const customerId = parseInt(req.params.id);
        const customer = response.data.values.slice(1)[customerId - 1];

        if (!customer) {
            return res.status(404).json({ error: '고객을 찾을 수 없습니다.' });
        }

        res.json({
            id: customerId,
            name: customer[0] || '',
            phone: customer[1] || '',
            registrationDate: customer[2] || '',
            skinTone: customer[3] || '',
            skinType: customer[4] || '',
            concerns: customer[5] || ''
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: '고객 상세 정보 조회 실패' });
    }
});

// 라우트 설정
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/survey.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'survey.html'));
});

app.get('/customer-list.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'customer-list.html'));
});

app.get('/customer-detail.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'customer-detail.html'));
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 