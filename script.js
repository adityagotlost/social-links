// script.js
document.addEventListener("DOMContentLoaded", () => {
    loadSettings();
    loadLinks();
    setupContactForm();
    setupNewsletterForm();
    setupQRCode();
    setupThemeToggle();
    countVisit();
    loadGallery();
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

        // Custom CSS
        if (settings.custom_css) {
            document.getElementById('custom-css-block').textContent = settings.custom_css;
        }

        // Custom JS (Wait until document is loaded ideally, or just eval it)
        if (settings.custom_js) {
            try {
                const script = document.createElement('script');
                script.textContent = settings.custom_js;
                document.body.appendChild(script);
            } catch (e) { console.error('Custom JS Error', e); }
        }

        // Animated Background
        if (settings.animated_background && settings.animated_background !== 'none') {
            loadAnimatedBackground(settings.animated_background);
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

        // Create the element for a single link
        const createLinkElement = (link, index) => {
            const animDelay = `${index * 0.1}s`;

            if (link.link_type === 'folder') {
                const folderDiv = document.createElement('div');
                folderDiv.className = 'link-card folder-card';
                folderDiv.style.animationDelay = animDelay;
                folderDiv.style.display = 'block';
                folderDiv.style.padding = '0';
                folderDiv.dataset.id = link.id;

                const headerBtn = document.createElement('button');
                headerBtn.className = 'folder-header';
                headerBtn.style.width = '100%';
                headerBtn.style.padding = '18px 20px';
                headerBtn.style.display = 'flex';
                headerBtn.style.alignItems = 'center';
                headerBtn.style.justifyContent = 'space-between';
                headerBtn.style.background = 'transparent';
                headerBtn.style.border = 'none';
                headerBtn.style.color = 'inherit';
                headerBtn.style.fontFamily = 'inherit';
                headerBtn.style.fontSize = '1.1rem';
                headerBtn.style.fontWeight = '500';
                headerBtn.style.cursor = 'pointer';

                let iconHtml = link.icon ? `<i class="fa-solid fa-${link.icon.toLowerCase().replace(' ', '-')}"></i>` : `<i class="fa-solid fa-folder"></i>`;

                headerBtn.innerHTML = `
                    <div style="display:flex; align-items:center; gap:15px;">
                        <div class="icon-wrapper">${iconHtml}</div>
                        <span>${link.title}</span>
                    </div>
                    <i class="fa-solid fa-chevron-down folder-icon" style="transition: transform 0.3s;"></i>
                `;

                const contentDiv = document.createElement('div');
                contentDiv.className = 'folder-content';
                contentDiv.style.display = 'none';
                contentDiv.style.padding = '0 20px 20px 20px';
                contentDiv.style.flexDirection = 'column';
                contentDiv.style.gap = '15px';

                headerBtn.addEventListener('click', () => {
                    const isOpen = contentDiv.style.display === 'flex';
                    contentDiv.style.display = isOpen ? 'none' : 'flex';
                    headerBtn.querySelector('.folder-icon').style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                });

                folderDiv.appendChild(headerBtn);
                folderDiv.appendChild(contentDiv);
                return { el: folderDiv, contentDiv };

            } else if (link.link_type === 'embed' && link.embed_url) {
                const embedDiv = document.createElement('div');
                embedDiv.className = 'link-card embed-card';
                embedDiv.style.animationDelay = animDelay;
                embedDiv.innerHTML = `<iframe src="${link.embed_url}" width="100%" height="152" frameBorder="0" allowfullscreen="" loading="lazy"></iframe>`;
                return { el: embedDiv };
            } else if (link.link_type === 'spotify' && link.embed_url) {
                const embedDiv = document.createElement('div');
                embedDiv.className = 'link-card embed-card';
                embedDiv.style.animationDelay = animDelay;
                const isPlaylist = link.embed_url.includes('/playlist/') || link.embed_url.includes('/album/');
                embedDiv.innerHTML = `<iframe src="${link.embed_url}" width="100%" height="${isPlaylist ? '352' : '152'}" frameBorder="0" allowfullscreen="" loading="lazy" style="border-radius: 12px;"></iframe>`;
                return { el: embedDiv };
            } else {
                const a = document.createElement('a');
                a.href = link.url;
                a.className = `link-card ${link.icon ? link.icon.toLowerCase().replace(' ', '-') : 'default-link'}`;
                a.style.animationDelay = animDelay;
                a.target = "_blank";
                a.dataset.id = link.id;

                let iconHtml = `<div class="icon-wrapper"><i class="fa-solid fa-link"></i></div>`;
                if (link.thumbnail_url) {
                    iconHtml = `<img src="${link.thumbnail_url}" alt="${link.title}" class="link-thumbnail" />`;
                } else if (link.icon) {
                    let domain = '';
                    try { domain = new URL(link.url).hostname; } catch (e) { }
                    if (domain) {
                        iconHtml = `<div class="icon-wrapper"><img src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" alt="${link.title}" class="favicon-icon" /></div>`;
                    } else {
                        iconHtml = `<div class="icon-wrapper"><i class="fa-brands fa-${link.icon.toLowerCase().replace(/\s+/g, '-')}"></i></div>`;
                    }
                }

                a.innerHTML = `${iconHtml}<span class="link-text">${link.title}</span><i class="fa-solid fa-arrow-right arrow-icon"></i>`;
                a.addEventListener('click', () => fetch(`/api/click/${link.id}`, { method: 'POST' }));

                a.addEventListener('mousemove', (e) => {
                    const rect = a.getBoundingClientRect();
                    a.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
                    a.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
                });

                return { el: a };
            }
        };

        // Separate root links and child links
        const rootLinks = links.filter(l => !l.parent_id);
        const childLinks = links.filter(l => l.parent_id);

        rootLinks.forEach((link, idx) => {
            const { el, contentDiv } = createLinkElement(link, idx);
            container.appendChild(el);

            if (link.link_type === 'folder' && contentDiv) {
                // Find children
                const children = childLinks.filter(c => c.parent_id === link.id);
                children.forEach((child, childIdx) => {
                    const { el: childEl } = createLinkElement(child, childIdx);
                    // Reset animation delay for children so they appear immediately when opened
                    childEl.style.animationDelay = '0s';
                    childEl.style.animation = 'none';
                    childEl.style.opacity = '1';
                    childEl.style.transform = 'translateY(0)';
                    contentDiv.appendChild(childEl);
                });
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

// ===== GALLERY =====
async function loadGallery() {
    try {
        const res = await fetch('/api/gallery');
        if (!res.ok) return;
        const images = await res.json();

        if (images.length === 0) return;

        const container = document.getElementById('gallery-container');
        const wrapper = document.getElementById('gallery-wrapper');
        container.style.display = 'block';
        wrapper.innerHTML = '';

        images.forEach(img => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            slide.style.position = 'relative';
            slide.innerHTML = `<img src="${img.image_url}" style="width:100%; height:300px; object-fit:cover; border-radius: 14px;">
                               ${img.caption ? `<div style="position:absolute; bottom:0; left:0; width:100%; padding:15px; background:linear-gradient(transparent, rgba(0,0,0,0.8)); color:white; border-bottom-left-radius: 14px; border-bottom-right-radius: 14px; text-align:center;">${img.caption}</div>` : ''}`;
            wrapper.appendChild(slide);
        });

        if (typeof Swiper !== 'undefined') {
            new Swiper('.gallery-slider', {
                loop: false,
                autoplay: { delay: 3000, disableOnInteraction: false },
                pagination: { el: '.swiper-pagination', clickable: true },
                spaceBetween: 20
            });
        }
    } catch (e) { }
}

// ===== ANIMATED BACKGROUNDS =====
function loadAnimatedBackground(type) {
    if (type === 'none') return;

    const bgContainer = document.getElementById('animated-bg');
    bgContainer.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    bgContainer.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    function resize() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    if (type === 'particles' || type === 'orbs') {
        const particles = [];
        const count = type === 'orbs' ? 30 : 100;
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vy: (Math.random() - 0.5) * (type === 'orbs' ? 0.8 : 2),
                vx: (Math.random() - 0.5) * (type === 'orbs' ? 0.8 : 2),
                size: (Math.random() * (type === 'orbs' ? 80 : 3)) + 1,
                alpha: Math.random() * (type === 'orbs' ? 0.3 : 0.6)
            });
        }
        function drawParticles() {
            if (!document.getElementById('animated-bg')) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.y < -p.size) p.y = canvas.height + p.size;
                if (p.y > canvas.height + p.size) p.y = -p.size;
                if (p.x < -p.size) p.x = canvas.width + p.size;
                if (p.x > canvas.width + p.size) p.x = -p.size;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

                if (type === 'orbs') {
                    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                    grd.addColorStop(0, `rgba(255, 255, 255, ${p.alpha})`);
                    grd.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    ctx.fillStyle = grd;
                    ctx.fill();
                } else {
                    ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
                    ctx.fill();
                }
            });
            requestAnimationFrame(drawParticles);
        }
        drawParticles();
    } else if (type === 'matrix') {
        const chars = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789".split("");
        const fontSize = 16;
        const columns = canvas.width / fontSize;
        const drops = [];
        for (let x = 0; x < columns; x++) drops[x] = 1;

        function drawMatrix() {
            if (!document.getElementById('animated-bg')) return;
            ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#0F0";
            ctx.font = fontSize + "px monospace";

            for (let i = 0; i < drops.length; i++) {
                const text = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
            requestAnimationFrame(drawMatrix);
        }
        drawMatrix();
    }
}

