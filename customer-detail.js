// Google Sheets API 설정
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const API_KEY = process.env.API_KEY;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// 설문 설정
const SURVEY_CONFIG = {
    skinTone: {
        question: '피부 톤을 선택해주세요.',
        options: ['밝은 톤', '중간 톤', '어두운 톤']
    },
    skinType: {
        question: '피부 타입을 선택해주세요.',
        options: ['건성', '중성', '지성', '복합성']
    },
    concerns: {
        question: '관심 있는 피부 고민을 선택해주세요.',
        options: ['주름', '탄력', '색소침착', '모공', '트러블', '민감성']
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
    Object.entries(SURVEY_CONFIG).forEach(([key, config]) => {
        const answer = customer[key] || '답변 없음';
        html += `
            <div class="survey-item">
                <h3>${config.question}</h3>
                <p>${answer}</p>
            </div>
        `;
    });
    surveyResults.innerHTML = html;
}

// URL에서 고객 ID 가져오기
function getCustomerId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// 고객 상세 정보 로드
async function loadCustomerDetail() {
    try {
        const customerId = getCustomerId();
        if (!customerId) {
            throw new Error('고객 ID가 없습니다.');
        }

        const response = await fetch(`/api/customers/${customerId}`);
        if (!response.ok) {
            throw new Error('서버 응답 오류');
        }

        const customer = await response.json();
        displayCustomerDetail(customer);
    } catch (error) {
        console.error('Error:', error);
        alert('고객 정보를 불러오는 중 오류가 발생했습니다.');
    }
}

// 고객 상세 정보 표시
function displayCustomerDetail(customer) {
    // 고객 이름 표시
    document.getElementById('customerName').textContent = customer.name;

    // 설문 결과 표시
    const surveyResults = document.getElementById('surveyResults');
    surveyResults.innerHTML = `
        <div class="survey-item">
            <h3>${SURVEY_CONFIG.skinTone.question}</h3>
            <p>${customer.skinTone}</p>
        </div>
        <div class="survey-item">
            <h3>${SURVEY_CONFIG.skinType.question}</h3>
            <p>${customer.skinType}</p>
        </div>
        <div class="survey-item">
            <h3>${SURVEY_CONFIG.concerns.question}</h3>
            <p>${customer.concerns}</p>
        </div>
    `;

    // GPT 응답 표시
    const gptResponse1 = document.getElementById('gptResponse1');
    const gptResponse2 = document.getElementById('gptResponse2');
    
    if (customer.gptResponse1) {
        gptResponse1.innerHTML = `<p>${customer.gptResponse1}</p>`;
    } else {
        gptResponse1.innerHTML = '<p>GPT 응답이 없습니다.</p>';
    }

    if (customer.gptResponse2) {
        gptResponse2.innerHTML = `<p>${customer.gptResponse2}</p>`;
    } else {
        gptResponse2.innerHTML = '<p>GPT 응답이 없습니다.</p>';
    }
}

// 뒤로 가기 버튼 이벤트 리스너
document.getElementById('backButton').addEventListener('click', () => {
    window.location.href = 'customer-list.html';
});

// 페이지 로드 시 고객 상세 정보 로드
document.addEventListener('DOMContentLoaded', loadCustomerDetail);

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