require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const fs = require('fs');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { MongoStore } = require('connect-mongo');
const { 
    connectDB, Link, Gallery, Analytics, DailyAnalytics, VisitorLog, 
    Message, Subscriber, AnimeList, User, Setting 
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer for Cloudinary Uploads
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'social-links-uploads',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
    }
});
const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware for admin login
const sessionOptions = {
    secret: process.env.SESSION_SECRET || 'super-secret-key-12345',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 1 day
};
if (process.env.MONGODB_URI) {
    sessionOptions.store = MongoStore.create({ mongoUrl: process.env.MONGODB_URI });
}
app.use(session(sessionOptions));

// Setup static files to serve from current directory directly
const staticPaths = ['/admin.html', '/admin.js', '/admin.css', '/script.js', '/style.css'];
app.use(express.static(__dirname, {
    index: false // Disable serving index.html automatically
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Intercept index.html to inject SEO Meta Tags
app.get(['/', '/index.html'], async (req, res) => {
    try {
        let htmlPath = path.join(__dirname, 'index.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // Fetch SEO Settings from DB
        const settingsRows = await Setting.find({});
        const settings = {};
        settingsRows.forEach(r => settings[r.key] = r.value);

        const seoTitle = settings.seo_title || 'My Social Links';
        const seoDesc = settings.seo_description || 'Welcome to my corner of the internet!';
        const seoImage = settings.seo_image ? (settings.seo_image.startsWith('http') ? settings.seo_image : `http://${req.headers.host}${settings.seo_image}`) : '';

        // Inject Meta Tags before </head>
        const metaTags = `
            <meta property="og:title" content="${seoTitle}">
            <meta property="og:description" content="${seoDesc}">
            <meta property="og:image" content="${seoImage}">
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="${seoTitle}">
            <meta name="twitter:description" content="${seoDesc}">
            <meta name="twitter:image" content="${seoImage}">
            <title>${seoTitle}</title>
        `;

        // Very simple string replace
        htmlContent = htmlContent.replace(/<title>.*<\/title>/i, metaTags);

        res.send(htmlContent);
    } catch (err) {
        console.error("Error serving index.html:", err);
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

// ===== PUBLIC API ENDPOINTS =====

// Get all active links
app.get('/api/links', async (req, res) => {
    try {
        const links = await Link.find({ is_active: true }).sort('display_order');
        res.json(links.map(l => ({ ...l.toObject(), id: l._id })));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch links' });
    }
});

// Get public settings for themes
app.get('/api/settings', async (req, res) => {
    try {
        const settingsRows = await Setting.find({});
        const settings = {};
        settingsRows.forEach(r => settings[r.key] = r.value);
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Visitor Counter
app.post('/api/visit', async (req, res) => {
    try {
        const row = await Setting.findOne({ key: 'visit_count' });
        const currentCount = row ? parseInt(row.value) || 0 : 0;
        const newCount = currentCount + 1;
        await Setting.findOneAndUpdate({ key: 'visit_count' }, { value: String(newCount) }, { upsert: true });

        // Detect device type from User-Agent
        const ua = req.headers['user-agent'] || '';
        let device = 'Desktop';
        if (/mobile|android|iphone|ipod/i.test(ua)) device = 'Mobile';
        else if (/ipad|tablet/i.test(ua)) device = 'Tablet';

        // Get IP address
        const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
        const today = new Date().toISOString().split('T')[0];

        let country = 'Unknown';
        try {
            if (ip && ip !== '::1' && ip !== '127.0.0.1') {
                const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
                if (geoRes.ok) {
                    const geo = await geoRes.json();
                    country = geo.country_name || 'Unknown';
                }
            } else {
                country = 'Local';
            }
        } catch (e) { country = 'Unknown'; }

        // Log the visit
        await VisitorLog.create({ date: today, country, device });

        res.json({ count: newCount });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update visitor count' });
    }
});

// Record a click
app.post('/api/click/:id', async (req, res) => {
    const linkId = req.params.id;
    try {
        const link = await Link.findById(linkId);
        if (!link) return res.status(404).json({ error: 'Link not found' });

        const analytics = await Analytics.findOne({ link_id: linkId });

        if (analytics) {
            analytics.click_count += 1;
            analytics.last_clicked = new Date();
            await analytics.save();
        } else {
            await Analytics.create({ link_id: linkId, click_count: 1, last_clicked: new Date() });
        }

        // Add to daily analytics
        const today = new Date().toISOString().split('T')[0];
        const daily = await DailyAnalytics.findOne({ date: today, link_id: linkId });
        if (daily) {
            daily.clicks += 1;
            await daily.save();
        } else {
            await DailyAnalytics.create({ date: today, link_id: linkId, clicks: 1 });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to record click' });
    }
});

// Submit contact form
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    try {
        await Message.create({ name, email, message });

        // Send Gmail notification if credentials are configured
        if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_APP_PASSWORD
                }
            });
            await transporter.sendMail({
                from: `"Social Links" <${process.env.GMAIL_USER}>`,
                to: 'aiexpbyaditya@gmail.com',
                subject: `📩 New message from ${name} on your Social Links`,
                html: `
                    <div style="font-family:sans-serif; max-width:500px; margin:auto; padding:24px; background:#f9f9f9; border-radius:12px;">
                        <h2 style="color:#4361ee;">📬 New Contact Message</h2>
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                        <hr style="border:none; border-top:1px solid #eee; margin:16px 0;">
                        <p><strong>Message:</strong></p>
                        <p style="background:#fff; padding:16px; border-radius:8px; border:1px solid #eee;">${message.replace(/\n/g, '<br>')}</p>
                        <p style="color:#aaa; font-size:0.8rem; margin-top:16px;">Sent from your Social Links page</p>
                    </div>
                `
            });
        }

        res.json({ success: true, message: 'Message sent successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Subscribe to newsletter
app.post('/api/subscribe', async (req, res) => {
    const { email } = req.body;
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ error: 'Valid email is required' });
    }

    try {
        await Subscriber.create({ email });
        res.json({ success: true, message: 'Successfully subscribed!' });
    } catch (err) {
        if (err.code === 11000) {
            res.status(400).json({ error: 'This email is already subscribed' });
        } else {
            console.error(err);
            res.status(500).json({ error: 'Failed to subscribe' });
        }
    }
});

// Download vCard
app.get('/api/vcard', async (req, res) => {
    try {
        const settingsRows = await Setting.find({});
        const settings = {};
        settingsRows.forEach(r => settings[r.key] = r.value);

        if (settings.vcard_active !== 'true') return res.status(404).send('vCard disabled');

        const firstName = settings.vcard_first_name || '';
        const lastName = settings.vcard_last_name || '';
        const email = settings.vcard_email || '';
        const phone = settings.vcard_phone || '';
        const instagram = settings.vcard_instagram || '';
        const company = settings.vcard_company || '';
        const jobTitle = settings.vcard_job_title || '';
        const website = settings.vcard_website || '';
        const address = settings.vcard_address || '';

        // Safely encode any line breaks for vCard format
        const cleanAddress = address.replace(/\n/g, '\\n');

        let vcardData = `BEGIN:VCARD\nVERSION:3.0\nN:${lastName};${firstName};;;\nFN:${firstName} ${lastName}\nEMAIL:${email}\nTEL:${phone}`;

        if (company) vcardData += `\nORG:${company}`;
        if (jobTitle) vcardData += `\nTITLE:${jobTitle}`;
        if (website) vcardData += `\nURL:${website}`;
        if (instagram) vcardData += `\nX-SOCIALPROFILE;type=instagram:${instagram}`;
        if (address) vcardData += `\nADR:;;${cleanAddress};;;;`;

        vcardData += `\nEND:VCARD`;

        res.setHeader('Content-Type', 'text/vcard');
        res.setHeader('Content-Disposition', `attachment; filename="contact.vcf"`);
        res.send(vcardData);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});


// ===== ADMIN API ENDPOINTS (PROTECTED) =====

// Auth Middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.adminId) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Admin login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ error: 'Invalid username or password' });

        const match = await bcrypt.compare(password, user.password_hash);
        if (match) {
            req.session.adminId = user._id;
            res.json({ success: true, message: 'Logged in successfully' });
        } else {
            res.status(401).json({ error: 'Invalid username or password' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Admin logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Get admin status
app.get('/api/admin/status', (req, res) => {
    if (req.session && req.session.adminId) {
        res.json({ loggedIn: true });
    } else {
        res.json({ loggedIn: false });
    }
});

// Admin File Upload
app.post('/api/admin/upload', requireAuth, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    // Return the Cloudinary URL
    const fileUrl = req.file.path;
    res.json({ success: true, url: fileUrl });
});

// Get all links (including inactive) with click analytics
app.get('/api/admin/links', requireAuth, async (req, res) => {
    try {
        const links = await Link.aggregate([
            {
                $lookup: {
                    from: 'analytics',
                    localField: '_id',
                    foreignField: 'link_id',
                    as: 'analyticsData'
                }
            },
            {
                $addFields: {
                    clicks: { 
                        $ifNull: [ { $arrayElemAt: ['$analyticsData.click_count', 0] }, 0 ] 
                    },
                    id: '$_id'
                }
            },
            {
                $project: {
                    analyticsData: 0
                }
            },
            { $sort: { display_order: 1 } }
        ]);
        res.json(links);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch admin links' });
    }
});

// Helper to fetch Spotify oEmbed Data
async function fetchSpotifyData(url) {
    try {
        const response = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
        if (!response.ok) return null;
        const data = await response.json();
        return {
            thumbnail_url: data.thumbnail_url,
            embed_url: data.iframe_url
        };
    } catch (err) {
        console.error("Failed to fetch Spotify oEmbed:", err);
        return null;
    }
}

// Add a new link
app.post('/api/admin/links', requireAuth, async (req, res) => {
    let { title, url, icon, is_active, thumbnail_url, link_type, embed_url, parent_id } = req.body;
    try {
        // Auto-fetch Spotify data if applicable
        if (link_type === 'spotify') {
            const spotifyData = await fetchSpotifyData(embed_url);
            if (spotifyData) {
                thumbnail_url = spotifyData.thumbnail_url;
                embed_url = spotifyData.embed_url;
            }
        }

        // Get max order
        const lastLink = await Link.findOne().sort('-display_order');
        const nextOrder = lastLink ? lastLink.display_order + 1 : 1;

        const link = await Link.create({
            title, url, icon, display_order: nextOrder, is_active: is_active ? true : false,
            thumbnail_url: thumbnail_url || null, link_type: link_type || 'standard',
            embed_url: embed_url || null, parent_id: parent_id || null
        });
        res.json({ success: true, id: link._id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create link' });
    }
});

// Update link ORDER — must be declared BEFORE /:id to avoid Express swallowing 'reorder' as a param
app.put('/api/admin/links/reorder', requireAuth, async (req, res) => {
    const { orderedIds } = req.body;
    try {
        for (let i = 0; i < orderedIds.length; i++) {
            await Link.findByIdAndUpdate(orderedIds[i], { display_order: i + 1 });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reorder links' });
    }
});

// Update a link
app.put('/api/admin/links/:id', requireAuth, async (req, res) => {
    let { title, url, icon, is_active, thumbnail_url, link_type, embed_url, parent_id } = req.body;
    try {
        // Auto-fetch Spotify data if applicable
        if (link_type === 'spotify') {
            // Only fetch if they provided a raw spotify.com URL to scrape, otherwise leave existing value
            if (embed_url && embed_url.includes('spotify.com') && !embed_url.includes('/embed/')) {
                const spotifyData = await fetchSpotifyData(embed_url);
                if (spotifyData) {
                    thumbnail_url = spotifyData.thumbnail_url;
                    embed_url = spotifyData.embed_url;
                }
            }
        }

        await Link.findByIdAndUpdate(req.params.id, {
            title, url, icon, is_active: is_active ? true : false,
            thumbnail_url: thumbnail_url || null, link_type: link_type || 'standard',
            embed_url: embed_url || null, parent_id: parent_id || null
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update link' });
    }
});

// Delete a link
app.delete('/api/admin/links/:id', requireAuth, async (req, res) => {
    try {
        await Link.findByIdAndDelete(req.params.id);
        // Also cleanup analytics points
        await Analytics.deleteMany({ link_id: req.params.id });
        await DailyAnalytics.deleteMany({ link_id: req.params.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete link' });
    }
});

// Get all messages
app.get('/api/admin/messages', requireAuth, async (req, res) => {
    try {
        const messages = await Message.find().sort('-created_at');
        res.json(messages.map(m => ({ ...m.toObject(), id: m._id })));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Get all subscribers
app.get('/api/admin/subscribers', requireAuth, async (req, res) => {
    try {
        const subscribers = await Subscriber.find().sort('-created_at');
        res.json(subscribers.map(s => ({ ...s.toObject(), id: s._id })));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch subscribers' });
    }
});

// Delete a subscriber
app.delete('/api/admin/subscribers/:id', requireAuth, async (req, res) => {
    try {
        await Subscriber.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete subscriber' });
    }
});

// ===== GALLERY API ENDPOINTS =====

app.get('/api/gallery', async (req, res) => {
    try {
        const images = await Gallery.find().sort('display_order');
        res.json(images.map(img => ({ ...img.toObject(), id: img._id })));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch gallery' });
    }
});

app.get('/api/admin/gallery', requireAuth, async (req, res) => {
    try {
        const images = await Gallery.find().sort('display_order');
        res.json(images.map(img => ({ ...img.toObject(), id: img._id })));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch gallery' });
    }
});

app.post('/api/admin/gallery', requireAuth, async (req, res) => {
    const { image_url, caption } = req.body;
    if (!image_url) return res.status(400).json({ error: 'Image URL is required' });
    try {
        const lastImage = await Gallery.findOne().sort('-display_order');
        const nextOrder = lastImage ? lastImage.display_order + 1 : 1;
        const result = await Gallery.create({ image_url, caption, display_order: nextOrder });
        res.json({ success: true, id: result._id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add image' });
    }
});

app.put('/api/admin/gallery/reorder', requireAuth, async (req, res) => {
    const { orderedIds } = req.body;
    try {
        for (let i = 0; i < orderedIds.length; i++) {
            await Gallery.findByIdAndUpdate(orderedIds[i], { display_order: i + 1 });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reorder gallery' });
    }
});

app.delete('/api/admin/gallery/:id', requireAuth, async (req, res) => {
    try {
        await Gallery.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete image' });
    }
});

// Update settings
app.put('/api/admin/settings', requireAuth, async (req, res) => {
    const settings = req.body;
    try {
        for (const [key, value] of Object.entries(settings)) {
            await Setting.findOneAndUpdate({ key }, { value }, { upsert: true });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Upload a generic file (Thumbnail, SEO image)
app.post('/api/admin/upload', requireAuth, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    // Return relative URL for storage
    res.json({ success: true, url: req.file.path });
});

// Get daily analytics for chart
app.get('/api/admin/analytics/daily', requireAuth, async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        const analytics = await DailyAnalytics.aggregate([
            { $match: { date: { $gte: thirtyDaysAgoStr } } },
            { $group: { _id: '$date', clicks: { $sum: '$clicks' } } },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: '$_id', clicks: 1 } }
        ]);
        res.json(analytics);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch daily analytics' });
    }
});

// Get visitor breakdown (countries + devices)
app.get('/api/admin/analytics/visitors', requireAuth, async (req, res) => {
    try {
        const countries = await VisitorLog.aggregate([
            { $group: { _id: '$country', visits: { $sum: 1 } } },
            { $sort: { visits: -1 } },
            { $limit: 10 },
            { $project: { _id: 0, country: '$_id', visits: 1 } }
        ]);
        const devices = await VisitorLog.aggregate([
            { $group: { _id: '$device', visits: { $sum: 1 } } },
            { $sort: { visits: -1 } },
            { $project: { _id: 0, device: '$_id', visits: 1 } }
        ]);
        const total = await VisitorLog.countDocuments();
        res.json({ countries, devices, total });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch visitor data' });
    }
});

// ===== SPOTIFY NOW PLAYING =====
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/api/auth/spotify/callback';
const SPOTIFY_SCOPES = 'user-read-currently-playing user-read-playback-state';

// Step 1: Redirect to Spotify OAuth
app.get('/api/auth/spotify', requireAuth, (req, res) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    if (!clientId) return res.status(400).send('SPOTIFY_CLIENT_ID not configured in .env');
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope: SPOTIFY_SCOPES,
        redirect_uri: SPOTIFY_REDIRECT_URI
    });
    res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

// Step 2: Callback – exchange code for tokens, save to DB
app.get('/api/auth/spotify/callback', requireAuth, async (req, res) => {
    const { code } = req.query;
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) return res.status(400).send('Spotify credentials not configured');
    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: SPOTIFY_REDIRECT_URI })
        });
        const data = await response.json();
        if (data.refresh_token) {
            await Setting.findOneAndUpdate({ key: 'spotify_refresh_token' }, { value: data.refresh_token }, { upsert: true });
            await Setting.findOneAndUpdate({ key: 'spotify_access_token' }, { value: data.access_token }, { upsert: true });
            res.redirect('/admin.html?spotify=connected');
        } else {
            res.status(400).send('Failed to get Spotify tokens: ' + JSON.stringify(data));
        }
    } catch (err) {
        res.status(500).send('Spotify auth error: ' + err.message);
    }
});

// Step 3: Get currently playing track (auto-refreshes access token)
app.get('/api/spotify/now-playing', async (req, res) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    try {
        const rtRow = await Setting.findOne({ key: 'spotify_refresh_token' });
        if (!rtRow) return res.json({ playing: false });

        // Refresh the access token
        const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: rtRow.value })
        });
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) return res.json({ playing: false });

        // Fetch current track
        const trackRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (trackRes.status === 204 || !trackRes.ok) return res.json({ playing: false });
        const trackData = await trackRes.json();
        if (!trackData || !trackData.item) return res.json({ playing: false });

        res.json({
            playing: trackData.is_playing,
            name: trackData.item.name,
            artist: trackData.item.artists.map(a => a.name).join(', '),
            album: trackData.item.album.name,
            albumArt: trackData.item.album.images[0]?.url,
            url: trackData.item.external_urls.spotify,
            progress: trackData.progress_ms,
            duration: trackData.item.duration_ms
        });
    } catch (err) {
        console.error('Spotify now-playing error:', err);
        res.json({ playing: false });
    }
});

// ===== AI CHATBOT =====
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Gemini API key not configured' });

    try {
        // Get persona from settings
        const settingsRows = await Setting.find({});
        const settings = {};
        settingsRows.forEach(r => settings[r.key] = r.value);
        const persona = settings.chatbot_persona || 'You are a friendly assistant on a personal social links page.';

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        { role: 'user', parts: [{ text: persona + '\n\nUser: ' + message }] }
                    ]
                })
            }
        );
        const data = await response.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
        res.json({ reply });
    } catch (err) {
        console.error('Chat error:', err);
        res.status(500).json({ error: 'Failed to get AI response' });
    }
});

// ===== ANIME LIST API =====

// Public: Get all anime
app.get('/api/anime', async (req, res) => {
    try {
        const anime = await AnimeList.find().sort('display_order');
        res.json(anime.map(a => ({ ...a.toObject(), id: a._id })));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch anime list' });
    }
});

// Admin: Get all anime
app.get('/api/admin/anime', requireAuth, async (req, res) => {
    try {
        const anime = await AnimeList.find().sort('display_order');
        res.json(anime.map(a => ({ ...a.toObject(), id: a._id })));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch anime list' });
    }
});

// Admin: Add anime
app.post('/api/admin/anime', requireAuth, async (req, res) => {
    const { title, status, score, image_url, mal_id } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    try {
        const lastAnime = await AnimeList.findOne().sort('-display_order');
        const nextOrder = lastAnime ? lastAnime.display_order + 1 : 1;
        const result = await AnimeList.create({
            title, status: status || 'watching', score: score || 0,
            image_url: image_url || null, mal_id: mal_id || null, display_order: nextOrder
        });
        res.json({ success: true, id: result._id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add anime' });
    }
});

// Admin: Update anime
app.put('/api/admin/anime/:id', requireAuth, async (req, res) => {
    const { title, status, score, image_url, mal_id } = req.body;
    try {
        await AnimeList.findByIdAndUpdate(req.params.id, {
            title, status, score, image_url: image_url || null, mal_id: mal_id || null
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update anime' });
    }
});

// Admin: Delete anime
app.delete('/api/admin/anime/:id', requireAuth, async (req, res) => {
    try {
        await AnimeList.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete anime' });
    }
});

// Global Error Handler

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
