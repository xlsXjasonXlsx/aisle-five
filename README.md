# Aisle Five

AI-powered grocery price comparison across Kroger, Walmart, Target, and Costco.

## How it works

1. Describe what you need in plain English ("tacos for 6 people")
2. Gemini AI generates a shopping list
3. Live prices are fetched from Kroger-family stores (via Kroger API) and Walmart / Target / Costco (via Gemini web search)
4. The app shows a full price breakdown and recommends either a single-store or split-cart strategy
5. You approve the cart before checkout links are shown

## Setup

### 1. Install dependencies
```
npm install
```

### 2. Add Kroger API credentials

Copy `.env.example` to `.env` and fill in your Kroger credentials:
```
cp .env.example .env
```
Get free credentials at developer.kroger.com — use the **Certification** environment.

### 3. Start the dev server
```
npm run dev
```
Open http://localhost:5173

### 4. Add your Gemini API key

In the app go to **Settings** and paste your Gemini API key.
Get a free key at aistudio.google.com → Get API key.

The key is saved in your browser only — never stored on a server.

## Example prompts

- `I want to make tacos for 6 people`
- `Weekly groceries for a family of 4`
- `Breakfast foods for the week`

## Tech stack

- React + Vite + Tailwind CSS v4
- Kroger Developer API — live product prices across 6 store banners
- Google Gemini API with Search grounding — list generation + Walmart/Target/Costco prices + cart recommendation
