// Google OAuth 로그인 처리
function handleCredentialResponse(response) {
    // 토큰을 서버로 전송하여 검증
    fetch('/api/verify-token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            token: response.credential
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 로그인 성공
            localStorage.setItem('isLoggedIn', 'true');
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('mainPage').style.display = 'flex';
        } else {
            alert('인증에 실패했습니다. 다시 시도해주세요.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('인증 중 오류가 발생했습니다.');
    });
}

// 페이지 로드 시 로그인 상태 확인
document.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('mainPage').style.display = 'flex';
    }
});

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
        question: '본인의 피부 고민을 적어주세요.',
        type: 'textarea'
    }
};

// 설문 데이터 수집
function collectSurveyData() {
    const data = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        registrationDate: new Date().toISOString().split('T')[0],
        skinTone: document.querySelector('input[name="skinTone"]:checked')?.value || '',
        skinType: document.querySelector('input[name="skinType"]:checked')?.value || '',
        concerns: document.getElementById('concerns').value
    };

    // 필수 입력 확인
    if (!data.name || !data.phone || !data.skinTone || !data.skinType || !data.concerns) {
        alert('모든 항목을 입력해주세요.');
        return null;
    }

    return data;
}

// 구글 시트에 데이터 제출
async function submitToGoogleSheets(data) {
    try {
        const response = await fetch('/api/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('서버 응답 오류');
        }

        const result = await response.json();
        if (result.success) {
            alert('설문이 완료되었습니다.');
            window.location.href = 'index.html';
        } else {
            throw new Error('제출 실패');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('설문 제출 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

// 설문지 제출 처리
const surveyForm = document.getElementById('surveyForm');
if (surveyForm) {
    surveyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = collectSurveyData();
        if (data) {
            await submitToGoogleSheets(data);
        }
    });
}

// 고객 데이터 로드
async function loadCustomerData() {
    try {
        const response = await fetch('/api/customers');
        if (!response.ok) {
            throw new Error('서버 응답 오류');
        }
        const data = await response.json();
        displayCustomers(data);
    } catch (error) {
        console.error('Error:', error);
        alert('고객 데이터를 불러오는 중 오류가 발생했습니다.');
    }
}

// 고객 목록 표시
function displayCustomers(customers) {
    const tbody = document.querySelector('#customerTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    customers.forEach(customer => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${customer.name}</td>
            <td>${customer.phone.slice(-4)}</td>
            <td>${customer.registrationDate}</td>
        `;
        row.addEventListener('click', () => {
            window.location.href = `customer-detail.html?id=${customer.id}`;
        });
        tbody.appendChild(row);
    });
}

// 검색 기능
function searchCustomers() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const rows = document.querySelectorAll('#customerTable tbody tr');
    
    rows.forEach(row => {
        const name = row.cells[0].textContent.toLowerCase();
        const phone = row.cells[1].textContent;
        const date = row.cells[2].textContent;
        
        if (name.includes(searchTerm) || phone.includes(searchTerm) || date.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// 검색 이벤트 리스너
const searchButton = document.getElementById('searchButton');
const searchInput = document.getElementById('searchInput');

if (searchButton) {
    searchButton.addEventListener('click', searchCustomers);
}

if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchCustomers();
        }
    });
}

// 페이지 로드 시 고객 데이터 로드
if (document.getElementById('customerTable')) {
    loadCustomerData();
}

// 고객 상세 정보 로드
async function loadCustomerDetail() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const customerId = urlParams.get('id');
        
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
    document.getElementById('customerName').textContent = `${customer.name}님의 정보`;
    document.getElementById('skinTone').textContent = customer.skinTone;
    document.getElementById('skinType').textContent = customer.skinType;
    document.getElementById('concerns').textContent = customer.concerns;

    // GPT 분석 결과 및 추천 아로마 조합은 추후 구현
    document.getElementById('gptAnalysis').textContent = 'GPT 분석 결과가 준비 중입니다.';
    document.getElementById('aromaRecommendation').textContent = '추천 아로마 조합이 준비 중입니다.';
}

// 페이지 로드 시 고객 상세 정보 로드
if (window.location.pathname.includes('customer-detail.html')) {
    loadCustomerDetail();
} 