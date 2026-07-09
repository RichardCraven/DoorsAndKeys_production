# Restack Game — Monorepo Architecture & Deployment Guide

This document maps out the live deployment state, monorepo configuration, environment settings, and codebase history for **Restack** (also known as *Doors and Keys*). It is designed to immediately onboard future developers or AI coding agents.

---

## 🌐 Live Infrastructure Overview

The application is deployed using a **Decoupled Architecture** on free-tier services, wired to a custom domain bought through Vercel:

| Component | Service Provider | Live URL | Deployment Branch |
| :--- | :--- | :--- | :--- |
| **Frontend (React)** | Vercel CDN | `https://dreamtower.world` <br>(redirects to `https://www.dreamtower.world`) | `main` branch of `DoorsAndKeys_production` |
| **Backend (Express)** | Render Web Service | `https://doorsandkeys-backend.onrender.com` | `main` branch of `DoorsAndKeys_production` |
| **Database** | MongoDB Atlas | *Cloud Cluster* | N/A |

---

## 📁 Repository & History Sync Context

The primary codebase repository is: **`https://github.com/RichardCraven/DoorsAndKeys_production`**.

### Important History Merge (July 9, 2026)
* **Standalone Client Repo**: The client UI was historically developed in a standalone repository: `https://github.com/RichardCraven/restack_client`.
* **Monorepo Conversion**: The client files in the monorepo were originally stuck on a June 26 commit (`5ab8daf`).
* **The July Sync**: On July 9, 2026, we cloned the latest `master` branch from the standalone `restack_client` repository (which had the latest commits merging the `July26` feature branch) and copied them directly into the `/restack_client` subdirectory of the monorepo.
* **Result**: The monorepo now fully holds the up-to-date client game version.

---

## 💻 Frontend Settings (`restack_client`)

React Version: **React 16** | Bundler: **Create React App / Webpack 5**

### 1. Build Environment Configuration
To compile React 16 + Webpack 5 on Vercel without crypto/Node conflicts, the following settings are configured on Vercel:

* **Node.js Version Constraint**: Set to **Node 20.x** via the `"engines"` field in [restack_client/package.json](file:///Users/richardcraven/Documents/Projects/restack/restack_client/package.json):
  ```json
  "engines": {
    "node": "20.x"
  }
  ```
  *(This avoids npm module resolution failures that occur on Node 24).*
* **Install Command Override**: `npm install --legacy-peer-deps` *(Required to resolve peer conflicts with `@coreui/icons-react`)*.
* **Environment Variables**:
  * `REACT_APP_API_URL`: `https://doorsandkeys-backend.onrender.com`
  * `NODE_OPTIONS`: `--openssl-legacy-provider` *(Required for Webpack 4/5 compatibility with Node 17+)*.
  * `CI`: `false` *(Prevents ESLint or typescript compilation warnings from failing the production build)*.

### 2. Dependency Upgrades
* `react-scripts` upgraded to **`5.0.1`** and modern Dart `sass` added to natively support compiled `.scss` styles (replacing outdated `node-sass` bindings).
* `"ajv": "^8.12.0"` explicitly added to dependencies to bypass npm package resolution bugs.

---

## 🚀 Backend Settings (`restack_backend`)

Runtime: **Node.js** | Framework: **Express** | Database Driver: **Mongoose**

### 1. Environment Variables on Render
* `MONGODB_URI`: `mongodb+srv://RichardCraven:BsTpqdTiOaTxfsYj@cluster2026.9g8ilq7.mongodb.net/doors_db?appName=Cluster2026`
* `CLIENT_ORIGIN`: `https://www.dreamtower.world`

### 2. Dynamic CORS Origin Resolution
Instead of hardcoding a single domain, [restack_backend/index.js](file:///Users/richardcraven/Documents/Projects/restack/restack_backend/index.js) uses a dynamic regex matching function. This automatically prevents CORS errors across all configurations:

```javascript
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    // Allow localhost, Vercel preview environments, and dreamtower.world subdomains
    const allowedPatterns = [
      /^http:\/\/localhost:\d+$/,
      /dreamtower\.world$/,
      /vercel\.app$/
    ];
    
    const isAllowed = allowedPatterns.some(pattern => pattern.test(origin)) || 
                      origin === process.env.CLIENT_ORIGIN;
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};
app.use(cors(corsOptions));
```

---

## 🛠️ Code Constraints & Gotchas

### Webpack 5 Absolute CSS Image Paths
Webpack 5's `css-loader` throws build errors for absolute asset URLs specified in CSS files (e.g. `url('/assets/graphics/card_duel/card_game_background.png')` inside `src/styles/CardDuel.css`) unless the assets reside inside `src/`.
* **Fix Applied**: Removed static background rules from CardDuel stylesheets and handled card game duel backgrounds dynamically via inline styles inside React components. Do not reintroduce absolute assets URL shorthand inside `.css` or `.scss` stylesheets.

### Local Node.js Development
* The local machine uses **Node 14.17.6**.
* Upgrading to React Scripts 5 introduces ESLint configs using the `node:path` prefix (which requires Node 16+). This causes `npm run build` to fail locally, but **it succeeds on Vercel** since Vercel builds under Node 20.
* To test locally, continue running the local dev server using `npm start` under Node 14.
* If testing under Node 18/20 locally in the future, run:
  ```bash
  NODE_OPTIONS=--openssl-legacy-provider npm start
  ```
