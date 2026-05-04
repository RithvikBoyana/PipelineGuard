# PipelineGuard

AI-powered qualification scoring for B2B sales discovery calls. Upload a transcript, get a score.

---

## What it does

1. Create a deal on the dashboard
2. Upload a call transcript (.txt, .pdf, .docx, or paste text directly)
3. AI scores the call across 5 signals: decision-maker, problem articulation, budget authority, urgency, and next steps
4. See a score (0–5), per-signal reasoning, and a plain-English summary
5. Add more transcripts as the deal progresses — the aggregate score updates each time

**Rate limit:** 5 AI analyses per user per week. Contact the owner if you need more.

---

## Step 1 — Install the required tools

> **Mac and Linux work the same way** for all steps in this guide.

You need three tools: **Git**, **Node.js**, and **Python**. If you already have them, skip to Step 2.

### Git
- **Mac/Linux:** Open Terminal and run `git --version` to check if it's already installed. If not, download from [git-scm.com](https://git-scm.com/downloads).
- **Windows:** Download and install from [git-scm.com](https://git-scm.com/downloads). Use all default options.

### Node.js (v18 or higher)
- Download the **LTS** version from [nodejs.org](https://nodejs.org/) and run the installer with default options.
- To verify: run `node --version` in a terminal. You should see something like `v20.x.x`.

### Python (3.10 or higher)
- Download from [python.org](https://www.python.org/downloads/) and run the installer.
- **Windows only:** Check the box that says **"Add Python to PATH"** during installation — this is important.
- To verify: run `python3 --version` (Mac/Linux) or `python --version` (Windows). You should see `Python 3.x.x`.

---

## Step 2 — Get the code

**Mac/Linux:** Open **Terminal**. **Windows:** Open **Command Prompt** or **PowerShell**.

1. Run:
   ```
   git clone https://github.com/RithvikBoyana/pipeline-guard.git
   cd pipeline-guard
   ```

---

## Step 3 — Add your environment files

These files hold the API keys the app needs to connect to its services. **Contact the owner for the values** — do not share or commit these files.

### Mac/Linux

1. Run:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.local.example frontend/.env.local
   ```
2. Open `backend/.env` and `frontend/.env.local` in any text editor and fill in the values the owner gives you.

### Windows

1. Run:
   ```
   copy backend\.env.example backend\.env
   copy frontend\.env.local.example frontend\.env.local
   ```
2. Open `backend\.env` and `frontend\.env.local` in Notepad (or any text editor) and fill in the values the owner gives you.

---

## Step 4 — Install dependencies

> **You only need to do this once.** You do not need to re-run these commands every time you start the app — only if something in the code changes (e.g. after a `git pull`).

### Backend

**Mac/Linux:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Windows:**
```
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

When it finishes, your terminal prompt will show `(.venv)` at the start — that means the virtual environment is active.

### Frontend

**Mac/Windows/Linux:**
```
cd frontend
npm install
```

---

## Step 5 — Run the app

You need **two terminal windows open at the same time** — one for the backend, one for the frontend.

### Terminal 1 — Backend

**Mac/Linux:**
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Windows:**
```
cd backend
.venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

> Success looks like: `Uvicorn running on http://127.0.0.1:8000`

### Terminal 2 — Frontend

**Mac/Windows/Linux:**
```
cd frontend
npm run dev
```

> Success looks like: `Local: http://localhost:3000`

---

## Step 6 — Open the app

1. Open your browser and go to [http://localhost:3000](http://localhost:3000).
2. You'll be redirected to the login page. Click **Sign up** and create an account with your email and password or click **Sign in with Google** to use your Google/Gmail account.
3. You'll land on the dashboard — from here you can create deals and upload transcripts.


---

## Testing tips

- **Paste mode** is the easiest way to test — on a deal page, click "Paste text" and paste in any block of text that resembles a sales call transcript
- Analysis takes **10–20 seconds** — a loading screen will appear while it runs
- You get **5 analyses per week**. Contact the owner if you hit the limit and need it raised for your account
- Dark mode toggle is in the top-right corner of the dashboard

---

## Troubleshooting

**Backend won't start**
- Make sure you activated the virtual environment first (`source .venv/bin/activate` on Mac/Linux, `.venv\Scripts\activate` on Windows)
- Make sure `backend/.env` exists and all values are filled in

**"Network error" or the dashboard shows no data**
- Make sure the backend is running in a separate terminal on port 8000
- Check that `NEXT_PUBLIC_API_URL=http://localhost:8000` is in `frontend/.env.local`

**Getting logged out immediately or "Invalid JWT" error**
- Make sure `SUPABASE_JWT_SECRET` in `backend/.env` is correct — contact the owner if unsure

**Analysis returns an error**
- Check that `OPENAI_API_KEY` in `backend/.env` is valid and has credits
- Contact the owner if the error persists

**`python3` not found (Mac/Linux) or `python` not found (Windows)**
- If you did `python ...` or `pip ...`, try doing `python3 ...` or `pip3 ...` and vice versa
- IF that didn't work, Python is not installed or not on your PATH — go back to Step 1, reinstall, and on Windows make sure to check "Add Python to PATH"
