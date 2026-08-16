# Bot Users Implementation Plan

## Overview
This plan outlines the implementation of a "Bot User" system that can realistically simulate human gameplay. The system will create a bot on demand, let it play the game for 1 minute using human-like delays, and then email a log of its actions to the admin. 

## Architectural Approach
Because the vast majority of the game logic and UI state resides in the React frontend (`DungeonPage.js`, `CombatManagerRedux`, etc.), recreating this logic purely on the backend to simulate gameplay would require a massive and complex rewrite.

Instead, the most pragmatic and robust approach is to use a **Headless Browser Automation tool (like Puppeteer or Playwright)** running on the Node.js backend. 
* This allows the bot to load the actual React app in a hidden backend browser, perfectly simulating a real user.
* It easily supports human-like interaction (e.g., adding realistic delays between reading the screen and clicking buttons).
* It perfectly sets up your future goal of running these bots offline via scheduled backend events, as the simulation logic will already be decoupled from any active human browser session.

---

## Phase 1: First Iteration (On-Demand Bots)

### 1. Frontend Updates (`restack_client/src/pages/UserManagerPage.js`)
*   **Generate Bot Button:** Add a "Generate Bot" button near the top of the User Manager panel.
*   **API Call:** When clicked, it will dispatch a POST request to a new backend endpoint: `/api/bots/generate`.
*   **UI Feedback:** Show a simple toast or alert confirming the bot has been generated and is now playing the game in the background.

### 2. Backend API & Registration (`restack_backend/routes_new/bots-routes.js`)
*   **New Endpoint:** Create `POST /api/bots/generate`.
*   **Bot User Creation:** Generate a random username (e.g., `Bot_Alpha_123`) and a standard password. Register this user in the database.
*   **New User Email:** This registration will naturally trigger the existing `sendNotificationEmail` logic, fulfilling the requirement to receive a "new user" email alert.
*   **Async Execution:** The endpoint will return a `200 OK` to the frontend immediately, while spawning the Bot Simulator process asynchronously in the background so the admin's UI isn't blocked for a minute.

### 3. Bot Simulator Process (Puppeteer running on Backend)
*   **Setup:** Add `puppeteer` to the `restack_backend` dependencies.
*   **The Script:**
    1.  Launch a hidden headless browser instance.
    2.  Navigate to the live game URL (or localhost in dev).
    3.  Log in using the newly generated bot credentials.
    4.  Enter the dungeon/game world.
    5.  **The Play Loop (Duration: 1 Minute):**
        *   Parse the DOM to find available actions (e.g., movement arrows, attack buttons, decisions).
        *   Implement a "Thinking & Cursor Movement" delay (e.g., `await sleep(2000 + Math.random() * 1500)`) to ensure actions cannot be chained instantly.
        *   Execute a synthetic click on the chosen action.
        *   Record the action taken (e.g., "Moved North", "Attacked Goblin") into an internal `actionLog` array.
    6.  **Cleanup:** After 60 seconds, gracefully close the headless browser.

### 4. Log Collection & Email
*   Once the 1-minute Puppeteer session concludes, the backend will format the `actionLog` array into a readable summary string.
*   It will utilize the existing `utils/email.js` -> `sendNotificationEmail` function to send this log to the admin email on file (`ADMIN_EMAIL`).

---

## Phase 2: Future Iteration (Offline Background Scheduling)

Because Phase 1 builds the bot simulation in the Node.js backend using a headless browser, transitioning to offline scheduled events is straightforward.

*   **Job Scheduler:** We can integrate a lightweight scheduler like `node-cron` into the backend (`restack_backend/index.js`).
*   **Cron Jobs:** We can define rules (e.g., "Run every hour" or "Run at 2 AM").
*   **Execution:** The cron job will simply invoke the exact same Puppeteer script created in Phase 1. It can either generate a brand new bot, or wake up a pool of existing bots, let them roam the server for a set duration, and log the results—all completely offline without any admin needing to click a button or even have the website open.

## Next Steps
Let me know if this plan aligns with your vision. If approved, I can begin installing Puppeteer on the backend and building out the API endpoint and the "Generate Bot" button.
