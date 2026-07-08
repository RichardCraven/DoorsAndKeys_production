# Restack Deployment Next Steps Checklist

Use this checklist to complete the deployment of the Restack game using **Option 1 (Decoupled Route)**.

---

## 🗄️ Step 1: Database Setup (MongoDB Atlas)
- [ ] Create an account at [mongodb.com](https://www.mongodb.com/).
- [ ] Create a new free cluster (Shared M0 tier).
- [ ] In **Network Access**, add IP address `0.0.0.0/0` (this allows connections from dynamic IPs used by cloud hosts).
- [ ] In **Database Access**, create a database user and record the username and password.
- [ ] Click **Connect** -> **Connect your application** and copy the connection string (looks like `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/doors_db?retryWrites=true&w=majority`).
- [ ] Replace `<username>` and `<password>` with your database user credentials.

---

## 🚀 Step 2: Deploy Backend (Render / Railway)
- [ ] Connect your GitHub repository to your hosting service.
- [ ] Create a new **Web Service** pointing to the repository.
- [ ] Set the root directory of the build to `restack_backend`.
- [ ] Configure the following **Environment Variables**:
  - `MONGODB_URI`: *Your MongoDB Atlas connection string from Step 1.*
  - `CLIENT_ORIGIN`: `https://your-frontend-subdomain.vercel.app` (You will get this URL in Step 3, but you can update it later).
- [ ] Trigger the deploy. Note down your backend URL (e.g., `https://restack-backend.onrender.com`).

---

## 💻 Step 3: Deploy Frontend (Vercel / Netlify)
- [ ] Connect your GitHub repository to Vercel or Netlify.
- [ ] Create a new project, selecting the `restack_client` directory.
- [ ] Configure the following **Environment Variable**:
  - `REACT_APP_API_URL`: *Your backend URL from Step 2 (e.g., `https://restack-backend.onrender.com`).*
- [ ] Deploy the frontend and copy your live game URL.
- [ ] Go back to your backend settings (Step 2) and update the `CLIENT_ORIGIN` environment variable to match your live game URL.
