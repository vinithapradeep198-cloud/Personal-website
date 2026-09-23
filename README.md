# AASHVIN ♡ — Personal Frequency

Multi-page static personal site with lo-fi Web Audio synth, glassmorphism UI, global file sharing, global comments, CAPTCHA-protected downloads, and a hidden hacker admin mode.

## 🗂 File Tree
```
/index.html        → Home: hero + social grid + music lab + quick links
/tools.html        → 🧰 Tools & Stuffs: file downloads (with CAPTCHA)
/comments.html     → 💕 Comments: pink dreamy comment wall
/stuffs.html       → ✨ The Vault: placeholder gallery
/style.css         → Shared styles
/script.js         → Shared logic (CONFIG, audio, Supabase, admin)
/data/files.json   → Fallback file list (used when Supabase is not set)
/data/comments.json→ Fallback comments (used when Supabase is not set)
/files/            → Folder for static file hosting (fallback mode)
```

## 🚀 Deploy to Vercel / GitHub Pages

1. Push all files to a GitHub repo.
2. **Vercel:** New Project → Import from GitHub → Deploy. Done.
3. **GitHub Pages:** Settings → Pages → Source: `main` branch.

No build step needed. It's pure HTML/CSS/JS.

---

## ☁️ MAKE FILES & COMMENTS GLOBAL (Supabase — FREE)

By default the site reads from `/data/files.json` and `/data/comments.json`. This means only you can add files (by editing JSON + pushing to GitHub). Comments typed by visitors are local-only.

**To make everything truly global** (anyone uploads via admin, everyone sees files & comments instantly), set up Supabase:

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) → Create a free account → New Project.
2. Note your **Project URL** and **anon/public key** (Settings → API).

### Step 2: Create Tables
Go to **SQL Editor** and run:

```sql
-- Files table
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,
  size BIGINT DEFAULT 0,
  url TEXT NOT NULL,
  icon TEXT DEFAULT '📦',
  ts BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  text TEXT NOT NULL,
  ts BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  admin BOOLEAN DEFAULT FALSE
);

-- Enable public read for both
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read files" ON files FOR SELECT USING (true);
CREATE POLICY "Public insert files" ON files FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete files" ON files FOR DELETE USING (true);

CREATE POLICY "Public read comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Public insert comments" ON comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete comments" ON comments FOR DELETE USING (true);
```

### Step 3: Create Storage Bucket
1. Go to **Storage** → **New Bucket** → Name it `uploads`.
2. Set it to **Public**.
3. Under bucket policies, allow public uploads:
   - `INSERT` for `anon` role → all files
   - `SELECT` for `anon` role → all files

### Step 4: Add Keys to CONFIG
Open `script.js` and fill in:

```js
supabase: {
  url: "https://YOUR-PROJECT.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIs..."   // your anon/public key
}
```

### Step 5: Deploy
Push to GitHub → Vercel auto-deploys. Now:
- ✅ Admin can upload files from the browser → stored in Supabase Storage → visible to everyone globally
- ✅ Anyone can post comments → saved in Supabase DB → visible to everyone globally
- ✅ Admin can delete files and comments from the browser
- ✅ Downloads are protected by a CAPTCHA challenge

---

## 🔐 Admin Mode

Click the gold **Admin** button at the bottom of any page.

| Field    | Value         |
|----------|---------------|
| Username | `aashvin`     |
| Password | `aashvin2025` |

⚠️ **Change these in `script.js` → `CONFIG.admin` before deploying publicly!**

When admin mode is active:
- The entire site switches to a **green hacker theme** with Matrix code rain
- Upload buttons appear on the tools page
- Delete buttons appear on files and comments
- Click "Exit Admin" (same button) to log out

---

## 📥 Adding Files (Without Supabase)

If you haven't set up Supabase, you can still share files manually:

1. Put the file in the `/files/` folder (e.g. `/files/My-Tool.zip`)
2. Add an entry to `/data/files.json`:
   ```json
   {
     "id": "f_unique_id",
     "name": "My-Tool.zip",
     "type": "application/zip",
     "size": 1500000,
     "url": "/files/My-Tool.zip",
     "icon": "🗜️",
     "ts": 1727800000000
   }
   ```
3. Commit & push → Vercel redeploys → everyone sees it.

---

## 🎵 Audio Engine

The lo-fi music is 100% procedurally synthesized via the Web Audio API — no MP3 files. Three tracks with unique chord progressions, drum patterns, and randomized melodies. Works fully offline.