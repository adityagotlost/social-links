const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dns = require('dns');

// Force Node.js to use Google's public DNS to resolve MongoDB Atlas SRV records
dns.setServers(['8.8.8.8', '8.8.4.4']);


const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.warn('⚠️ MONGODB_URI is not set in .env. Skipping database connection for now.');
            return;
        }
        await mongoose.connect(uri);
        console.log('Connected to MongoDB.');
        await seedDatabase();
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1);
    }
};

// --- Models ---

const linkSchema = new mongoose.Schema({
    title: { type: String, required: true },
    url: { type: String, required: true },
    icon: { type: String, required: true },
    display_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    start_date: Date,
    end_date: Date,
    thumbnail_url: String,
    link_type: { type: String, default: 'standard' },
    embed_url: String,
    parent_id: String // Using String instead of ObjectId for simplicity mapping from old SQL
});
const Link = mongoose.model('Link', linkSchema);

const gallerySchema = new mongoose.Schema({
    image_url: { type: String, required: true },
    caption: String,
    display_order: { type: Number, default: 0 }
});
const Gallery = mongoose.model('Gallery', gallerySchema);

const analyticsSchema = new mongoose.Schema({
    link_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Link', required: true },
    click_count: { type: Number, default: 0 },
    last_clicked: Date
});
const Analytics = mongoose.model('Analytics', analyticsSchema);

const dailyAnalyticsSchema = new mongoose.Schema({
    date: { type: String, required: true }, // YYYY-MM-DD
    link_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Link', required: true },
    clicks: { type: Number, default: 0 }
});
// Ensure uniqueness per link per day
dailyAnalyticsSchema.index({ date: 1, link_id: 1 }, { unique: true });
const DailyAnalytics = mongoose.model('DailyAnalytics', dailyAnalyticsSchema);

const visitorLogSchema = new mongoose.Schema({
    date: { type: String, required: true },
    country: { type: String, default: 'Unknown' },
    device: { type: String, default: 'Unknown' },
    created_at: { type: Date, default: Date.now }
});
const VisitorLog = mongoose.model('VisitorLog', visitorLogSchema);

const messageSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

const subscriberSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    created_at: { type: Date, default: Date.now }
});
const Subscriber = mongoose.model('Subscriber', subscriberSchema);

const animeListSchema = new mongoose.Schema({
    title: { type: String, required: true },
    status: { type: String, default: 'watching' },
    score: { type: Number, default: 0 },
    image_url: String,
    mal_id: Number,
    display_order: { type: Number, default: 0 }
});
const AnimeList = mongoose.model('AnimeList', animeListSchema);

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

const settingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: String, default: '' }
});
const Setting = mongoose.model('Setting', settingSchema);


// --- Seeder ---

async function seedDatabase() {
    try {
        // Seed default admin
        const adminExt = await User.findOne({ username: 'admin' });
        if (!adminExt) {
            const hash = await bcrypt.hash('password123', 10);
            await User.create({ username: 'admin', password_hash: hash });
            console.log("Created default admin user (username: admin, password: password123)");
            
            // Seed initial dummy links
            await Link.create([
                { title: 'Instagram', url: 'https://instagram.com', icon: 'instagram', display_order: 1 },
                { title: 'GitHub', url: 'https://github.com', icon: 'github', display_order: 2 }
            ]);
        }

        // Seed default settings
        const defaultSettings = {
            'profile_img_url': 'https://ui-avatars.com/api/?name=User&background=random&size=150',
            'profile_name': '@adityagotlost',
            'profile_bio': "Welcome to my little corner of the internet. Let's connect!",
            'bg_color': '#0d1117',
            'text_primary': '#ffffff',
            'primary_color': '#4361ee',
            'card_bg': 'rgba(255, 255, 255, 0.03)',
            'theme': 'default',
            'font_family': 'Inter',
            'newsletter_active': 'false',
            'newsletter_title': 'Subscribe to my Newsletter',
            'tip_jar_active': 'false',
            'tip_jar_url': '',
            'tip_jar_text': 'Buy me a coffee',
            'seo_title': 'My Social Links',
            'seo_description': 'Welcome to my little corner of the internet!',
            'seo_image': '',
            'animated_background': 'none',
            'custom_css': '',
            'custom_js': '',
            'vcard_active': 'true',
            'vcard_first_name': 'Aditya',
            'vcard_last_name': 'Anand',
            'vcard_email': 'adityaanand3316@gmail.com',
            'vcard_phone': '9304519320',
            'vcard_instagram': 'https://instagram.com/kage_adi',
            'vcard_company': '',
            'vcard_job_title': '',
            'vcard_website': '',
            'vcard_address': '',
            'banner_active': 'false',
            'banner_text': '🔥 New video just dropped! Check it out!',
            'banner_emoji': '📢',
            'banner_link': '',
            'banner_bg': '#4361ee',
            'banner_text_color': '#ffffff',
            'chatbot_active': 'false',
            'chatbot_name': 'Adi\'s Assistant',
            'chatbot_persona': 'You are a friendly assistant on a personal social links page. Answer questions about the page owner briefly and helpfully.',
            'anime_section_active': 'false',
            'game_active': 'true'
        };

        const existingSettings = await Setting.find({});
        const existingKeys = existingSettings.map(s => s.key);

        for (const [key, value] of Object.entries(defaultSettings)) {
            if (!existingKeys.includes(key)) {
                await Setting.create({ key, value });
            }
        }
    } catch (err) {
        console.error("Error seeding DB:", err);
    }
}

module.exports = {
    connectDB,
    Link,
    Gallery,
    Analytics,
    DailyAnalytics,
    VisitorLog,
    Message,
    Subscriber,
    AnimeList,
    User,
    Setting
};

