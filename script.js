// script.js
document.addEventListener("DOMContentLoaded", () => {
    loadSettings();
    loadLinks();
    setupContactForm();
    setupNewsletterForm();
    setupQRCode();
    setupThemeToggle();
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

        // Apply Font Family
        if (settings.font_family) {
            document.documentElement.style.setProperty('--font-family', `"${settings.font_family}", sans-serif`);
        }

        // Profile Details
        if (settings.profile_name) document.getElementById('profile-name').textContent = settings.profile_name;
        if (settings.profile_img_url) document.getElementById('profile-img').src = settings.profile_img_url;

        // Bio & Typwriter Taglines
        if (settings.bio) document.getElementById('profile-bio').textContent = settings.bio;
        if (settings.taglines) {
            const taglineArray = settings.taglines.split(',').map(s => s.trim());
            startTypewriter(taglineArray);
        }

        // Skills
        if (settings.skills) {
            const skillsContainer = document.getElementById('skills-container');
            skillsContainer.innerHTML = '';
            settings.skills.split(',').forEach(skill => {
                const span = document.createElement('span');
                span.className = 'skill-badge';
                span.textContent = skill.trim();
                skillsContainer.appendChild(span);
            });
        }

        // Status
        if (settings.status) {
            const badge = document.getElementById('status-badge');
            document.getElementById('status-text').textContent = settings.status;
            badge.style.display = 'inline-flex';
        }

        // Tip Jar
        const tipJarContainer = document.getElementById('tip-jar-container');
        if (tipJarContainer && settings.tip_jar_active === 'true' && settings.tip_jar_url) {
            document.getElementById('tip-jar-text').textContent = settings.tip_jar_text || 'Buy me a coffee';
            document.getElementById('tip-jar-link').href = settings.tip_jar_url;
            tipJarContainer.style.display = 'block';
        }

        // Newsletter
        const newsletterSection = document.getElementById('newsletter-section');
        if (newsletterSection && settings.newsletter_active === 'true') {
            if (settings.newsletter_title) {
                document.getElementById('newsletter-title').textContent = settings.newsletter_title;
            }
            newsletterSection.style.display = 'block';
        }

        // Save settings globally for social footer rendering
        window.appSettings = settings;

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
            } else if (link.link_type === 'spotify' && link.embed_url) {
                // Render Spotify IFrame container
                const embedDiv = document.createElement('div');
                embedDiv.className = 'link-card embed-card';
                embedDiv.style.animationDelay = animDelay;
                // Automatically determine height based on URL type
                const isPlaylist = link.embed_url.includes('/playlist/') || link.embed_url.includes('/album/');
                const spotifyHeight = isPlaylist ? "352" : "152";
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

        // After links are loaded, render the social footer if enabled
        renderSocialFooter(links);

    } catch (err) {
        container.innerHTML = '<div style="color: red; text-align: center;">Error loading links.</div>';
    }
}

// ===== TYPEWRITER ANIMATION =====
function startTypewriter(taglines) {
    const el = document.getElementById('typing-tagline');
    if (!el || !taglines.length) return;

    let taglineIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typeSpeed = 100;

    function type() {
        const currentTagline = taglines[taglineIndex];

        if (isDeleting) {
            el.textContent = currentTagline.substring(0, charIndex - 1);
            charIndex--;
            typeSpeed = 50;
        } else {
            el.textContent = currentTagline.substring(0, charIndex + 1);
            charIndex++;
            typeSpeed = 100;
        }

        if (!isDeleting && charIndex === currentTagline.length) {
            isDeleting = true;
            typeSpeed = 2000; // Pause at end
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            taglineIndex = (taglineIndex + 1) % taglines.length;
            typeSpeed = 500;
        }

        setTimeout(type, typeSpeed);
    }

    type();
}

// ===== THEME TOGGLE (LIGHT/DARK) =====
function setupThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    // Check saved preference
    if (localStorage.getItem('preferred-mode') === 'light') {
        document.body.classList.add('light-mode');
        btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    btn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('preferred-mode', isLight ? 'light' : 'dark');
        btn.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    });
}

// ===== SOCIAL FOOTER =====
function renderSocialFooter(links) {
    const footer = document.getElementById('social-footer');
    if (!footer) return;

    // Only show if setting is enabled
    if (!window.appSettings || window.appSettings.show_social_footer === 'false') {
        footer.style.display = 'none';
        return;
    }

    footer.innerHTML = '';

    // Map of common icons for the footer
    const iconMap = {
        'instagram': 'fa-brands fa-instagram',
        'snapchat': 'fa-brands fa-snapchat',
        'twitter': 'fa-brands fa-x-twitter',
        'github': 'fa-brands fa-github',
        'linkedin': 'fa-brands fa-linkedin',
        'youtube': 'fa-brands fa-youtube',
        'discord': 'fa-brands fa-discord',
        'reddit': 'fa-brands fa-reddit',
        'pinterest': 'fa-brands fa-pinterest',
        'facebook': 'fa-brands fa-facebook',
        'tiktok': 'fa-brands fa-tiktok',
        'twitch': 'fa-brands fa-twitch',
        'spotify': 'fa-brands fa-spotify'
    };

    links.forEach(link => {
        if (link.link_type !== 'link') return; // Skip embeds in footer

        const lowerTitle = link.title.toLowerCase();
        let iconClass = 'fa-solid fa-link';

        // Check if title matches any key in iconMap
        for (const [key, value] of Object.entries(iconMap)) {
            if (lowerTitle.includes(key)) {
                iconClass = value;
                break;
            }
        }

        const a = document.createElement('a');
        a.href = link.url;
        a.className = 'social-icon';
        a.target = '_blank';
        a.title = link.title;
        a.innerHTML = `<i class="${iconClass}"></i>`;
        footer.appendChild(a);
    });

    if (footer.children.length === 0) {
        footer.style.display = 'none';
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

function setupNewsletterForm() {
    const form = document.getElementById('newsletter-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('newsletter-submit');
        const responseDiv = document.getElementById('newsletter-response');

        btn.disabled = true;
        btn.innerHTML = '<span class="btn-text">Wait...</span> <i class="fa-solid fa-spinner fa-spin"></i>';

        const email = document.getElementById('newsletter-email').value;

        try {
            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                responseDiv.innerHTML = `<span style="color: #4CAF50;"><i class="fa-solid fa-check-circle"></i> ${data.message}</span>`;
                form.reset();
            } else {
                responseDiv.innerHTML = `<span style="color: #F44336;"><i class="fa-solid fa-circle-exclamation"></i> ${data.error || 'Failed to subscribe.'}</span>`;
            }
        } catch (err) {
            responseDiv.innerHTML = `<span style="color: #F44336;"><i class="fa-solid fa-circle-exclamation"></i> Network error occurred.</span>`;
        }

        btn.disabled = false;
        btn.innerHTML = '<span class="btn-text">Subscribe</span>';

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

