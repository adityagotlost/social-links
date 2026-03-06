const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        createTables();
    }
});

function createTables() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            icon TEXT NOT NULL,
            display_order INTEGER NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            start_date DATETIME,
            end_date DATETIME,
            thumbnail_url TEXT,
            link_type TEXT DEFAULT 'standard',
            embed_url TEXT
        )`);

        // Migration: add new columns if they don't exist
        db.run(`ALTER TABLE links ADD COLUMN start_date DATETIME`, (err) => { });
        db.run(`ALTER TABLE links ADD COLUMN end_date DATETIME`, (err) => { });
        db.run(`ALTER TABLE links ADD COLUMN thumbnail_url TEXT`, (err) => { });
        db.run(`ALTER TABLE links ADD COLUMN link_type TEXT DEFAULT 'standard'`, (err) => { });
        db.run(`ALTER TABLE links ADD COLUMN embed_url TEXT`, (err) => { });
        db.run(`ALTER TABLE links ADD COLUMN parent_id INTEGER DEFAULT NULL`, (err) => { });

        // Gallery Table
        db.run(`CREATE TABLE IF NOT EXISTS gallery (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_url TEXT NOT NULL,
            caption TEXT,
            display_order INTEGER NOT NULL DEFAULT 0
        )`);

        // Analytics Table (Total Clicks)
        db.run(`CREATE TABLE IF NOT EXISTS analytics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            link_id INTEGER NOT NULL,
            click_count INTEGER NOT NULL DEFAULT 0,
            last_clicked DATETIME,
            FOREIGN KEY (link_id) REFERENCES links (id) ON DELETE CASCADE
        )`);

        // Daily Analytics Table
        db.run(`CREATE TABLE IF NOT EXISTS daily_analytics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            link_id INTEGER NOT NULL,
            clicks INTEGER NOT NULL DEFAULT 0,
            UNIQUE(date, link_id)
        )`);

        // Messages Table
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Subscribers Table
        db.run(`CREATE TABLE IF NOT EXISTS subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Users Table (Admin)
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )`);

        // Settings Table (Custom Themes & Profile Info)
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )`, (err) => {
            if (!err) {
                const defaultSettings = [
                    ['profile_img_url', 'https://ui-avatars.com/api/?name=User&background=random&size=150'],
                    ['profile_name', '@adityagotlost'],
                    ['profile_bio', "Welcome to my little corner of the internet. Let's connect!"],
                    ['bg_color', '#0d1117'],
                    ['text_primary', '#ffffff'],
                    ['primary_color', '#4361ee'],
                    ['card_bg', 'rgba(255, 255, 255, 0.03)'],
                    ['theme', 'default'],
                    ['font_family', 'Inter'],
                    ['newsletter_active', 'false'],
                    ['newsletter_title', 'Subscribe to my Newsletter'],
                    ['tip_jar_active', 'false'],
                    ['tip_jar_url', ''],
                    ['tip_jar_text', 'Buy me a coffee'],
                    ['seo_title', 'My Social Links'],
                    ['seo_description', 'Welcome to my little corner of the internet!'],
                    ['seo_image', ''],
                    ['animated_background', 'none'],
                    ['custom_css', ''],
                    ['custom_js', ''],
                    ['vcard_active', 'true'],
                    ['vcard_first_name', 'Aditya'],
                    ['vcard_last_name', 'Anand'],
                    ['vcard_email', 'adityaanand3316@gmail.com'],
                    ['vcard_phone', '9304519320'],
                    ['vcard_instagram', 'https://instagram.com/kage_adi'],
                    ['vcard_company', ''],
                    ['vcard_job_title', ''],
                    ['vcard_website', ''],
                    ['vcard_address', '']
                ];
                // Insert new settings if they don't exist
                db.all("SELECT key FROM settings", (err, rows) => {
                    if (!err) {
                        const existingKeys = rows.map(r => r.key);
                        const stmt = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
                        defaultSettings.forEach(s => {
                            if (!existingKeys.includes(s[0])) {
                                stmt.run(s);
                            }
                        });
                        stmt.finalize();
                    }
                });

                // Seed an admin user if none exists
                db.get("SELECT * FROM users WHERE username = 'admin'", async (err, row) => {
                    if (!err && !row) {
                        const hash = await bcrypt.hash('password123', 10);
                        db.run("INSERT INTO users (username, password_hash) VALUES (?, ?)", ['admin', hash]);
                        console.log("Created default admin user (username: admin, password: password123)");

                        // Seed initial dummy links
                        db.run("INSERT INTO links (title, url, icon, display_order) VALUES ('Instagram', 'https://instagram.com', 'instagram', 1)");
                        db.run("INSERT INTO links (title, url, icon, display_order) VALUES ('GitHub', 'https://github.com', 'github', 2)");
                    }
                });
            }
        });

        console.log('Database tables verified.');
    });
}

// Function to safely execute queries returning promises
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                console.error('Error running sql ' + sql);
                console.error(err);
                reject(err);
            } else {
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
};

const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

module.exports = { db, dbRun, dbGet, dbAll };
