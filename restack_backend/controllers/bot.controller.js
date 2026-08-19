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
  const preferredDungeon = req.body.preferredDungeon;
  const dungeonStr = preferredDungeon && preferredDungeon !== 'random' ? `_${preferredDungeon}` : '';
  const botName = `Bot_${randomName}${dungeonStr}_${Math.floor(Math.random() * 1000)}`;
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
      runBotSimulation(botData.username, botData.password, req.body.preferredDungeon, req.body.playstyle);
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

exports.deleteAllReplays = async (req, res, next) => {
  try {
    await BotReplay.deleteMany({});
    res.json({ message: "All bot replays deleted." });
  } catch (error) {
    next(error);
  }
};

const runBotSimulation = async (username, password, preferredDungeon, playstyle) => {
  const actionLog = [];
  const replayEvents = []; // Structured JSON for Replay UI

  let consecutiveMovements = 0;
  let firstMovementTime = null;

  const logAction = (msg, screenshotBase64 = null) => {
    if (msg.startsWith('Pressed movement key:')) {
      consecutiveMovements++;
      if (!firstMovementTime) firstMovementTime = Date.now();
      return;
    }

    if (consecutiveMovements > 0) {
      const moveMsg = `Movement (${consecutiveMovements})`;
      console.log(`[Bot ${username}] ${moveMsg}`);
      actionLog.push(`[${new Date(firstMovementTime).toLocaleTimeString()}] ${moveMsg}`);
      replayEvents.push({ timestamp: firstMovementTime, action: moveMsg, screenshot: screenshotBase64 });
      consecutiveMovements = 0;
      firstMovementTime = null;
    }

    console.log(`[Bot ${username}] ${msg}`);
    actionLog.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    replayEvents.push({ timestamp: Date.now(), action: msg, screenshot: screenshotBase64 });
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
    
    // Optimize memory by blocking media (audio/video) but keep visuals for replays
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (type === 'media') {
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
    const MAX_RUN_TIME = 300 * 1000; // 5 minutes
    
    logAction("Entering game loop...");
    while (runTime < MAX_RUN_TIME) {
        let screenshotBase64 = null;
        try {
            screenshotBase64 = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 30 });
        } catch (e) {
            console.error(`[Bot ${username}] Failed to take screenshot`, e.message);
        }

        let action = "No action";
        try {
            action = await page.evaluate((preferredDungeon) => {
            const isElementVisible = (el) => {
                if (!el || el.offsetParent === null) return false;
                const style = window.getComputedStyle(el);
                if (style.visibility === 'hidden' || style.opacity === '0') return false;
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) return false;
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) return false;
                const topEl = document.elementFromPoint(cx, cy);
                if (!topEl) return false;
                return el.contains(topEl) || topEl.contains(el);
            };

            const getText = (el) => ((el && el.textContent) || '').trim().toLowerCase();

            // 1. First check if we need to select a dungeon
            const trigger = document.querySelector('.custom-select-trigger');
            if (trigger && !trigger.classList.contains('selected') && isElementVisible(trigger)) {
                let menuItem = null;
                if (preferredDungeon && preferredDungeon !== 'random') {
                    const items = Array.from(document.querySelectorAll('.menu-item'));
                    menuItem = items.find(item => {
                        const span = item.querySelector('span');
                        return span && span.textContent.trim() === preferredDungeon;
                    });
                }
                if (!menuItem) {
                    menuItem = document.querySelector('.menu-item');
                }
                
                const isMenuOpen = menuItem && menuItem.offsetParent !== null;

                if (isMenuOpen) {
                    menuItem.scrollIntoView({ block: "center", behavior: "instant" });
                    menuItem.click();
                    const span = menuItem.querySelector('span');
                    const selectedName = span ? span.textContent.trim() : 'random';
                    return `Selected Dungeon: ${selectedName}`;
                } else {
                    trigger.click();
                    return "Opened Dungeon Select Menu";
                }
            }

            // Find interactable buttons, playable cards, & quick actions
            const candidates = Array.from(document.querySelectorAll('button, .pe-fanned-card--playable, .quick-action-btn'));
            const safeButtons = candidates.filter(b => {
                const txt = getText(b);
                const title = (b.title || '').toLowerCase();
                // Exclude administrative / non-gameplay buttons to prevent random UI clicks
                if (txt.includes('logout') || title.includes('logout') || txt.includes('🚪') ||
                    txt.includes('delete') || txt.includes('generate bot') || txt.includes('user manager') ||
                    txt.includes('codex') || txt.includes('skill tree')) return false;
                if (b.disabled) return false;
                if (!isElementVisible(b)) return false;
                return true;
            });
            
            // Priority 1: Dungeon Entry & Intro Skipping
            const enterBtn = safeButtons.find(b => getText(b) === 'enter dungeon');
            if (enterBtn) { enterBtn.click(); return 'Entered Dungeon'; }

            const skipBtn = safeButtons.find(b => getText(b).includes('skip'));
            if (skipBtn) { skipBtn.click(); return 'Skipped Intro/Dialog'; }

            // Priority 2: Health Check (< 50%) -> Attempt to Recuperate
            let currentHp = 0, maxHp = 0;
            try {
                const metaStr = localStorage.getItem('restack_meta') || localStorage.getItem('meta');
                if (metaStr) {
                    const meta = JSON.parse(metaStr);
                    if (Array.isArray(meta.crew) && meta.crew.length > 0) {
                        meta.crew.forEach(m => {
                            if (m) {
                                currentHp += (typeof m.hp === 'number' ? m.hp : 0);
                                const mMax = m.maxHp || (m.stats && m.stats.baseHp) || 10;
                                maxHp += mMax;
                            }
                        });
                    }
                }
            } catch (e) {}

            const healthRatio = maxHp > 0 ? (currentHp / maxHp) : 1;
            if (healthRatio < 0.50) {
                const recuperateBtn = safeButtons.find(b => {
                    const txt = getText(b);
                    return txt.includes('recuperate') || txt.includes('camp') || txt.includes('rest');
                });
                if (recuperateBtn) {
                    recuperateBtn.click();
                    return `Crew Health at ${Math.round(healthRatio * 100)}% - Recuperating`;
                }
                return `RECUPERATE_KEY:${Math.round(healthRatio * 100)}`;
            }

            // Priority 3: Picking up Items / Looting
            const lootBtn = safeButtons.find(b => {
                const txt = getText(b);
                return txt.includes('take all') || txt.includes('loot') || txt.includes('pick up') || txt.includes('claim');
            });
            if (lootBtn) {
                lootBtn.click();
                return `Looted Item: ${getText(lootBtn)}`;
            }

            // Priority 4: Fighting Enemies & Combat Actions
            const combatBtn = safeButtons.find(b => {
                const txt = getText(b);
                return txt === 'ok' || txt.includes('continue') || txt.includes('attack') || txt.includes('strike') ||
                       txt.includes('end turn') || txt.includes('exit scrimmage') || txt.includes('claim victory');
            });
            if (combatBtn) {
                combatBtn.click();
                return `Combat Action: ${getText(combatBtn)}`;
            }

            const cardBtn = safeButtons.find(b => b.classList && b.classList.contains('pe-fanned-card--playable'));
            if (cardBtn) {
                cardBtn.click();
                return 'Played Combat Card';
            }

            // Default Behavior: Pathfind & Explore around the map (no random button clicking)
            return 'MOVE';
        }, preferredDungeon);
        } catch (evalErr) {
            if (evalErr.message.includes('detached Frame') || evalErr.message.includes('Execution context was destroyed')) {
                await sleep(500);
                continue;
            } else {
                throw evalErr;
            }
        }

        if (typeof action === 'string' && action.startsWith('RECUPERATE_KEY')) {
            const hpPct = action.split(':')[1] || 'below 50';
            await page.keyboard.press('r');
            logAction(`Crew Health at ${hpPct}% - Pressed 'r' to Recuperate`, screenshotBase64);
        } else if (action === 'MOVE') {
            const dirs = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            const dir = dirs[Math.floor(Math.random() * dirs.length)];
            await page.keyboard.press(dir);
            logAction(`Pressed movement key: ${dir.replace('Arrow', '')}`, screenshotBase64);
        } else if (action) {
            logAction(`Clicked: ${action}`, screenshotBase64);
        } else {
            logAction("No actions available.", screenshotBase64);
        }

        // Sleep to simulate human delay
        const delay = 300 + Math.random() * 500; 
        await sleep(delay);
        runTime += delay;
    }

    logAction("5 minute simulation complete.");
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
