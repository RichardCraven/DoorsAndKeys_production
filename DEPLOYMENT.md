# Restack Deployment Guide

This guide details two primary strategies for deploying the **Restack** browser game, including the exact code modifications needed for both the React frontend ([restack_client](file:///Users/richardcraven/Documents/Projects/restack/restack_client)) and the Express backend ([restack_backend](file:///Users/richardcraven/Documents/Projects/restack/restack_backend)).

---

## 🏗️ Architecture Options at a Glance

```mermaid
graph TD
    subgraph Option 1: Decoupled (Recommended)
        Browser1([User's Browser]) -->|Loads React App| CDN[Vercel / Netlify CDN]
        Browser1 -->|API Requests| API1[Render / Railway Backend]
        API1 -->|DB Operations| Atlas1[(MongoDB Atlas Cloud)]
    end

    subgraph Option 2: Unified Monolith
        Browser2([User's Browser]) -->|All Traffic| Server[Render / Railway / VPS]
        subgraph Express Server
            Static[Serve Static Assets]
            API2[Express API Routes]
        end
        Server -->|DB Operations| Atlas2[(MongoDB Atlas Cloud)]
    end
```

### Strategy Comparison

| Feature | Option 1: Decoupled (Recommended) | Option 2: Unified Monolith |
| :--- | :--- | :--- |
| **Complexity** | **Low** (Simple setup on Vercel + Render) | **Medium** (Bundling & build scripting required) |
| **Performance** | **Very High** (CDN hosting for UI loads instantly) | **Moderate** (Single server hosts assets + API) |
| **CORS Setup** | Required (Explicit origin policy) | Not Required (Same domain) |
| **Hobby Tier Cost** | **Free ($0)** using Vercel/Netlify + Render/Railway | **Free to Low ($0 - $7/mo)** |
| **Scalability** | **High** (Client & API scale independently) | **Moderate** (Must scale the entire monolith) |

---

## 🗄️ Step 0: Database Migration (Required for Both)

Currently, the backend ([index.js](file:///Users/richardcraven/Documents/Projects/restack/restack_backend/index.js)) connects to a local MongoDB instance:
```javascript
const mongoUrl = `mongodb://localhost:27017/doors_db`
```

For production, you need to migrate to a cloud database:
1. **Create an account** on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. **Deploy a Free Shared Cluster** (Shared M0 tier).
3. **Set up network access** to allow access from any IP address (`0.0.0.0/0`) since platforms like Render dynamically change IPs, and create a database user with a password.
4. **Retrieve the Connection String**: It will look like this:
   `mongodb+srv://<db_user>:<db_password>@cluster0.xxxx.mongodb.net/doors_db?retryWrites=true&w=majority`

---

## 🚀 Option 1: The Decoupled / Separated Route (Recommended)

In this approach, the React frontend is deployed as a static site on a CDN like Vercel or Netlify, while the Express backend is deployed as a Web Service on Render, Railway, or Fly.io.

### 1. Code Changes in `restack_backend`

You need to modify [index.js](file:///Users/richardcraven/Documents/Projects/restack/restack_backend/index.js) to support environment variables for the database URL and dynamically allow CORS origins from your deployed frontend.

#### Diffs for [index.js](file:///Users/richardcraven/Documents/Projects/restack/restack_backend/index.js):
```diff
-const corsOptions = {
-    origin: "http://localhost:3000"
-  };
+const corsOptions = {
+    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000"
+  };

-const mongoUrl = `mongodb://localhost:27017/doors_db`
+const mongoUrl = process.env.MONGODB_URI || `mongodb://localhost:27017/doors_db`;
```

### 2. Code Changes in `restack_client`

You need to extract the hardcoded API base URL (`http://localhost:5001`) to an environment variable in [api-handler.js](file:///Users/richardcraven/Documents/Projects/restack/restack_client/src/utils/api-handler.js).

#### Diffs for [api-handler.js](file:///Users/richardcraven/Documents/Projects/restack/restack_client/src/utils/api-handler.js):
Add an `API_BASE` variable at the top of the file:
```javascript
import axios from 'axios';

// Get backend URL from environment variables, defaulting to localhost for local development
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5001";
```
Then, update all axios endpoints in the file to use `${API_BASE}` instead of hardcoded strings:
```diff
 const getAllUsersRequest = () => {
-  return axios.get("http://localhost:5001/api/users")
+  return axios.get(`${API_BASE}/api/users`)
...
 const registerRequest = (regObj) => {
-    return axios.post("http://localhost:5001/api/users", regObj)
+    return axios.post(`${API_BASE}/api/users`, regObj)
```

### 3. Deploying Option 1
* **Backend:** Deploy the `restack_backend` folder as a **Web Service** on Render or Railway. Define these Environment Variables:
  - `MONGODB_URI`: *Your MongoDB Atlas connection string*
  - `CLIENT_ORIGIN`: `https://your-react-app.vercel.app` (The frontend URL once deployed)
  - `PORT`: `5001` (Or let the platform decide)
* **Frontend:** Deploy the `restack_client` folder on Vercel or Netlify. Set this Environment Variable during the build configuration:
  - `REACT_APP_API_URL`: `https://your-backend-api.onrender.com` (Your backend service URL)

---

## 📦 Option 2: The Unified / Monolithic Route

In this approach, the backend builds and serves the React frontend static assets. Only one server runs in production.

### 1. Code Changes in `restack_backend`

Modify [index.js](file:///Users/richardcraven/Documents/Projects/restack/restack_backend/index.js) to serve React static files. Add this configuration right before the error handler middleware:

```javascript
const path = require('path');

// 1. Serve static files from the React app build folder
app.use(express.static(path.join(__dirname, '../restack_client/build')));

// 2. Wildcard fallback: send back React's index.html file for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../restack_client/build/index.html'));
});
```

You must also configure your database connection string to support environment variables:
```javascript
const mongoUrl = process.env.MONGODB_URI || `mongodb://localhost:27017/doors_db`;
```

### 2. Code Changes in `restack_client`

Since frontend assets are served by the same port/host, you can convert all API calls in [api-handler.js](file:///Users/richardcraven/Documents/Projects/restack/restack_client/src/utils/api-handler.js) to use relative URLs (e.g. `/api/...`).

#### Diffs for [api-handler.js](file:///Users/richardcraven/Documents/Projects/restack/restack_client/src/utils/api-handler.js):
```diff
 const getAllUsersRequest = () => {
-  return axios.get("http://localhost:5001/api/users")
+  return axios.get("/api/users")
...
 const registerRequest = (regObj) => {
-    return axios.post("http://localhost:5001/api/users", regObj)
+    return axios.post("/api/users", regObj)
```

### 3. Adding Automation Scripts in `restack_backend/package.json`

Add a build script that will install dependencies and compile the frontend React application during backend deployment.

Modify `restack_backend/package.json`:
```json
"scripts": {
  "build": "cd ../restack_client && npm install && npm run build",
  "start": "node index.js"
}
```

### 4. Deploying Option 2
Deploy only the `restack_backend` service to Render, Railway, or a VPS.
* **Environment Variables needed:**
  - `MONGODB_URI`: *Your MongoDB Atlas connection string*
* **Build Command:** `npm run build` (This runs the script to build the frontend first)
* **Start Command:** `npm start`

---

## 💡 Why Option 1 (Decoupled) is Recommended

Option 1 is highly recommended for modern web and game development due to several critical factors:

1. **Optimized Client Delivery via Global CDNs:**
   With Option 1, the frontend is deployed to platforms like Vercel or Netlify. These platforms serve your game's HTML, JS, CSS, and asset files (images, audio) directly from edge servers geographically closest to your players (CDN). This reduces loading time and latency significantly compared to Option 2, where a single Node/Express server must handle asset delivery alongside API requests.

2. **Resource Allocation and Free-Tier Friendly:**
   Free hosting tiers (like Render's or Railway's free structures) often have strict RAM limits (e.g., 512MB). In Option 2, compiling/building a React application (via webpack/Create React App) can easily exceed these memory limits during the build process, causing deployments to crash. Separating them means Vercel handles the React build (with generous limits), while Render only runs the lightweight Express process.

3. **Decoupled CI/CD Pipelines:**
   Under Option 1, when you make a change to only the game's UI or frontend layout, you push to GitHub, and Vercel automatically deploys it in seconds. Under Option 2, any small frontend edit requires building the entire combined project and restarting your main API server, resulting in slow release cycles.

4. **Independent Scaling:**
   If your game gains popularity, game asset hosting (which is static) will consume the bulk of the network bandwidth. In a decoupled setup, Vercel handles this heavy traffic effortlessly, and you only need to scale up your lightweight Express database server if API requests spike.
