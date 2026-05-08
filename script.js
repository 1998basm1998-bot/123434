const videoElement = document.getElementById('tv-player');
const channelsListElement = document.getElementById('channels-list');
const currentChannelName = document.getElementById('current-channel-name');
const searchInput = document.getElementById('search-input');

let allChannels = [];
let hls = null;

// ==========================================
// 🔴 ضع هنا رابط الـ M3U المدفوع الخاص بك مستقبلاً
// (تركته الآن على الرابط المجاني للتجربة)
// ==========================================
const PLAYLIST_URL = 'https://iptv-org.github.io/iptv/languages/ara.m3u';

// دالة جلب البيانات
async function fetchChannels() {
    try {
        const response = await fetch(PLAYLIST_URL);
        const m3uData = await response.text();
        allChannels = parseM3U(m3uData);
        renderChannels(allChannels);
    } catch (error) {
        channelsListElement.innerHTML = '<div class="loading">حدث خطأ أثناء تحميل القنوات. يرجى التأكد من اتصال الإنترنت.</div>';
        console.error('Error fetching playlist:', error);
    }
}

// دالة تحليل ملف M3U
function parseM3U(m3u) {
    const lines = m3u.split('\n');
    const channels = [];
    let currentChannel = {};

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('#EXTINF:')) {
            const logoMatch = line.match(/tvg-logo="([^"]+)"/);
            currentChannel.logo = logoMatch && logoMatch[1] ? logoMatch[1] : 'https://via.placeholder.com/50?text=TV';

            const splitByComma = line.split(',');
            currentChannel.name = splitByComma[splitByComma.length - 1].trim();
        } 
        else if (line.startsWith('http')) {
            currentChannel.url = line;
            channels.push(currentChannel);
            currentChannel = {}; 
        }
    }
    return channels;
}

// دالة عرض القنوات في الواجهة
function renderChannels(channels) {
    channelsListElement.innerHTML = ''; 

    if (channels.length === 0) {
        channelsListElement.innerHTML = '<div class="loading">لم يتم العثور على نتائج.</div>';
        return;
    }

    channels.forEach(channel => {
        const card = document.createElement('div');
        card.className = 'channel-card';
        card.innerHTML = `
            <img src="${channel.logo}" alt="${channel.name} logo" onerror="this.src='https://via.placeholder.com/50?text=TV'">
            <h3>${channel.name}</h3>
        `;
        
        card.addEventListener('click', () => {
            playStream(channel.url, channel.name);
        });

        channelsListElement.appendChild(card);
    });
}

// دالة تشغيل الفيديو (مع إعدادات منع التقطيع)
function playStream(url, name) {
    currentChannelName.textContent = `يتم العرض الآن: ${name}`;

    if (hls) {
        hls.destroy();
    }

    if (Hls.isSupported()) {
        // ==========================================
        // 🟢 إعدادات منع التقطيع (Anti-Buffering) 
        // ==========================================
        const hlsConfig = {
            maxBufferLength: 30, // تحميل 30 ثانية من البث مسبقاً لتفادي تقطيع الإنترنت
            maxMaxBufferLength: 600, // الحد الأقصى لتخزين الفيديو المؤقت
            maxBufferSize: 60 * 1000 * 1000, // السماح بحجز ذاكرة تصل لـ 60 ميجابايت للبث
            liveSyncDurationCount: 3, // تأخير البث ثواني معدودة لضمان الاستقرار
            enableWorker: true, // تسريع المعالجة عبر الـ Web Workers
            lowLatencyMode: false // إيقاف وضع الزمن المنخفض لضمان عدم التقطيع
        };

        hls = new Hls(hlsConfig);
        hls.loadSource(url);
        hls.attachMedia(videoElement);
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
            videoElement.play();
        });
        
        hls.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal) {
                console.error("HLS Error:", data);
            }
        });
    } 
    else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        videoElement.src = url;
        videoElement.addEventListener('loadedmetadata', function () {
            videoElement.play();
        });
    }
}

// ميزة البحث
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allChannels.filter(channel => channel.name.toLowerCase().includes(term));
    renderChannels(filtered);
});

// بدء التشغيل
fetchChannels();
