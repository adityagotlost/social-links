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
        if (link_type === 'embed' || link_type === 'spotify-song' || link_type === 'spotify-playlist') {
            finalEmbed = url;
            finalUrl = '#'; // Placeholder
        }

        const payload = {
            title, url: finalUrl, icon, is_active,
            thumbnail_url, link_type, embed_url: finalEmbed
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

    // Handle Settings Form
    document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const settings = {
            theme: document.getElementById('setting-theme').value,
            profile_name: document.getElementById('setting-profile_name').value,
            profile_img_url: document.getElementById('setting-profile_img_url').value,
            github_username: document.getElementById('setting-github_username').value,
            seo_title: document.getElementById('setting-seo_title').value,
            seo_description: document.getElementById('setting-seo_description').value,
            seo_image: document.getElementById('setting-seo_image').value
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
    loadSettings();
}

// Data Loaders
async function loadLinksAndAnalytics() {
    try {
        const res = await fetch('/api/admin/links');
        if (!res.ok) {
            if (res.status === 401) showLogin();
            return;
        }
        const links = await res.json();

        const linksTbody = document.getElementById('links-tbody');
        const analyticsTbody = document.getElementById('analytics-tbody');

        linksTbody.innerHTML = '';
        analyticsTbody.innerHTML = '';

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
        if (settings.github_username) document.getElementById('setting-github_username').value = settings.github_username;
        if (settings.seo_title) document.getElementById('setting-seo_title').value = settings.seo_title;
        if (settings.seo_description) document.getElementById('setting-seo_description').value = settings.seo_description;
        if (settings.seo_image) document.getElementById('setting-seo_image').value = settings.seo_image;

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

    if (type === 'spotify-song' || type === 'spotify-playlist') {
        urlLabel.textContent = 'Spotify URL';
        hint.textContent = "Paste standard Spotify link (e.g. open.spotify.com/track/...)";
    } else if (type === 'embed') {
        urlLabel.textContent = 'Embed URL (Youtube/etc.)';
        hint.textContent = "Paste iframe src link (e.g. youtube.com/embed/...)";
    } else {
        urlLabel.textContent = 'URL';
        hint.textContent = "";
    }
});
