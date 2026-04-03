# Skill Sync V2

Skill Sync V2 is a student skill-exchange platform built with React, Vite, Firebase Auth, and Firestore. Users can create profiles, list skills they can teach, list skills they want to learn, discover matches, open chats, and use a floating AI assistant powered by OpenAI through a server-side proxy.

## Features

- Student onboarding with email/password and Google sign-in
- Firebase-backed user profiles stored in Firestore
- Skill lists for teaching and learning
- Match suggestions, roadmaps, quizzes, and team-building helpers
- Chat view for user-to-user conversations
- Floating bottom-right AI assistant with secure server-side OpenAI calls
- Vercel-ready frontend plus serverless API deployment

## Tech Stack

- React 19
- Vite 8
- React Router 7
- Firebase Authentication
- Firestore
- Framer Motion
- Lucide React
- OpenAI Responses API
- Vercel

## Project Structure

```text
.
├── api/
│   └── assistant-chat.js
├── public/
├── server/
│   └── assistantHandler.js
├── src/
│   ├── components/
│   │   └── AIAssistant.jsx
│   ├── pages/
│   ├── ai.js
│   ├── firebase.js
│   └── index.css
├── .env.example
├── package.json
├── vercel.json
└── vite.config.js
```

## Local Development

### 1. Install dependencies

```bash
npm ci
```

### 2. Create a local environment file

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Set the following values:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
```

### 3. Start the dev server

```bash
npm run dev -- --host localhost --port 3006
```

Open:

```text
http://localhost:3006/
```

Use `localhost`, not `127.0.0.1`, when testing Google sign-in locally.

## Environment Variables

### Required

- `OPENAI_API_KEY`: used by the server-side assistant endpoint

### Optional

- `OPENAI_MODEL`: defaults to `gpt-4.1-mini`

## Firebase Setup

The Firebase client config is currently defined in [src/firebase.js](./src/firebase.js).

To make authentication work correctly:

1. Open Firebase Console.
2. Go to Authentication.
3. Enable Email/Password and Google providers if needed.
4. In Authentication > Settings > Authorized domains, add:
   - `localhost`
   - your Vercel production domain after deployment

If you see `auth/unauthorized-domain`, the current host is not in Firebase's authorized domain list.

## AI Assistant

The floating assistant is mounted globally and calls:

- `/api/assistant-chat`

Implementation files:

- [src/components/AIAssistant.jsx](./src/components/AIAssistant.jsx)
- [server/assistantHandler.js](./server/assistantHandler.js)
- [api/assistant-chat.js](./api/assistant-chat.js)

Important security note:

- Do not expose `OPENAI_API_KEY` in client-side code.
- Keep it in local `.env` and in Vercel project environment variables.
- If a key is ever pasted into chat or committed accidentally, rotate it.

## Build

```bash
npm run build
```

## Lint

```bash
npm run lint
```

At the moment, lint still reports pre-existing issues in legacy project files such as `src/ai.js`, `src/pages/Chat.jsx`, `src/pages/Dashboard.jsx`, and `src/pages/Login.jsx`.

## Deploy to Vercel

This project supports direct Vercel deployment with the frontend and the `api/assistant-chat` serverless function in the same repo.

### Recommended deployment flow

1. Push this project to GitHub.
2. Import the GitHub repo into Vercel, or deploy with the Vercel CLI.
3. In Vercel Project Settings, add:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` if you want to override the default
4. Add your production Vercel domain to Firebase Authorized Domains.

### Vercel CLI example

```bash
vercel --prod
```

### Runtime behavior

- Static frontend assets are served from the Vite build output.
- `/api/assistant-chat` runs as a Vercel serverless function.
- All non-API routes rewrite to `index.html` for React Router.

## Known Issues

- Some files still contain pre-existing lint violations.
- The matching and roadmap flows in `src/ai.js` are largely mock/offline logic.
- Google Auth requires correct Firebase authorized domain configuration.

## Production Checklist

- Add `OPENAI_API_KEY` in Vercel
- Verify `/api/assistant-chat` replies in production
- Add the Vercel domain in Firebase Authorized Domains
- Test email/password sign-in
- Test Google sign-in
- Test Firestore profile creation
- Test the AI assistant widget on mobile and desktop

## License

No license file is currently included in this repository.
