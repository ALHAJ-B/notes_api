# notes_api

Secure notes demo app with:
- Express backend (JWT auth, request validation, rate limiting)
- Browser-based encryption utilities for notes
- SQLite local storage

## Prerequisites
- Node.js 20+
- npm

## Setup
1. Install dependencies:
   npm install
2. Create local env file from example:
   cp .env.example .env
3. Edit `.env` and set a strong `JWT_SECRET`.

## Run
- Development:
  npm run dev
- Production-style:
  npm start

App listens on `PORT` (default `3000`).

## Test
- Run tests:
  npm test

Current test coverage includes:
- Crypto roundtrip behavior
- Auth + notes integration flow
- Cross-user note ownership protections

## Security notes
- Do not commit `.env`.
- Database files are ignored by default.
- Request validation and rate limiting are enabled.
