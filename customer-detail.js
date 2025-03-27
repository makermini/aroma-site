// Google Sheets API 설정
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const API_KEY = process.env.API_KEY;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// 설문지 설정 (script.js와 동일한 설정을 사용)
const SURVEY_CONFIG = {
    questions: {
        skinTone: {
            id: 'skinTone',
            label: '피부톤',
            type: 'radio'
        },
        skinType: {
            id: 'skinType',
            label: '피부타입',
            type: 'radio'
        },
        concerns: {
            id: 'concerns',
            label: '피부고민',
            type: 'textarea'
        }
    }
};

let accessToken = null;

// Google API 초기화
function initClient() {
    const client = google.accounts.oauth2.initCodeClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        callback: (response) => {
            if (response.code) {
                console.log('인증 성공');
                getAccessToken(response.code);
            }
        }
    });

    client.requestCode();
}

// 액세스 토큰 받기
async function getAccessToken(code) {
    try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code: code,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri: 'http://localhost:3000',
                grant_type: 'authorization_code'
            })
        });

        const data = await response.json();
        accessToken = data.access_token;
        console.log('액세스 토큰 받기 성공');
        
        await loadCustomerData();
    } catch (error) {
        console.error('액세스 토큰 받기 실패:', error);
    }
}

// Google API 로드
function loadGoogleAPI() {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = function() {
        initClient();
    };
    document.body.appendChild(script);
}

// 고객 데이터 로드
function loadCustomerData() {
    const urlParams = new URLSearchParams(window.location.search);
    const customerName = urlParams.get('name');

    if (!customerName) {
        console.error('고객명이 없습니다.');
        return;
    }

    // 로컬 스토리지에서 고객 데이터 가져오기
    const allCustomers = JSON.parse(localStorage.getItem('allCustomers') || '[]');
    const customerData = allCustomers.find(customer => customer.name === customerName);

    if (customerData) {
        // 고객명 표시
        document.getElementById('customerName').textContent = `${customerName}님 분석결과`;

        // 설문 결과 표시
        displaySurveyResults(customerData);
        
        // GPT 답변 표시
        document.getElementById('gptResponse1').textContent = customerData.gptResponse1 || '답변이 없습니다.';
        document.getElementById('gptResponse2').textContent = customerData.gptResponse2 || '답변이 없습니다.';
    }
}

// 설문 결과 표시
function displaySurveyResults(customer) {
    const surveyResults = document.getElementById('surveyResults');
    if (!surveyResults) return;

    let html = '';
    Object.entries(SURVEY_CONFIG.questions).forEach(([key, config]) => {
        const answer = customer[key] || '답변 없음';
        html += `
            <div class="question-item">
                <h3>${config.label}</h3>
                <p>${answer}</p>
            </div>
        `;
    });
    surveyResults.innerHTML = html;
}

// 페이지 로드 시 실행
window.onload = function() {
    // 저장된 액세스 토큰 확인
    const savedToken = localStorage.getItem('googleAccessToken');
    if (savedToken) {
        accessToken = savedToken;
        loadCustomerData();
    } else {
        initClient();
    }
}; 