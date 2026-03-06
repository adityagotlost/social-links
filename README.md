# 🔗 Social Links — Personal Link-in-Bio Page

A fully self-hosted, full-stack **link-in-bio** web app with a sleek animated frontend and a powerful admin dashboard. Built with **Node.js + Express + SQLite**.

---

## ✨ Features

### 🎨 Frontend (Visitor Page)
- **Multiple Themes** — Default, Dark, Glassmorphism, Neon, Cyberpunk, Gradient, Sunrise, Minimal White
- **Custom Fonts** — Inter, Roboto, Outfit, Playfair Display, Space Mono, Caveat
- **Animated Backgrounds** — Floating Particles, Glowing Orbs, Matrix Rain
- **Typewriter Tagline** — Rotating animated bio taglines
- **Skills / Badges** — Pill-shaped skill tags under the profile
- **Status Badge** — Live "online" style status post
- **QR Code Modal** — Auto-generates a scannable QR of your profile URL
- **Save to Contacts (vCard)** — Downloads a `.vcf` file with your contact info
- **Spotify Now Playing** — Live track widget, auto-refreshes every 30 seconds
- **Gallery Slider** — Image carousel with Swiper.js
- **Tip Jar Button** — Link to PayPal, BuyMeACoffee, Stripe, etc.
- **Newsletter Signup** — Email capture form with subscriber storage
- **Contact Form** — Sends messages to your Gmail via Nodemailer
- **Social Icons Footer** — Auto-generated icon row from your links
- **Announcement Banner** — Fixed top banner with custom colors, link, and dismiss button
- **Visitor Counter** — Tracks total page visits
- **Link Hover Preview** — Floating preview card on link hover
- **Mouse Glow Effect** — Cursor tracking glow on link cards
- **Custom Cursor** — Glowing dot + trail cursor
- **Light / Dark Mode Toggle** — Visitor-controlled, saved to localStorage

### 🛠️ Admin Dashboard (`/admin`)
- **Link Management** — Add, edit, delete, reorder (drag & drop) links
- **Link Types** — Standard button, Folder (accordion), Embed (video/audio), Spotify embed
- **Thumbnail Upload** — Custom image or auto-fetched favicon per link
- **Click Analytics** — Per-link click tracking with charts
  - Daily clicks (last 30 days)
  - Top countries
  - Device breakdown (mobile/desktop)
- **Contact Messages** — View all messages from the contact form
- **Newsletter Subscribers** — View & delete email subscribers
- **Image Gallery** — Upload and manage gallery slider images
- **vCard Settings** — Configure Save to Contacts details (name, phone, email, company, etc.)
- **Global Settings** — Theme, font, animated background, bio, taglines, skills, status
- **SEO Settings** — Title, description, and OG preview image
- **Announcement Banner** — Enable/disable with custom message, link, and colors
- **Tip Jar** — Toggle and set link + label
- **Newsletter Toggle** — Enable/disable with custom title
- **Spotify OAuth** — Connect your Spotify account for Now Playing
- **Custom CSS / JS** — Inject raw CSS or JS from the admin panel

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- npm

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/adityagotlost/social-links.git
cd social-links

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
```

### Environment Variables

Create a `.env` file in the root with the following:

```env
# Session secret (change this to something random & secure)
SESSION_SECRET=your-super-secret-key

# Spotify Integration (optional)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Gmail for contact form emails (optional)
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
```

> **Note:** Never commit your `.env` file. It is already listed in `.gitignore`.

### Running the App

```bash
# Start the server
npm start

# Server runs at:
# http://localhost:3000        ← Visitor profile page
# http://localhost:3000/admin  ← Admin dashboard
```

### Default Admin Credentials
Set your username and password on **first login** through the admin setup, or update them via the admin settings panel.

---

## 📁 Project Structure

```
social-links/
├── server.js          # Express server & all API routes
├── database.js        # SQLite database setup & queries
├── index.html         # Visitor-facing profile page
├── style.css          # All frontend styles & themes
├── script.js          # Frontend logic (settings, links, widgets)
├── admin.html         # Admin dashboard UI
├── admin.css          # Admin panel styles
├── admin.js           # Admin dashboard logic
├── uploads/           # Uploaded images (gitignored)
├── database.sqlite    # SQLite database file (gitignored)
├── .env               # Secret keys (gitignored)
└── package.json
```

---

## 🌐 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/settings` | Get all public settings |
| `GET` | `/api/links` | Get all active links |
| `POST` | `/api/click/:id` | Record a link click |
| `POST` | `/api/visit` | Record a page visit |
| `POST` | `/api/contact` | Submit a contact message |
| `POST` | `/api/subscribe` | Subscribe to newsletter |
| `GET` | `/api/vcard` | Download vCard (.vcf) |
| `GET` | `/api/spotify/now-playing` | Get current Spotify track |
| `GET` | `/api/gallery` | Get gallery images |
| `GET` | `/api/auth/spotify` | Start Spotify OAuth flow |

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | SQLite (via `better-sqlite3`) |
| Auth | `express-session` + `bcrypt` |
| Email | Nodemailer (Gmail SMTP) |
| File Uploads | Multer |
| Spotify API | OAuth 2.0 |
| Frontend | Vanilla HTML + CSS + JS |
| UI Libraries | Font Awesome 6, Swiper.js, QRCode.js, Chart.js |

---

## 📸 Screenshots

> Coming soon

---

## 📄 License

ISC © [adityagotlost](https://github.com/adityagotlost)
