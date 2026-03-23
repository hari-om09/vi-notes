

# Vi-Notes

**Vi-Notes** is an authenticity verification platform designed to distinguish genuine human-written content from AI-generated or AI-assisted text. The system focuses on analyzing **writing behavior** alongside **statistical and linguistic characteristics** of the text to establish reliable authorship verification.

This repository represents the **design and conceptual foundation** for the Vi-Notes system.

---

## Motivation

With the widespread availability of AI writing tools, verifying true human authorship has become increasingly challenging. Most existing detection methods rely primarily on textual analysis, which can be inconsistent and easy to bypass.

Vi-Notes approaches this problem by combining:
- Behavioral signals from the writing process
- Statistical analysis of the written content
- Correlation between how content is written and what is written

---

## Core Idea

Human writing naturally includes:
- Variable typing speeds
- Pauses during thinking
- Revisions during idea formation
- Irregular sentence structures
- A relationship between content complexity and editing frequency

AI-generated or pasted text often lacks these behavioral signatures.

Vi-Notes is designed to capture and analyze these characteristics to assess authorship authenticity.

---

## Key Features

### Writing Session Monitoring
- Capture keystroke timing metadata (not raw key content)
- Track pauses, deletions, edits, and writing flow
- Detect pasted or externally inserted text blocks

### Behavioral Pattern Analysis
- Pause distribution before sentences and paragraphs
- Typing speed variance
- Revision frequency relative to text complexity
- Micro-pauses around punctuation and structural boundaries

### Textual Statistical Analysis
- Sentence length variation
- Vocabulary diversity metrics
- Stylistic consistency analysis
- Linguistic irregularities typical of human writing

---

## Tech Stack (MERN Architecture)

### Frontend
- **React / Vite**: UI Layer
- **Tailwind CSS**: Styling
- **Lucide React**: Iconography

### Backend
- **Node.js & Express**: API Layer
- **Mongoose**: ODM for MongoDB
- **JSON Web Tokens (JWT)**: Authentication

### Database
- **MongoDB Atlas**: Cloud-based NoSQL storage

---

## Local Development (MVP)

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account or Local MongoDB instance

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/vi-notes.git
   cd vi-notes
   ```

2. **Backend Setup**
   ```bash
   cd server
   npm install
   ```
   Create a `.env` file in the `server` directory:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secret_key
   CORS_ORIGIN=http://localhost:5173
   ```
   Run the server: `npm run dev`

3. **Frontend Setup**
   ```bash
   cd ../client
   npm install
   ```
   Run the client: `npm run dev`

---

## Troubleshooting Connection Issues

If you encounter `Error: querySrv ECONNREFUSED` when connecting to MongoDB Atlas:

1.  **Check IP Whitelist:** Ensure your current IP address is added to the "Network Access" tab in your MongoDB Atlas Dashboard.
2.  **DNS Check:** This error often occurs due to DNS restrictions. Try changing your DNS provider to Google (**8.8.8.8**) or Cloudflare (**1.1.1.1**).
3.  **Use Standard Connection String:** If the `mongodb+srv://` protocol fails, try the older "Standard Connection String" format provided in the Atlas "Connect" menu (usually starts with `mongodb://` and lists specific nodes).
4.  **Local MongoDB:** As a fallback, use a local instance: `MONGODB_URI=mongodb://127.0.0.1:27017/vi_notes`.

---

## Privacy & Ethics

Vi-Notes is designed with privacy-first principles:
- **No storage of raw keystroke content** (only metadata).
- Encrypted data storage.
- Monitoring limited strictly to active writing sessions within the app.

---

## License

This project is licensed under the MIT License.

---