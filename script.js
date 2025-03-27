// Google Sheets API 설정
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const API_KEY = process.env.API_KEY;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// 설문지 설정
const SURVEY_CONFIG = {
    // 각 질문의 설정을 여기에 추가합니다
    // 새로운 질문을 추가할 때는 이 객체에 새로운 항목을 추가하면 됩니다
    questions: {
        skinTone: {
            id: 'skinTone',
            label: '피부톤',
            type: 'radio',
            options: [
                { value: '매우 어두움', label: '매우 어두움' },
                { value: '어두움', label: '어두움' },
                { value: '보통', label: '보통' },
                { value: '밝음', label: '밝음' },
                { value: '매우밝음', label: '매우밝음' }
            ]
        },
        skinType: {
            id: 'skinType',
            label: '피부타입',
            type: 'radio',
            options: [
                { value: '건성', label: '건성' },
                { value: '지성', label: '지성' },
                { value: '복합성', label: '복합성' }
            ]
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

    // 페이지 로드 시 자동으로 인증 시작
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
        
        // 액세스 토큰을 로컬 스토리지에 저장
        localStorage.setItem('googleAccessToken', accessToken);
        
        // 고객 데이터 로드
        await loadCustomerData();
    } catch (error) {
        console.error('액세스 토큰 받기 실패:', error);
    }
}

// 고객 데이터 로드
async function loadCustomerData() {
    try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/A:H`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const result = await response.json();
        
        if (result.values && result.values.length > 1) {
            // 헤더 행 제외하고 데이터 저장
            const allCustomers = result.values.slice(1).map(row => ({
                name: row[0] || '',
                phone: row[1] || '',
                registrationDate: row[2] || '',
                gptResponse1: row[3] || '',
                gptResponse2: row[4] || '',
                ...Object.fromEntries(
                    Object.entries(SURVEY_CONFIG.questions).map(([key, config], index) => [
                        key,
                        row[index + 5] || '' // F열부터 시작
                    ])
                )
            }));
            
            // 고객 데이터를 로컬 스토리지에 저장
            localStorage.setItem('allCustomers', JSON.stringify(allCustomers));
            
            // 고객명단 페이지인 경우 데이터 표시
            if (document.getElementById('customerTableBody')) {
                displayCustomers(allCustomers);
            }
        }
    } catch (error) {
        console.error('고객 데이터 로드 실패:', error);
        alert('고객 데이터를 불러오는데 실패했습니다. 다시 시도해주세요.');
    }
}

// 설문 데이터 수집
function collectSurveyData() {
    const data = {
        name: window.userInfo.name,
        phone: window.userInfo.phone,
        registrationDate: new Date().toISOString().split('T')[0]
    };

    // 각 질문의 답변 수집
    Object.entries(SURVEY_CONFIG.questions).forEach(([key, config]) => {
        if (config.type === 'radio') {
            data[key] = document.querySelector(`input[name="${key}"]:checked`)?.value || '';
        } else if (config.type === 'textarea') {
            data[key] = document.getElementById(key).value;
        }
    });

    return data;
}

// Google Sheets에 데이터 제출
async function submitToGoogleSheets(data) {
    try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/A:A`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const result = await response.json();
        const nextRow = result.values ? result.values.length + 1 : 2;

        // 데이터 준비
        const values = [[
            data.name,                    // A열: 고객명
            data.phone,                   // B열: 번호 뒷자리
            data.registrationDate,        // C열: 등록일
            '',                          // D열: 빈칸
            '',                          // E열: 빈칸
            ...Object.values(SURVEY_CONFIG.questions).map(config => data[config.id]) // F열부터 설문 답변
        ]];

        // 데이터 업데이트
        const lastColumn = String.fromCharCode(65 + values[0].length - 1); // 마지막 열 계산
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/A${nextRow}:${lastColumn}${nextRow}?valueInputOption=RAW`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ values })
        });
    } catch (error) {
        console.error('Error submitting to Google Sheets:', error);
        throw error;
    }
}

// 고객 목록 표시
function displayCustomers(customers) {
    const tbody = document.getElementById('customerTableBody');
    if (!tbody) return; // 고객명단 페이지가 아닌 경우 함수 종료

    tbody.innerHTML = '';

    if (customers.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="3" style="text-align: center;">등록된 고객이 없습니다.</td>';
        tbody.appendChild(tr);
        return;
    }

    customers.forEach(customer => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${customer.name}</td>
            <td>${customer.phone}</td>
            <td>${customer.registrationDate}</td>
        `;
        tr.addEventListener('click', () => {
            window.location.href = `customer-detail.html?name=${encodeURIComponent(customer.name)}`;
        });
        tbody.appendChild(tr);
    });
}

// 검색 기능
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const allCustomers = JSON.parse(localStorage.getItem('allCustomers') || '[]');
        const filteredCustomers = allCustomers.filter(customer => 
            customer.name.toLowerCase().includes(searchTerm) ||
            customer.phone.includes(searchTerm)
        );
        displayCustomers(filteredCustomers);
    });
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

    // 설문지 페이지의 시작하기 버튼 이벤트 리스너
    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.addEventListener('click', (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const phone = document.getElementById('phone').value;
            
            if (!name || !phone) {
                alert('이름과 전화번호를 모두 입력해주세요.');
                return;
            }

            window.userInfo = { name, phone };
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('questionForm').style.display = 'block';
        });
    }

    // 질문 제출 처리
    const questionsForm = document.getElementById('questions');
    if (questionsForm) {
        questionsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!accessToken) {
                alert('Google 인증이 필요합니다. 다시 로그인해주세요.');
                return;
            }

            try {
                const data = collectSurveyData();
                await submitToGoogleSheets(data);
                alert('제출이 완료되었습니다!');
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Error:', error);
                alert('제출 중 오류가 발생했습니다. 다시 시도해주세요.');
            }
        });
    }
}; 