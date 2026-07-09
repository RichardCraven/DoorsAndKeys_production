/**
 * quest-manager.js
 *
 * Manages the dungeon quest system. Six quest types:
 *   travel         — reach a target floor / pass through a gate
 *   bounty         — defeat a number of specific enemies
 *   item_retrieval — collect a specific item from the dungeon
 *   lore           — read lore tablets scattered in the Back Plane
 *   communion      — commune with ancestral shrines
 *   inscription    — find and read wall inscriptions
 *
 * Quest pool: 12 named quests drawn at dungeon start.
 *
 * Usage in DungeonPage:
 *   this.props.questManager.generateQuestSet(dungeon, monsterManager, inventoryManager)
 *   this.props.questManager.getActiveQuests()   // → array of quest objects
 *   this.props.questManager.updateProgress(questId, amount)
 *   this.props.questManager.completeQuest(questId)
 */
export function QuestManager() {
    this.activeQuests = [];
    this.completedQuests = [];

    // ── Internal helpers ───────────────────────────────────────────────────

    this._uid = () => `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    this._fill = (template, ctx) =>
        template
            .replace('{count}', ctx.count ?? 5)
            .replace('{monster}', ctx.monster ?? 'enemies')
            .replace('{item}', ctx.item ?? 'relic')
            .replace('{level}', ctx.level ?? 'the dungeon')
            .replace('{domain}', ctx.domain ?? 'ancient lore')
            .replace('{class}', ctx.class ?? 'warrior');

    // ── The Quest Pool ─────────────────────────────────────────────────────
    // Each entry is a template that generateQuestSet fills in with context.

    this._POOL = [
        // ── TRAVEL ──────────────────────────────────────────────────────
        {
            key: 'cross_threshold',
            type: 'travel',
            title: 'Cross the Threshold',
            descTemplate: 'Find the gate on floor {level} and pass through it.',
            progressTarget: 1,
            icon: '🗺️',
            color: { bg: '#0f1e35', border: '#3a78c4', title: '#6aabf5' },
            hint: 'Use the Map to find stairs or gates leading deeper.',
        },
        {
            key: 'reach_the_deep',
            type: 'travel',
            title: 'Reach the Deep',
            descTemplate: 'Descend to floor {level} of the dungeon.',
            progressTarget: 1,
            icon: '⬇️',
            color: { bg: '#0f1e35', border: '#3a78c4', title: '#6aabf5' },
            hint: 'Each staircase you find leads you one level deeper.',
        },

        // ── BOUNTY ──────────────────────────────────────────────────────
        {
            key: 'hunt_them_down',
            type: 'bounty',
            title: 'Hunt Them Down',
            descTemplate: 'Defeat {count} {monster} before leaving this level.',
            progressTarget: 5,
            icon: '⚔️',
            color: { bg: '#2a1515', border: '#c0392b', title: '#e74c3c' },
            hint: 'Monster tiles appear as red markers on the minimap.',
        },
        {
            key: 'clear_the_dark',
            type: 'bounty',
            title: 'Clear the Dark',
            descTemplate: 'Defeat {count} {monster} on any floor before camping.',
            progressTarget: 8,
            icon: '💀',
            color: { bg: '#2a1515', border: '#c0392b', title: '#e74c3c' },
            hint: 'Progress carries between miniboards on the same floor.',
        },

        // ── ITEM RETRIEVAL ───────────────────────────────────────────────
        {
            key: 'recover_the_artifact',
            type: 'item_retrieval',
            title: 'Recover the Artifact',
            descTemplate: 'Retrieve a {item} from somewhere in the depths.',
            progressTarget: 1,
            icon: '🔍',
            color: { bg: '#162216', border: '#27ae60', title: '#2ecc71' },
            hint: 'Chests and defeated enemies may carry what you seek.',
        },
        {
            key: 'the_collectors_run',
            type: 'item_retrieval',
            title: "The Collector's Run",
            descTemplate: 'Collect {count} pieces of treasure before leaving the dungeon.',
            progressTarget: 3,
            icon: '💎',
            color: { bg: '#162216', border: '#27ae60', title: '#2ecc71' },
            hint: 'Gold, items, and treasures all count toward this tally.',
        },

        // ── LORE (Lore Tablets) ──────────────────────────────────────────
        {
            key: 'voices_of_the_deep',
            type: 'lore',
            title: 'Voices of the Deep',
            descTemplate: 'Find and read {count} lore tablets hidden in the Back Plane.',
            progressTarget: 2,
            icon: '📖',
            color: { bg: '#1a1430', border: '#7c5cbf', title: '#b48ef0' },
            hint: 'Lore tablets glow faintly in the passages beyond the main path.',
        },
        {
            key: 'seeker_of_truths',
            type: 'lore',
            title: 'Seeker of Truths',
            descTemplate: 'Gather {count} tokens of {domain} by reading ancient tablets.',
            progressTarget: 3,
            icon: '📜',
            color: { bg: '#1a1430', border: '#7c5cbf', title: '#b48ef0' },
            hint: 'Each tablet in the Back Plane adds a domain token to your active crew member.',
        },

        // ── COMMUNION (Shrines) ──────────────────────────────────────────
        {
            key: 'ancestral_call',
            type: 'communion',
            title: 'Ancestral Call',
            descTemplate: 'Commune with an ancestral shrine suited to your {class}.',
            progressTarget: 1,
            icon: '🏛️',
            color: { bg: '#1f1200', border: '#c4851f', title: '#e8b84b' },
            hint: 'Shrines require Resolve above 50 and are one-time per run.',
        },
        {
            key: 'the_long_vigil',
            type: 'communion',
            title: 'The Long Vigil',
            descTemplate: 'Complete the full ritual at {count} shrine without abandoning it.',
            progressTarget: 1,
            icon: '✨',
            color: { bg: '#1f1200', border: '#c4851f', title: '#e8b84b' },
            hint: 'Stand before the shrine and endure the 20-second communion. Do not abandon it.',
        },

        // ── INSCRIPTION ──────────────────────────────────────────────────
        {
            key: 'read_the_walls',
            type: 'inscription',
            title: 'Read the Walls',
            descTemplate: 'Find and read {count} wall inscriptions left by those who came before.',
            progressTarget: 2,
            icon: '✍️',
            color: { bg: '#0d1a14', border: '#3a8c5c', title: '#5ecf92' },
            hint: 'Walk into a golden-edged wall to read an inscription.',
        },
        {
            key: 'the_final_warning',
            type: 'inscription',
            title: 'The Final Warning',
            descTemplate: 'Discover the warning inscription before descending to floor {level}.',
            progressTarget: 1,
            icon: '⚠️',
            color: { bg: '#0d1a14', border: '#3a8c5c', title: '#5ecf92' },
            hint: 'Look for golden edges on walls — these mark inscribed surfaces.',
        },
    ];

    // ── Public API ─────────────────────────────────────────────────────────

    /**
     * Creates a single quest of the given type.
     */
    this.generateQuest = (type, ctx = {}) => {
        const template = this._POOL.find(p => p.type === type);
        if (!template) return null;
        return {
            id: this._uid(),
            key: template.key,
            type,
            title: template.title,
            description: this._fill(template.descTemplate, ctx),
            progress: 0,
            progressTarget: ctx.count ?? template.progressTarget,
            context: { ...ctx },
            completed: false,
            icon: template.icon,
            color: template.color,
            hint: template.hint,
            createdAt: Date.now(),
        };
    };

    /**
     * Generates 3 quests from the full pool for a new dungeon run.
     * Always includes one travel + one bounty, then one drawn from the
     * exploration types (lore/communion/inscription/item_retrieval).
     */
    this.generateQuestSet = (dungeon, monsterManager, inventoryManager, crewManager) => {
        this.activeQuests = [];

        const crew = (crewManager && crewManager.crew) || [];
        const avgLevel = crew.length > 0 ? (crew.reduce((sum, c) => sum + (c.level || 1), 0) / crew.length) : 1;
        const crewSize = crew.length || 1;
        // Calculate dynamic crew power (ranges from 1.0 to 10.0+)
        const crewPower = avgLevel * 0.6 + crewSize * 0.4;

        const levels = dungeon && Array.isArray(dungeon.levels) ? dungeon.levels : [];
        const deepestLevel = levels.length ? levels[levels.length - 1].id : 1;
        const deepestLevelNum = parseInt(deepestLevel, 10);

        // Scale target floor based on crew power (so beginners don't need to reach the deepest floor)
        const targetLevel = isNaN(deepestLevelNum)
            ? deepestLevel
            : Math.max(1, Math.min(deepestLevelNum, Math.floor(crewPower * 1.5)));

        // ── Travel quest ──────────────────────────────────────────────────
        const travelTemplates = this._POOL.filter(p => p.type === 'travel');
        const travelTmpl = travelTemplates[Math.floor(Math.random() * travelTemplates.length)];
        const travel = this._makeFromTemplate(travelTmpl, { level: targetLevel });
        if (travel) this.activeQuests.push(travel);

        // ── Bounty quest ──────────────────────────────────────────────────
        const monsterKeys = monsterManager ? Object.keys(monsterManager.monsters || {}) : [];
        const monsterName = monsterKeys.length
            ? monsterKeys[Math.floor(Math.random() * monsterKeys.length)].replace(/_/g, ' ')
            : 'enemies';
        
        // Scale bounty count dynamically
        const bountyCount = Math.max(2, Math.min(15, Math.round(3 * crewPower)));

        const bountyTemplates = this._POOL.filter(p => p.type === 'bounty');
        const bountyTmpl = bountyTemplates[Math.floor(Math.random() * bountyTemplates.length)];
        const bounty = this._makeFromTemplate(bountyTmpl, { count: bountyCount, monster: monsterName, level: targetLevel });
        if (bounty) this.activeQuests.push(bounty);

        // ── Exploration quest (lore / communion / inscription / retrieval) ─
        const explorationTypes = ['lore', 'communion', 'inscription', 'item_retrieval'];
        const explorationPool = this._POOL.filter(p => explorationTypes.includes(p.type));
        const exploTmpl = explorationPool[Math.floor(Math.random() * explorationPool.length)];

        const LORE_DOMAINS = ['Endurance', 'Perception', 'Willpower', 'Cunning', 'Fortitude'];
        
        // Find a class actually present in the crew, falling back to random if crew is empty
        const CLASS_TYPES = ['ranger', 'sage', 'soldier', 'wizard', 'barbarian', 'monk', 'summoner'];
        const crewClasses = crew.map(c => (c.type || '').toLowerCase()).filter(Boolean);
        const chosenClass = crewClasses.length > 0
            ? crewClasses[Math.floor(Math.random() * crewClasses.length)]
            : CLASS_TYPES[Math.floor(Math.random() * CLASS_TYPES.length)];

        const itemKeys = inventoryManager ? Object.keys(inventoryManager.allItems || {}) : [];
        const randomItemKey = itemKeys.length ? itemKeys[Math.floor(Math.random() * itemKeys.length)] : null;
        const itemName = (randomItemKey && inventoryManager.allItems[randomItemKey]?.name) || 'lost relic';

        // Scale exploration target count dynamically
        let exploCount = exploTmpl.progressTarget;
        if (exploTmpl.type === 'lore' || exploTmpl.type === 'inscription') {
            exploCount = Math.max(1, Math.min(5, Math.round(1.5 * crewPower)));
        } else if (exploTmpl.type === 'item_retrieval' && exploTmpl.key === 'the_collectors_run') {
            exploCount = Math.max(1, Math.min(8, Math.round(2 * crewPower)));
        } else if (exploTmpl.type === 'communion' && exploTmpl.key === 'the_long_vigil') {
            exploCount = Math.max(1, Math.min(3, Math.round(1 * crewPower)));
        }

        const exploCtx = {
            level: targetLevel,
            domain: LORE_DOMAINS[Math.floor(Math.random() * LORE_DOMAINS.length)],
            class: chosenClass,
            item: itemName,
            count: exploCount,
        };
        const explo = this._makeFromTemplate(exploTmpl, exploCtx);
        if (explo) this.activeQuests.push(explo);

        return this.activeQuests;
    };

    /** Internal: build a quest object from a pool template + ctx. */
    this._makeFromTemplate = (tmpl, ctx = {}) => {
        if (!tmpl) return null;
        return {
            id: this._uid(),
            key: tmpl.key,
            type: tmpl.type,
            title: tmpl.title,
            description: this._fill(tmpl.descTemplate, ctx),
            progress: 0,
            progressTarget: ctx.count ?? tmpl.progressTarget,
            context: { ...ctx },
            completed: false,
            icon: tmpl.icon,
            color: tmpl.color,
            hint: tmpl.hint,
            createdAt: Date.now(),
        };
    };

    /** Adds a pre-built quest to the active list. */
    this.addQuest = (quest) => {
        if (quest) this.activeQuests.push(quest);
    };

    /** Increment progress for a quest; auto-completes when target is reached. */
    this.updateProgress = (questId, amount = 1) => {
        const q = this.activeQuests.find(q => q.id === questId);
        if (!q) return;
        q.progress = Math.min(q.progress + amount, q.progressTarget);
        if (q.progress >= q.progressTarget) this.completeQuest(questId);
    };

    /**
     * Update progress for all active quests of a given type.
     * Useful for scripted triggers (e.g., every inscription read updates all inscription quests).
     */
    this.updateProgressByType = (type, amount = 1) => {
        this.activeQuests.forEach(q => {
            if (q.type === type && !q.completed) {
                q.progress = Math.min(q.progress + amount, q.progressTarget);
                if (q.progress >= q.progressTarget) this.completeQuest(q.id);
            }
        });
    };

    /** Move a quest from active to completed. */
    this.completeQuest = (questId) => {
        const idx = this.activeQuests.findIndex(q => q.id === questId);
        if (idx === -1) return null;
        const [q] = this.activeQuests.splice(idx, 1);
        q.completed = true;
        q.completedAt = Date.now();
        this.completedQuests.push(q);
        return q;
    };

    this.getActiveQuests    = () => this.activeQuests;
    this.getCompletedQuests = () => this.completedQuests;

    /** Serialize quest state to a plain object for storage in meta. */
    this.serialize = () => ({
        activeQuests:    this.activeQuests.map(q => ({ ...q })),
        completedQuests: this.completedQuests.map(q => ({ ...q })),
    });

    /** Restore quest state from a previously serialized plain object. */
    this.hydrate = (data) => {
        if (!data) return;
        this.activeQuests    = Array.isArray(data.activeQuests)    ? data.activeQuests    : [];
        this.completedQuests = Array.isArray(data.completedQuests) ? data.completedQuests : [];
    };
}
