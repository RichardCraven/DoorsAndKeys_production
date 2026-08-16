const userSchema = require('../models/user.model');
const BotReplay = require('../models/botReplay.model');
const { sendNotificationEmail } = require('../utils/email');
const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Generate Bot
exports.generateBot = async (req, res, next) => {
  const botNames = [
    "Aisha", "Mateo", "Wei", "Chloe", "Fatima", 
    "Sven", "Priya", "Omar", "Yuki", "Lars",
    "Mei", "Diego", "Nadia", "Ivan", "Amira",
    "Carlos", "Chen", "Sofia", "Tariq", "Elena"
  ];
  const randomName = botNames[Math.floor(Math.random() * botNames.length)];
  const botName = `Bot_${randomName}_${Math.floor(Math.random() * 1000)}`;
  const botPassword = 'botpassword123';
  
  const botMetadata = {
    skipIntro: true,
    dungeonId: null,
    boardIndex: null,
    tileIndex: null,
    inventory: [],
    crew: [
      {
        id: "bot_char_1",
        name: "BotBarbarian",
        charClass: "barbarian",
        stats: { str: 8, int: 3, dex: 4, fort: 6, baseHp: 16 },
        hp: 16,
        maxHp: 16,
        level: 1,
        xp: 0,
        skills: ['sword_swing', 'barbarian_cleave', 'barbarian_berserker', 'fury'],
        equipment: {
          right: null, left: null, head: null, chest: null,
          boots: null, 'ancillary-left': null, 'ancillary-right': null
        }
      },
      {
        id: "bot_char_2",
        name: "BotMonk",
        charClass: "monk",
        stats: { str: 6, int: 6, dex: 8, fort: 6, baseHp: 12 },
        hp: 12,
        maxHp: 12,
        level: 1,
        xp: 0,
        skills: ['monk_palm_strike', 'ethereal_speed', 'monk_meditation', 'inner_peace'],
        equipment: {
          right: null, left: null, head: null, chest: null,
          boots: null, 'ancillary-left': null, 'ancillary-right': null
        }
      },
      {
        id: "bot_char_3",
        name: "BotWizard",
        charClass: "wizard",
        stats: { str: 3, int: 9, dex: 5, fort: 4, baseHp: 10 },
        hp: 10,
        maxHp: 10,
        level: 1,
        xp: 0,
        skills: ['fireball', 'ice_bolt', 'arcane_shield', 'mana_overflow'],
        equipment: {
          right: null, left: null, head: null, chest: null,
          boots: null, 'ancillary-left': null, 'ancillary-right': null
        }
      }
    ]
  };

  const botData = {
    username: botName,
    password: botPassword,
    isAdmin: true,
    metadata: JSON.stringify(botMetadata)
  };

  userSchema.create(botData, (error, data) => {
    if (error) {
      return next(error);
    } else {
      // Send notification email asynchronously
      sendNotificationEmail(
        `New User Registration - DreamTower (Bot: ${botData.username})`,
        `A new bot has been generated on DreamTower!\n\nUsername: ${botData.username}`
      );
      
      // Respond to frontend immediately
      res.json(data);
      
      // Run bot simulation in background
      runBotSimulation(botData.username, botData.password);
    }
  });
};

exports.getReplays = async (req, res, next) => {
  try {
    const replays = await BotReplay.find().sort({ createdAt: -1 }).limit(20);
    res.json(replays);
  } catch (error) {
    next(error);
  }
};

const runBotSimulation = async (username, password) => {
  const actionLog = [];
  const replayEvents = []; // Structured JSON for Replay UI

  let consecutiveMovements = 0;
  let firstMovementTime = null;

  const logAction = (msg) => {
    if (msg.startsWith('Pressed movement key:')) {
      consecutiveMovements++;
      if (!firstMovementTime) firstMovementTime = Date.now();
      return;
    }

    if (consecutiveMovements > 0) {
      const moveMsg = `Movement (${consecutiveMovements})`;
      console.log(`[Bot ${username}] ${moveMsg}`);
      actionLog.push(`[${new Date(firstMovementTime).toLocaleTimeString()}] ${moveMsg}`);
      replayEvents.push({ timestamp: firstMovementTime, action: moveMsg });
      consecutiveMovements = 0;
      firstMovementTime = null;
    }

    console.log(`[Bot ${username}] ${msg}`);
    actionLog.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    replayEvents.push({ timestamp: Date.now(), action: msg });
  };

  logAction("Starting simulation...");
  const targetUrl = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
  let browser;

  try {
    // Launch headless browser with memory-saving flags
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Critical for Docker/Render environments
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Optimize memory by blocking images, CSS, and fonts
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (type === 'image' || type === 'stylesheet' || type === 'font' || type === 'media') {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    logAction(`Navigating to ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });
    
    // 1. Log in
    logAction("Attempting to log in...");
    
    // The login page has inputs with placeholders "Enter name" and "Enter password"
    await page.waitForSelector('input[placeholder="Enter name"]', { timeout: 10000 });
    await page.type('input[placeholder="Enter name"]', username, { delay: 50 });
    await page.type('input[placeholder="Enter password"]', password, { delay: 50 });
    
    logAction("Submitting login form...");
    // Find the login button ("Enter Dungeon") and click it
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const loginBtn = buttons.find(b => b.textContent.trim() === 'Enter Dungeon');
        if (loginBtn) loginBtn.click();
    });

    await sleep(3000);
    
    // After login, we are at the landing page. We need to select a dungeon and click "Enter Dungeon".
    
    let runTime = 0;
    const MAX_RUN_TIME = 180 * 1000; // 3 minutes
    
    logAction("Entering game loop...");
    while (runTime < MAX_RUN_TIME) {
        const action = await page.evaluate(() => {
            // First check if we need to select a dungeon
            const trigger = document.querySelector('.custom-select-trigger');
            if (trigger && !trigger.classList.contains('selected')) {
                // If menu is open, click first item
                const menuItem = document.querySelector('.menu-item');
                if (menuItem && menuItem.offsetParent !== null) {
                    menuItem.click();
                    return "Selected a Dungeon";
                } else {
                    trigger.click();
                    return "Opened Dungeon Select Menu";
                }
            }

            const buttons = Array.from(document.querySelectorAll('button'));
            const safeButtons = buttons.filter(b => {
                const txt = b.textContent.toLowerCase();
                if (txt.includes('logout') || txt.includes('delete') || txt.includes('generate bot') || txt.includes('user manager')) return false;
                if (b.offsetParent === null) return false; // not visible
                if (b.disabled) return false; // Don't click disabled buttons
                return true;
            });
            
            if (safeButtons.length > 0) {
                // Priority 1: Navigation & Progression
                const enterBtn = safeButtons.find(b => b.textContent.trim() === 'Enter Dungeon');
                if (enterBtn) { enterBtn.click(); return 'Enter Dungeon'; }

                const skipBtn = safeButtons.find(b => b.textContent.trim().toLowerCase().includes('skip'));
                if (skipBtn) { skipBtn.click(); return skipBtn.textContent.trim(); }

                // Priority 2: High priority game actions (Combat, Loot, Confirmations)
                const actionBtn = safeButtons.find(b => {
                    const txt = b.textContent.toLowerCase();
                    return txt === 'ok' || txt.includes('continue') || txt.includes('attack') || txt.includes('loot') || txt.includes('leave') || txt.includes('close');
                });
                
                if (actionBtn) {
                    actionBtn.click();
                    return actionBtn.textContent.trim() || 'Action Button';
                }

                // If no high priority buttons, 50/50 chance to MOVE or click random button
                if (Math.random() > 0.5) {
                    return 'MOVE';
                }

                const randomBtn = safeButtons[Math.floor(Math.random() * safeButtons.length)];
                const btnName = randomBtn.textContent || randomBtn.className || 'Unknown Button';
                randomBtn.click();
                return btnName;
            }
            return 'MOVE';
        });

        if (action === 'MOVE') {
            const dirs = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            const dir = dirs[Math.floor(Math.random() * dirs.length)];
            await page.keyboard.press(dir);
            logAction(`Pressed movement key: ${dir.replace('Arrow', '')}`);
        } else if (action) {
            logAction(`Clicked: ${action}`);
        } else {
            logAction("No actions available.");
        }

        // Sleep to simulate human delay, reduced by 50%
        const delay = 750 + Math.random() * 1000; 
        await sleep(delay);
        runTime += delay;
    }

    logAction("3 minute simulation complete.");
  } catch (error) {
    logAction(`ERROR: ${error.message}`);
  } finally {
    if (browser) {
      logAction("Closing browser.");
      await browser.close();
    }
    
    // Save the structured events to the database for the Replay UI
    try {
      await BotReplay.create({
        botUsername: username,
        actions: replayEvents
      });
      console.log(`[Bot ${username}] Successfully saved replay to database.`);
    } catch (dbError) {
      console.error(`[Bot ${username}] Failed to save replay:`, dbError);
    }

    // Send email with readable results
    const emailBody = `Bot Simulation Run for ${username}\n\nLog Output:\n${actionLog.join('\n')}`;
    sendNotificationEmail(`Bot Run Complete: ${username}`, emailBody);
  }
};
