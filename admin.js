document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();

    // Setup Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });

    // Login Form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                showDashboard();
            } else {
                errorDiv.textContent = data.error || 'Login failed';
            }
        } catch (err) {
            errorDiv.textContent = 'Network error connecting to server.';
        }
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        showLogin();
    });

    // Link Form Submit
    document.getElementById('link-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('link-id').value;
        const title = document.getElementById('link-title').value;
        const url = document.getElementById('link-url').value;
        const icon = document.getElementById('link-icon').value;
        const is_active = document.getElementById('link-active').checked;
        const link_type = document.getElementById('link-type').value;
        const thumbnail_url = document.getElementById('link-thumbnail').value;

        // If embed type, use the url as embed_url
        let finalUrl = url;
        let finalEmbed = null;
        if (link_type === 'folder') {
            finalUrl = '#'; // Parent folder has no real link
        } else if (link_type === 'embed' || link_type === 'spotify') {
            finalEmbed = url;
            finalUrl = '#'; // Placeholder
        }

        const parent_id = document.getElementById('link-parent-id').value || null;

        const payload = {
            title, url: finalUrl, icon, is_active,
            thumbnail_url, link_type, embed_url: finalEmbed, parent_id
        };
        const method = id ? 'PUT' : 'POST';
        const endpoint = id ? `/api/admin/links/${id}` : '/api/admin/links';

        try {
            const res = await fetch(endpoint, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                closeModal();
                loadLinksAndAnalytics();
            } else {
                alert('Error saving link');
            }
        } catch (err) {
            alert('Network error');
        }
    });

    // Handle File Uploads
    const handleUpload = async (fileInput, targetInputId) => {
        const file = fileInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById(targetInputId).value = data.url;
            } else {
                alert('Upload failed: ' + data.error);
            }
        } catch (err) {
            alert('Upload error');
        }
    };

    document.getElementById('thumbnail-upload').addEventListener('change', function () {
        handleUpload(this, 'link-thumbnail');
    });

    document.getElementById('seo-file-upload').addEventListener('change', function () {
        handleUpload(this, 'setting-seo_image');
    });

    document.getElementById('profile-img-upload').addEventListener('change', function () {
        handleUpload(this, 'setting-profile_img_url');
    });

    const galleryUploadBtn = document.getElementById('gallery-upload');
    if (galleryUploadBtn) {
        galleryUploadBtn.addEventListener('change', function () {
            handleUpload(this, 'gallery-image-url');
        });
    }

    // Handle Settings Form
    document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const settings = {
            theme: document.getElementById('setting-theme').value,
            profile_name: document.getElementById('setting-profile_name').value,
            profile_img_url: document.getElementById('setting-profile_img_url').value,
            bio: document.getElementById('setting-bio').value,
            taglines: document.getElementById('setting-taglines').value,
            skills: document.getElementById('setting-skills').value,
            status: document.getElementById('setting-status').value,
            show_social_footer: document.getElementById('setting-show_social_footer').value,
            font_family: document.getElementById('setting-font_family').value,
            newsletter_active: document.getElementById('setting-newsletter_active').value,
            newsletter_title: document.getElementById('setting-newsletter_title').value,
            tip_jar_active: document.getElementById('setting-tip_jar_active').value,
            tip_jar_text: document.getElementById('setting-tip_jar_text').value,
            tip_jar_url: document.getElementById('setting-tip_jar_url').value,
            seo_title: document.getElementById('setting-seo_title').value,
            seo_description: document.getElementById('setting-seo_description').value,
            seo_image: document.getElementById('setting-seo_image').value,
            animated_background: document.getElementById('setting-animated_background').value,
            custom_css: document.getElementById('setting-custom_css').value,
            custom_js: document.getElementById('setting-custom_js').value,
            banner_active: document.getElementById('setting-banner_active').value,
            banner_text: document.getElementById('setting-banner_text').value,
            banner_link: document.getElementById('setting-banner_link').value,
            banner_bg: document.getElementById('setting-banner_bg').value,
            banner_text_color: document.getElementById('setting-banner_text_color').value
        };

        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (res.ok) {
                alert('Settings saved!');
                document.body.className = ''; // reset classes
                if (settings.theme !== 'default') {
                    document.body.classList.add(`theme-${settings.theme}`);
                }
            }
        } catch (err) {
            alert('Error saving settings');
        }
    });

    const vcardForm = document.getElementById('vcard-form');
    if (vcardForm) {
        vcardForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const settings = {
                vcard_active: document.getElementById('setting-vcard_active').value,
                vcard_first_name: document.getElementById('setting-vcard_first_name').value,
                vcard_last_name: document.getElementById('setting-vcard_last_name').value,
                vcard_email: document.getElementById('setting-vcard_email').value,
                vcard_phone: document.getElementById('setting-vcard_phone').value,
                vcard_instagram: document.getElementById('setting-vcard_instagram').value,
                vcard_company: document.getElementById('setting-vcard_company').value,
                vcard_job_title: document.getElementById('setting-vcard_job_title').value,
                vcard_website: document.getElementById('setting-vcard_website').value,
                vcard_address: document.getElementById('setting-vcard_address').value
            };

            try {
                const res = await fetch('/api/admin/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settings)
                });
                if (res.ok) {
                    const msg = document.getElementById('vcard-save-msg');
                    msg.style.display = 'block';
                    setTimeout(() => msg.style.display = 'none', 3000);
                } else {
                    alert('Error saving vCard settings');
                }
            } catch (err) {
                alert('Error saving vCard settings');
            }
        });
    }

});

async function checkLoginStatus() {
    try {
        const res = await fetch('/api/admin/status');
        const data = await res.json();
        if (data.loggedIn) {
            showDashboard();
        } else {
            showLogin();
        }
    } catch {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('login-container').style.display = 'block';
    document.getElementById('dashboard-container').style.display = 'none';
}

function showDashboard() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'block';
    loadLinksAndAnalytics().then(() => initSortable());
    loadMessages();
    loadSubscribers();
    loadSettings();
    loadGallery();
    loadChart();
    loadVisitorCharts();
}

let allLinksData = [];

// Data Loaders
async function loadLinksAndAnalytics() {
    try {
        const res = await fetch('/api/admin/links');
        if (!res.ok) {
            if (res.status === 401) showLogin();
            return;
        }
        const links = await res.json();
        allLinksData = links; // Store globally

        const linksTbody = document.getElementById('links-tbody');
        const analyticsTbody = document.getElementById('analytics-tbody');

        linksTbody.innerHTML = '';
        analyticsTbody.innerHTML = '';

        // Update the parent link dropdown for folders
        const parentSelect = document.getElementById('link-parent-id');
        const oldParentValue = parentSelect.value;
        parentSelect.innerHTML = '<option value="">-- None --</option>';
        links.filter(l => l.link_type === 'folder').forEach(folder => {
            const opt = document.createElement('option');
            opt.value = folder.id;
            opt.textContent = folder.title;
            parentSelect.appendChild(opt);
        });
        parentSelect.value = oldParentValue;

        links.forEach(link => {
            // Links Table Row
            const tr = document.createElement('tr');
            tr.dataset.id = link.id; // required for Sortable
            tr.innerHTML = `
                <td>
                    <i class="fa-solid fa-grip-vertical handle" style="cursor:grab; margin-right:10px; color:var(--text-muted);" title="Drag to reorder"></i>
                    ${link.display_order}
                </td>
                <td><i class="fa-brands fa-${link.icon.toLowerCase().replace(' ', '-')}"></i> ${link.icon}</td>
                <td><strong>${link.title}</strong></td>
                <td><a href="${link.url}" target="_blank" style="color:var(--primary);">${link.url}</a></td>
                <td>
                    <span class="status-badge ${link.is_active ? 'status-active' : 'status-inactive'}">
                        ${link.is_active ? 'Active' : 'Hidden'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick='editLink(${JSON.stringify(link).replace(/'/g, "&#39;")})'>Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteLink(${link.id})">Delete</button>
                </td>
            `;
            linksTbody.appendChild(tr);

            // Analytics Table Row
            const trA = document.createElement('tr');
            trA.innerHTML = `
                <td><strong>${link.title}</strong></td>
                <td><span style="font-size:1.2rem; font-weight:bold; color:var(--primary);">${link.clicks}</span> total clicks</td>
            `;
            analyticsTbody.appendChild(trA);
        });

    } catch (err) {
        console.error('Failed to load links:', err);
    }
}

// Initialize Sortable outside to avoid multiple instances, but refresh the hook.
let sortableInstance = null;
function initSortable() {
    const linksTbody = document.getElementById('links-tbody');
    if (sortableInstance) sortableInstance.destroy();
    if (!linksTbody) return;

    // Check if Sortable is loaded from CDN
    if (typeof Sortable !== 'undefined') {
        sortableInstance = Sortable.create(linksTbody, {
            handle: '.handle',
            animation: 150,
            onEnd: async function () {
                // Read current order of IDs
                const rows = Array.from(linksTbody.querySelectorAll('tr'));
                const orderedIds = rows.map(r => parseInt(r.dataset.id));

                // Save new order to backend
                try {
                    const res = await fetch('/api/admin/links/reorder', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderedIds })
                    });
                    if (res.ok) {
                        // Re-fetch to update visual 'Order' numbers smoothly
                        loadLinksAndAnalytics();
                    } else {
                        alert('Failed to save link order.');
                    }
                } catch (err) {
                    alert('Network error while saving order.');
                }
            }
        });
    }
}

async function loadMessages() {
    try {
        const res = await fetch('/api/admin/messages');
        if (!res.ok) return;
        const messages = await res.json();

        const container = document.getElementById('messages-list');
        container.innerHTML = '';

        if (messages.length === 0) {
            container.innerHTML = '<p>No messages yet.</p>';
            return;
        }

        messages.forEach(msg => {
            const date = new Date(msg.created_at).toLocaleString();
            const div = document.createElement('div');
            div.className = 'message-card';
            div.innerHTML = `
                <div class="msg-header">
                    <div class="msg-name">${msg.name}</div>
                    <div class="msg-email"><a href="mailto:${msg.email}">${msg.email}</a></div>
                    <span class="msg-date">${date}</span>
                </div>
                <div class="msg-body">${msg.message.replace(/\n/g, '<br>')}</div>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error('Failed to load messages:', err);
    }
}

async function loadSubscribers() {
    try {
        const res = await fetch('/api/admin/subscribers');
        if (!res.ok) return;
        const subscribers = await res.json();

        const tbody = document.getElementById('subscribers-tbody');
        tbody.innerHTML = '';

        if (subscribers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No subscribers yet.</td></tr>';
            return;
        }

        subscribers.forEach(sub => {
            const date = new Date(sub.created_at).toLocaleString();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${sub.email}</strong></td>
                <td>${date}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteSubscriber(${sub.id})">Remove</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load subscribers:', err);
    }
}

window.deleteSubscriber = async function (id) {
    if (confirm('Are you sure you want to remove this subscriber?')) {
        try {
            const res = await fetch(`/api/admin/subscribers/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadSubscribers();
            } else {
                alert('Failed to delete subscriber.');
            }
        } catch (err) {
            alert('Network error while deleting subscriber.');
        }
    }
};

async function loadSettings() {
    try {
        const res = await fetch('/api/settings');
        if (!res.ok) return;
        const settings = await res.json();

        if (settings.theme) {
            document.getElementById('setting-theme').value = settings.theme;
            document.body.className = ''; // reset classes
            if (settings.theme !== 'default') {
                document.body.classList.add(`theme-${settings.theme}`);
            }
        }
        if (settings.profile_name) document.getElementById('setting-profile_name').value = settings.profile_name;
        if (settings.profile_img_url) document.getElementById('setting-profile_img_url').value = settings.profile_img_url;
        if (settings.bio) document.getElementById('setting-bio').value = settings.bio;
        if (settings.taglines) document.getElementById('setting-taglines').value = settings.taglines;
        if (settings.skills) document.getElementById('setting-skills').value = settings.skills;
        if (settings.status) document.getElementById('setting-status').value = settings.status;
        if (settings.show_social_footer) document.getElementById('setting-show_social_footer').value = settings.show_social_footer;
        if (settings.font_family) document.getElementById('setting-font_family').value = settings.font_family;
        if (settings.newsletter_active) document.getElementById('setting-newsletter_active').value = settings.newsletter_active;
        if (settings.newsletter_title) document.getElementById('setting-newsletter_title').value = settings.newsletter_title;
        if (settings.tip_jar_active) document.getElementById('setting-tip_jar_active').value = settings.tip_jar_active;
        if (settings.tip_jar_text) document.getElementById('setting-tip_jar_text').value = settings.tip_jar_text;
        if (settings.tip_jar_url) document.getElementById('setting-tip_jar_url').value = settings.tip_jar_url;
        if (settings.seo_title) document.getElementById('setting-seo_title').value = settings.seo_title;
        if (settings.seo_description) document.getElementById('setting-seo_description').value = settings.seo_description;
        if (settings.seo_image) document.getElementById('setting-seo_image').value = settings.seo_image;
        if (settings.animated_background) document.getElementById('setting-animated_background').value = settings.animated_background;
        if (settings.custom_css) document.getElementById('setting-custom_css').value = settings.custom_css;
        if (settings.custom_js) document.getElementById('setting-custom_js').value = settings.custom_js;
        if (settings.vcard_active) document.getElementById('setting-vcard_active').value = settings.vcard_active;
        if (settings.vcard_first_name) document.getElementById('setting-vcard_first_name').value = settings.vcard_first_name;
        if (settings.vcard_last_name) document.getElementById('setting-vcard_last_name').value = settings.vcard_last_name;
        if (settings.vcard_email) document.getElementById('setting-vcard_email').value = settings.vcard_email;
        if (settings.vcard_phone) document.getElementById('setting-vcard_phone').value = settings.vcard_phone;
        if (settings.vcard_instagram) document.getElementById('setting-vcard_instagram').value = settings.vcard_instagram;
        if (settings.vcard_company) document.getElementById('setting-vcard_company').value = settings.vcard_company;
        if (settings.vcard_job_title) document.getElementById('setting-vcard_job_title').value = settings.vcard_job_title;
        if (settings.vcard_website) document.getElementById('setting-vcard_website').value = settings.vcard_website;
        if (settings.vcard_address) document.getElementById('setting-vcard_address').value = settings.vcard_address;
        if (settings.banner_active) document.getElementById('setting-banner_active').value = settings.banner_active;
        if (settings.banner_text) document.getElementById('setting-banner_text').value = settings.banner_text;
        if (settings.banner_link) document.getElementById('setting-banner_link').value = settings.banner_link;
        if (settings.banner_bg) document.getElementById('setting-banner_bg').value = settings.banner_bg;
        if (settings.banner_text_color) document.getElementById('setting-banner_text_color').value = settings.banner_text_color;

    } catch (err) {
        console.error('Failed to load settings:', err);
    }
}

// Link Actions
window.editLink = function (link) {
    document.getElementById('modal-title').textContent = 'Edit Link';
    document.getElementById('link-id').value = link.id;
    document.getElementById('link-title').value = link.title;

    // Reverse logic from save: if embed/spotify, show embed_url in the URL field
    document.getElementById('link-url').value = (link.link_type === 'embed' || link.link_type.startsWith('spotify')) ? link.embed_url : link.url;

    document.getElementById('link-icon').value = link.icon;
    document.getElementById('link-active').checked = link.is_active === 1;
    document.getElementById('link-type').value = link.link_type || 'standard';
    document.getElementById('link-parent-id').value = link.parent_id || '';

    // Trigger change event to update the URL label
    const event = new Event('change');
    document.getElementById('link-type').dispatchEvent(event);

    document.getElementById('link-thumbnail').value = link.thumbnail_url || '';

    document.getElementById('link-modal').style.display = 'block';
};

window.deleteLink = async function (id) {
    if (confirm('Are you sure you want to delete this link?')) {
        try {
            const res = await fetch(`/api/admin/links/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadLinksAndAnalytics().then(() => initSortable());
            } else {
                const data = await res.json();
                alert('Failed to delete: ' + (data.error || res.statusText));
            }
        } catch (err) {
            alert('Network error while deleting link.');
        }
    }
};

// Modal handlers
window.openModal = function () {
    document.getElementById('modal-title').textContent = 'Add Link';
    document.getElementById('link-form').reset();
    document.getElementById('link-id').value = '';
    document.getElementById('link-parent-id').value = '';

    // Trigger change event to reset label
    const event = new Event('change');
    document.getElementById('link-type').dispatchEvent(event);

    document.getElementById('link-modal').style.display = 'block';
};

window.closeModal = function () {
    document.getElementById('link-modal').style.display = 'none';
};

// UI Dynamic Label Updates based on Link Type
document.getElementById('link-type').addEventListener('change', (e) => {
    const type = e.target.value;
    const urlLabel = document.querySelector('label[for="link-url"]') || document.getElementById('link-url').previousElementSibling;
    const hint = document.getElementById('url-hint');

    if (type === 'spotify') {
        urlLabel.textContent = 'Spotify URL';
        hint.textContent = "Paste standard Spotify link (e.g. open.spotify.com/track/... or open.spotify.com/playlist/...)";
        document.getElementById('parent-id-group').style.display = 'block';
    } else if (type === 'embed') {
        urlLabel.textContent = 'Embed URL (Youtube/etc.)';
        hint.textContent = "Paste iframe src link (e.g. youtube.com/embed/...)";
        document.getElementById('parent-id-group').style.display = 'block';
    } else if (type === 'folder') {
        urlLabel.textContent = 'Folder Name (Ignored)';
        hint.textContent = "Folders don't need a URL, they just contain other links.";
        document.getElementById('parent-id-group').style.display = 'none'; // Folders can't be inside folders for simplicity
    } else {
        urlLabel.textContent = 'URL';
        hint.textContent = "";
        document.getElementById('parent-id-group').style.display = 'block';
    }
});

// Gallery Functions
async function loadGallery() {
    try {
        const res = await fetch('/api/admin/gallery');
        if (!res.ok) return;
        const images = await res.json();

        const tbody = document.getElementById('gallery-tbody');
        tbody.innerHTML = '';

        images.forEach(img => {
            const tr = document.createElement('tr');
            tr.dataset.id = img.id;
            tr.innerHTML = `
                <td>
                    <i class="fa-solid fa-grip-vertical gallery-handle" style="cursor:grab; margin-right:10px; color:var(--text-muted);" title="Drag to reorder"></i>
                    ${img.display_order}
                </td>
                <td><img src="${img.image_url}" alt="${img.caption || ''}" style="height: 50px; border-radius: 5px;"></td>
                <td>${img.caption || '<em>None</em>'}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteGalleryImage(${img.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (images.length > 0 && typeof Sortable !== 'undefined') {
            Sortable.create(tbody, {
                handle: '.gallery-handle',
                animation: 150,
                onEnd: async function () {
                    const rows = Array.from(tbody.querySelectorAll('tr'));
                    const orderedIds = rows.map(r => parseInt(r.dataset.id));
                    try {
                        await fetch('/api/admin/gallery/reorder', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ orderedIds })
                        });
                        loadGallery(); // Refresh order numbers
                    } catch (err) { }
                }
            });
        }
    } catch (e) { }
}

window.openGalleryModal = function () {
    document.getElementById('gallery-form').reset();
    document.getElementById('gallery-modal').style.display = 'block';
};

window.closeGalleryModal = function () {
    document.getElementById('gallery-modal').style.display = 'none';
};

document.getElementById('gallery-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const image_url = document.getElementById('gallery-image-url').value;
    const caption = document.getElementById('gallery-caption').value;

    try {
        const res = await fetch('/api/admin/gallery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_url, caption })
        });
        if (res.ok) {
            closeGalleryModal();
            loadGallery();
        } else {
            alert('Failed to save image');
        }
    } catch (err) { }
});

window.deleteGalleryImage = async function (id) {
    if (confirm('Delete this image?')) {
        try {
            const res = await fetch('/api/admin/gallery/' + id, { method: 'DELETE' });
            if (res.ok) {
                loadGallery();
            }
        } catch (err) { }
    }
};

let dailyClicksChart;
async function loadChart() {
    try {
        const res = await fetch('/api/admin/analytics/daily');
        if (!res.ok) return;
        const data = await res.json();
        let labels = [];
        let clicks = [];

        if (data.length === 0) {
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                labels.push(d.toISOString().split('T')[0]);
                clicks.push(0);
            }
        } else {
            labels = data.map(d => d.date);
            clicks = data.map(d => d.clicks);
        }

        const ctx = document.getElementById('daily-clicks-chart').getContext('2d');
        if (dailyClicksChart) dailyClicksChart.destroy();

        dailyClicksChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Clicks',
                    data: clicks,
                    borderColor: '#4361ee',
                    backgroundColor: 'rgba(67, 97, 238, 0.2)',
                    borderWidth: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#4361ee',
                    pointRadius: 5,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    } catch (err) { }
}

let countriesChart, devicesChart;
async function loadVisitorCharts() {
    try {
        const res = await fetch('/api/admin/analytics/visitors');
        if (!res.ok) return;
        const data = await res.json();

        // Countries Chart
        const countryCtx = document.getElementById('countries-chart').getContext('2d');
        if (countriesChart) countriesChart.destroy();
        const countryColors = ['#4361ee', '#3a86ff', '#f72585', '#7209b7', '#4cc9f0', '#480ca8', '#b5179e', '#560bad', '#3f37c9', '#4895ef'];
        countriesChart = new Chart(countryCtx, {
            type: 'bar',
            data: {
                labels: data.countries.length > 0 ? data.countries.map(c => c.country) : ['No Data'],
                datasets: [{
                    label: 'Visits',
                    data: data.countries.length > 0 ? data.countries.map(c => c.visits) : [0],
                    backgroundColor: countryColors,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });

        // Devices Chart
        const deviceCtx = document.getElementById('devices-chart').getContext('2d');
        if (devicesChart) devicesChart.destroy();
        devicesChart = new Chart(deviceCtx, {
            type: 'doughnut',
            data: {
                labels: data.devices.length > 0 ? data.devices.map(d => d.device) : ['No Data'],
                datasets: [{
                    data: data.devices.length > 0 ? data.devices.map(d => d.visits) : [1],
                    backgroundColor: ['#4361ee', '#f72585', '#4cc9f0'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    } catch (err) { }
}
