# 🎯 Appropriate or Nope?

An interactive AI-powered workplace scenario game for company presentations and team building. Players are presented with workplace scenarios generated on the fly by Google's Gemini AI and must decide: **Appropriate** or **Nope?**

## Features

- **AI-Generated Scenarios** — Every round is unique, powered by Gemini 2.0 Flash
- **Score & Streak Tracking** — Compete against yourself or the audience
- **Gray Area Support** — Some scenarios are genuinely ambiguous (everyone gets a point!)
- **Game Show UI** — Bold, fun design with confetti, animations, and a final grade
- **10 Rounds Per Game** — Quick enough for a presentation segment

## Quick Start

### 1. Get a Gemini API Key

Go to [Google AI Studio](https://aistudio.google.com/apikey) and create a free API key.

### 2. Clone & Install

```bash
git clone <your-repo-url>
cd appropriate-or-nope
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Gemini API key:

```
GEMINI_API_KEY=your_actual_key_here
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploy to Vercel

### One-Click Deploy

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import your repo
3. In the **Environment Variables** section, add:
   - `GEMINI_API_KEY` = your Gemini API key
4. Click **Deploy**

### Via Vercel CLI

```bash
npm i -g vercel
vercel
# Follow the prompts, then add env var:
vercel env add GEMINI_API_KEY
vercel --prod
```

## Using in a Presentation

Open the deployed app on a shared screen and play through rounds with the audience voting by show of hands or live reaction. The reveal screen includes a funny explanation for each scenario to spark discussion.

**Pro tip:** The game avoids repeating scenarios within a session, so you can play multiple rounds without duplicates.

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Google Gemini 2.0 Flash** (via `@google/generative-ai`)
- **CSS** (custom game-show theme)
