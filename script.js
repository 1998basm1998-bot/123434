const videoElement = document.getElementById('tv-player');
const channelsListElement = document.getElementById('channels-list');
const currentChannelName = document.getElementById('current-channel-name');
const searchInput = document.getElementById('search-input');

let allChannels = [];
let hls = null;

// رابط قائمة القنوات العربية من مشروع iptv-org
// (يمكنك تغييره إلى رابط العراق iq.m3u أو غيره)
const PLAYLIST_URL = 'http://رابط-السيرفر-المدفوع-الخاص-بك.m3u';

// 1. دالة لجلب البيانات
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

// 2. دالة لتحليل ملف m3u وتحويله إلى كائنات برمجية (Objects)
function parseM3U(m3u) {
    const lines = m3u.split('\n');
    const channels = [];
    let currentChannel = {};

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // استخراج بيانات القناة (اللوجو والاسم)
        if (line.startsWith('#EXTINF:')) {
            // البحث عن رابط الشعار
            const logoMatch = line.match(/tvg-logo="([^"]+)"/);
            currentChannel.logo = logoMatch && logoMatch[1] ? logoMatch[1] : 'https://via.placeholder.com/50?text=TV';

            // البحث عن اسم القناة (بعد آخر فاصلة)
            const splitByComma = line.split(',');
            currentChannel.name = splitByComma[splitByComma.length - 1].trim();
        } 
        // استخراج رابط البث
        else if (line.startsWith('http')) {
            currentChannel.url = line;
            // حفظ القناة وتفريغ الكائن للقناة التالية
            channels.push(currentChannel);
            currentChannel = {}; 
        }
    }
    return channels;
}

// 3. دالة لعرض القنوات في الواجهة
function renderChannels(channels) {
    channelsListElement.innerHTML = ''; // مسح علامة "جاري التحميل"

    if (channels.length === 0) {
        channelsListElement.innerHTML = '<div class="loading">لم يتم العثور على قنوات.</div>';
        return;
    }

    channels.forEach(channel => {
        // إنشاء بطاقة القناة
        const card = document.createElement('div');
        card.className = 'channel-card';
        card.innerHTML = `
            <img src="${channel.logo}" alt="${channel.name} logo" onerror="this.src='https://via.placeholder.com/50?text=TV'">
            <h3>${channel.name}</h3>
        `;
        
        // حدث عند النقر على القناة
        card.addEventListener('click', () => {
            playStream(channel.url, channel.name);
        });

        channelsListElement.appendChild(card);
    });
}

// 4. دالة تشغيل الفيديو باستخدام Hls.js
function playStream(url, name) {
    currentChannelName.textContent = `يتم العرض الآن: ${name}`;

    // إيقاف البث القديم إذا كان موجوداً
    if (hls) {
        hls.destroy();
    }

    if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(videoElement);
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
            videoElement.play();
        });
        
        // معالجة الأخطاء إذا توقف البث
        hls.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal) {
                console.error("HLS Error:", data);
            }
        });
    } 
    // للمتصفحات التي تدعم hls مباشرة مثل Safari
    else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        videoElement.src = url;
        videoElement.addEventListener('loadedmetadata', function () {
            videoElement.play();
        });
    }
}

// 5. ميزة البحث في القنوات
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allChannels.filter(channel => channel.name.toLowerCase().includes(term));
    renderChannels(filtered);
});

// بدء جلب البيانات عند تشغيل الصفحة
fetchChannels();
