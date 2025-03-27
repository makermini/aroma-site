const express = require('express');
const path = require('path');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
const port = process.env.PORT || 8080;

// CORS 설정
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Google Sheets API 클라이언트 설정
const sheets = google.sheets({ version: 'v4' });

// API 엔드포인트: 설문 제출
app.post('/api/submit', async (req, res) => {
    try {
        const spreadsheetId = process.env.SPREADSHEET_ID;
        const apiKey = process.env.API_KEY;
        
        // 다음 빈 행 찾기
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Sheet1!A:A',
            key: apiKey
        });
        
        const nextRow = response.data.values ? response.data.values.length + 1 : 1;
        
        // 데이터 준비
        const values = [
            [
                req.body.name,
                req.body.phone,
                req.body.registrationDate,
                req.body.skinTone,
                req.body.skinType,
                req.body.concerns
            ]
        ];
        
        // 데이터 추가
        await sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: `Sheet1!A${nextRow}:F${nextRow}`,
            valueInputOption: 'RAW',
            key: apiKey,
            resource: { values }
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API 엔드포인트: 고객 목록 조회
app.get('/api/customers', async (req, res) => {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: 'Sheet1!A:F',
            key: process.env.API_KEY
        });
        
        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.json([]);
        }
        
        const customers = rows.slice(1).map((row, index) => ({
            id: index + 1,
            name: row[0],
            phone: row[1],
            registrationDate: row[2],
            skinTone: row[3],
            skinType: row[4],
            concerns: row[5]
        }));
        
        res.json(customers);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API 엔드포인트: 고객 상세 정보 조회
app.get('/api/customers/:id', async (req, res) => {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: 'Sheet1!A:F',
            key: process.env.API_KEY
        });
        
        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: '고객을 찾을 수 없습니다.' });
        }
        
        const customerId = parseInt(req.params.id);
        if (customerId < 1 || customerId >= rows.length) {
            return res.status(404).json({ success: false, error: '고객을 찾을 수 없습니다.' });
        }
        
        const row = rows[customerId];
        const customer = {
            id: customerId,
            name: row[0],
            phone: row[1],
            registrationDate: row[2],
            skinTone: row[3],
            skinType: row[4],
            concerns: row[5]
        };
        
        res.json(customer);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 라우트 설정
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/survey', (req, res) => {
    res.sendFile(path.join(__dirname, 'survey.html'));
});

app.get('/customer-list', (req, res) => {
    res.sendFile(path.join(__dirname, 'customer-list.html'));
});

app.get('/customer-detail', (req, res) => {
    res.sendFile(path.join(__dirname, 'customer-detail.html'));
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 