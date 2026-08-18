# LockBox | Secure Notes Vault

LockBox is a secure, minimal, end-to-end encrypted note-taking application. It is designed to ensure that your notes remain strictly private—all encryption and decryption happens directly in your browser using the Web Crypto API, meaning the server only ever receives and stores ciphertext.

## 🚀 Key Features

- **End-to-End Encryption (E2EE):** Notes are encrypted locally in your browser using AES-GCM before being transmitted.
- **Secure Key Derivation:** Master passwords are run through PBKDF2 with unique salts using Web Workers to prevent UI freezing and ensure maximum security against brute-force attacks.
- **Zero-Knowledge Architecture:** The backend never sees your master password or the plaintext contents of your notes.
- **JWT Authentication:** Secure stateless session management using JSON Web Tokens.
- **Modern & Minimal UI:** A clean, functional, and responsive vanilla CSS/JS frontend interface that is lightning-fast.
- **API Security:** Strict request validation (via Zod), rate-limiting, and hardened HTTP headers (via Helmet).

---

## 🛠️ Technology Stack

**Frontend:**
- HTML5 / CSS3 (Custom Minimalist Design System)
- Vanilla JavaScript (ES Modules, Web Workers)
- Web Crypto API

**Backend:**
- Node.js & Express.js
- SQLite3 (via `better-sqlite3`)
- `bcryptjs` for password hashing
- `jsonwebtoken` for auth tokens
- `zod` for strict schema validation

---

## 📦 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v20 or newer recommended)
- npm (Node Package Manager)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Max948387/notes_api.git
   cd notes_api
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file from the example template and generate a strong JWT Secret.
   ```bash
   cp .env.example .env
   ```
   *Make sure to open `.env` and replace `your_jwt_secret_here` with a secure random string.*

4. **Initialize the Database:**
   The SQLite database (`database.db`) will be automatically created in the root directory upon starting the server. Tables are auto-migrated on launch.

---

## 🚦 Running the Application

**Development Mode (Auto-restarts on backend changes):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

Once the server is running, open your browser and navigate to:
**👉 `http://localhost:3000`**

---

## 🧪 Testing

LockBox includes a robust testing suite covering cryptographic roundtrips, authentication flows, cross-user protections, and security injection attempts.

To run the test suite:
```bash
npm test
```

To clean the test data from the database:
```bash
npm run clean
```

---

## 🛡️ Security Architecture

1. **Registration Flow:** 
   - A unique 16-byte salt is generated for the user on the frontend.
   - The frontend Web Worker derives an encryption key from the password and salt.
   - The salt and bcrypt-hashed password are saved on the server.
2. **Login Flow:** 
   - The backend validates the password and returns a JWT along with the user's unique salt.
   - The frontend Web Worker regenerates the AES-GCM encryption key locally.
3. **Note Lifecycle:** 
   - **Save:** Plaintext is encrypted via AES-GCM with a random IV. Only the ciphertext and IV are sent to the API.
   - **Load:** The API returns the ciphertext. The frontend decrypts it locally using the session's derived key.
4. **Data Purging:**
   - Logging out instantly wipes the encryption key and token from the browser's memory and `sessionStorage`.

---

## 📜 License

This project is licensed under the MIT License.
