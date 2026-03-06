// script.js
document.addEventListener("DOMContentLoaded", () => {
    loadSettings();
    loadLinks();
    setupContactForm();
    setupQRCode();
    countVisit();
    pollSpotify();
    setInterval(pollSpotify, 30000);
});

async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        const settings = await response.json();

        // Apply Theme
        if (settings.theme && settings.theme !== 'default') {
            document.body.classList.add(`theme-${settings.theme}`);
        }

        // GitHub Stats
        if (settings.github_username) {
            const widget = document.getElementById('github-widget');
            const img = document.getElementById('github-stats-img');
            img.src = `https://github-readme-stats.vercel.app/api?username=${encodeURIComponent(settings.github_username)}&show_icons=true&theme=radical&hide_border=true&bg_color=00000000&text_color=ffffff&title_color=ff6eff&icon_color=00eeff`;
            widget.style.display = 'block';
        }
    } catch (e) {
        console.error("Failed to load settings", e);
    }
}

async function loadLinks() {
    const container = document.getElementById('links-container');
    try {
        const response = await fetch('/api/links');
        const links = await response.json();

        container.innerHTML = '';

        links.forEach((link, index) => {
            // Apply animation delay for staggered entrance
            const animDelay = `${index * 0.1}s`;

            if (link.link_type === 'embed' && link.embed_url) {
                // Render Generic IFrame container
                const embedDiv = document.createElement('div');
                embedDiv.className = 'link-card embed-card';
                embedDiv.style.animationDelay = animDelay;
                embedDiv.innerHTML = `
                    <iframe src="${link.embed_url}" 
                            width="100%" height="152" frameBorder="0" allowfullscreen="" 
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                            loading="lazy"></iframe>
                `;
                container.appendChild(embedDiv);
            } else if ((link.link_type === 'spotify-song' || link.link_type === 'spotify-playlist') && link.embed_url) {
                // Render Spotify IFrame container
                const embedDiv = document.createElement('div');
                embedDiv.className = 'link-card embed-card';
                embedDiv.style.animationDelay = animDelay;
                const spotifyHeight = link.link_type === 'spotify-playlist' ? "352" : "152";
                embedDiv.innerHTML = `
                    <iframe src="${link.embed_url}" 
                            width="100%" height="${spotifyHeight}" frameBorder="0" allowfullscreen="" 
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                            loading="lazy" style="border-radius: 12px;"></iframe>
                `;
                container.appendChild(embedDiv);
            } else {
                // Standard Link Button
                const a = document.createElement('a');
                a.href = link.url;
                a.className = `link-card ${link.icon ? link.icon.toLowerCase().replace(' ', '-') : 'default-link'}`;
                a.style.animationDelay = animDelay;
                a.target = "_blank"; // open in new tab
                a.dataset.id = link.id;

                let iconHtml = '';
                if (link.thumbnail_url) {
                    iconHtml = `<img src="${link.thumbnail_url}" alt="${link.title}" class="link-thumbnail" />`;
                } else if (link.icon) {
                    // Try the FontAwesome brand icon; if it doesn't exist it silently fails
                    // So we always layer a Google favicon fallback behind it
                    const iconName = link.icon.toLowerCase().replace(/\s+/g, '-');
                    // Extract domain from URL for favicon
                    let faviconDomain = '';
                    try {
                        faviconDomain = new URL(link.url).hostname;
                    } catch (e) { }

                    if (faviconDomain) {
                        // Use Google's favicon CDN as the icon image (always has the real logo)
                        iconHtml = `<div class="icon-wrapper"><img src="https://www.google.com/s2/favicons?domain=${faviconDomain}&sz=64" alt="${link.title}" class="favicon-icon" /></div>`;
                    } else {
                        iconHtml = `<div class="icon-wrapper"><i class="fa-brands fa-${iconName}"></i></div>`;
                    }
                } else {
                    iconHtml = `<div class="icon-wrapper"><i class="fa-solid fa-link"></i></div>`;
                }

                a.innerHTML = `
                    ${iconHtml}
                    <span class="link-text">${link.title}</span>
                    <i class="fa-solid fa-arrow-right arrow-icon"></i>
                `;

                // Re-attach subtle mouse tracking
                a.addEventListener('mousemove', (e) => {
                    const rect = a.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    a.style.setProperty('--mouse-x', `${x}px`);
                    a.style.setProperty('--mouse-y', `${y}px`);
                });

                // Handle click tracking
                a.addEventListener('click', (e) => {
                    fetch(`/api/click/${link.id}`, { method: 'POST' });
                });

                container.appendChild(a);
            }
        });
    } catch (err) {
        container.innerHTML = '<div style="color: red; text-align: center;">Error loading links.</div>';
    }
}

function setupContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('contact-submit');
        const responseDiv = document.getElementById('contact-response');

        btn.disabled = true;
        btn.innerHTML = '<span class="btn-text">Sending...</span> <i class="fa-solid fa-spinner fa-spin"></i>';

        const formData = {
            name: document.getElementById('contact-name').value,
            email: document.getElementById('contact-email').value,
            message: document.getElementById('contact-message').value
        };

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (data.success) {
                responseDiv.innerHTML = `<span style="color: #4CAF50;"><i class="fa-solid fa-check-circle"></i> ${data.message}</span>`;
                form.reset();
            } else {
                responseDiv.innerHTML = `<span style="color: #F44336;"><i class="fa-solid fa-circle-exclamation"></i> ${data.error}</span>`;
            }
        } catch (err) {
            responseDiv.innerHTML = `<span style="color: #F44336;"><i class="fa-solid fa-circle-exclamation"></i> Network error occurred.</span>`;
        }

        btn.disabled = false;
        btn.innerHTML = '<span class="btn-text">Send Message</span> <i class="fa-solid fa-paper-plane"></i>';

        setTimeout(() => { responseDiv.innerHTML = ''; }, 5000);
    });
}

function setupQRCode() {
    const qrBtn = document.getElementById('qr-btn');
    const qrModal = document.getElementById('qr-modal');
    const qrClose = document.getElementById('qr-close');
    const qrContainer = document.getElementById('qrcode');
    let qrCreated = false;

    if (!qrBtn || !qrModal || !qrClose || !qrContainer) return;

    qrBtn.addEventListener('click', () => {
        qrModal.style.display = 'block';
        if (!qrCreated) {
            new QRCode(qrContainer, {
                text: window.location.href,
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            qrCreated = true;
        }
    });

    qrClose.addEventListener('click', () => {
        qrModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === qrModal) {
            qrModal.style.display = 'none';
        }
    });
}

// ===== VISITOR COUNTER =====
async function countVisit() {
    try {
        const res = await fetch('/api/visit', { method: 'POST' });
        const data = await res.json();
        const el = document.getElementById('visitor-counter');
        if (el && data.count) {
            el.textContent = `👁 ${data.count.toLocaleString()} visits`;
        }
    } catch (e) { }
}

// ===== SPOTIFY NOW PLAYING =====
async function pollSpotify() {
    try {
        const res = await fetch('/api/spotify/now-playing');
        const track = await res.json();
        const widget = document.getElementById('spotify-widget');

        if (track.playing && track.name) {
            document.getElementById('spotify-link').href = track.url || '#';
            document.getElementById('spotify-art').src = track.albumArt || '';
            document.getElementById('spotify-track').textContent = track.name;
            document.getElementById('spotify-artist').textContent = track.artist;

            const pct = track.duration ? (track.progress / track.duration) * 100 : 0;
            document.getElementById('spotify-progress').style.width = pct + '%';

            widget.style.display = 'block';
        } else {
            if (widget) widget.style.display = 'none';
        }
    } catch (e) { }
}

// (cursor and hover preview features removed)

