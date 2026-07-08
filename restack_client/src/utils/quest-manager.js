/**
 * quest-manager.js
 *
 * Manages the three dungeon quest types:
 *   travel       — reach a target floor / location   (wired to blue tiles)
 *   bounty       — defeat a number of specific enemies (wired to red tiles)
 *   item_retrieval — collect a specific item           (wired to green tiles)
 *
 * Usage in DungeonPage:
 *   this.props.questManager.generateQuestSet(dungeon, monsterManager, inventoryManager)
 *   this.props.questManager.getActiveQuests()   // → array of quest objects
 *   this.props.questManager.updateProgress(questId, amount)
 *   this.props.questManager.completeQuest(questId)
 *
 * Colored tile wiring (add to your board-tile step-on handler):
 *   const colorToType = questManager.TILE_COLOR_MAP;
 *   if (tile.color && colorToType[tile.color]) {
 *     const q = questManager.generateQuest(colorToType[tile.color], context);
 *     questManager.addQuest(q);
 *   }
 */
export function QuestManager() {
    this.activeQuests = [];
    this.completedQuests = [];

    /** Maps dungeon tile colors to quest types. */
    this.TILE_COLOR_MAP = {
        blue:  'travel',
        red:   'bounty',
        green: 'item_retrieval',
    };

    // ── Internal helpers ───────────────────────────────────────────────────

    this._uid = () => `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    this._fill = (template, ctx) =>
        template
            .replace('{count}', ctx.count ?? 5)
            .replace('{monster}', ctx.monster ?? 'enemies')
            .replace('{item}', ctx.item ?? 'relic')
            .replace('{level}', ctx.level ?? 'the dungeon');

    const TEMPLATES = {
        travel: [
            { title: 'Reach the Bottom',    desc: 'Travel to floor {level} of the dungeon.' },
            { title: 'Cross the Threshold', desc: 'Find the gate on floor {level} and pass through it.' },
        ],
        bounty: [
            { title: 'Hunt Them Down', desc: 'Defeat {count} {monster} before leaving this level.' },
            { title: 'Clear the Area',  desc: 'Eliminate all enemies on floor {level}.' },
        ],
        item_retrieval: [
            { title: 'Find the Relic',       desc: 'Locate a {item} hidden somewhere in the dungeon.' },
            { title: 'Recover the Artifact', desc: 'Retrieve a {item} from somewhere in the depths.' },
        ],
    };

    // ── Public API ─────────────────────────────────────────────────────────

    /**
     * Creates a single quest of the given type.
     * @param {'travel'|'bounty'|'item_retrieval'} type
     * @param {object} ctx  Optional: { count, monster, item, level }
     * @returns {object|null} Quest object, or null for unknown type.
     */
    this.generateQuest = (type, ctx = {}) => {
        const pool = TEMPLATES[type];
        if (!pool) return null;
        const tmpl = pool[Math.floor(Math.random() * pool.length)];
        return {
            id: this._uid(),
            type,
            title: tmpl.title,
            description: this._fill(tmpl.desc, ctx),
            progress: 0,
            progressTarget: ctx.count ?? 1,
            context: { ...ctx },
            completed: false,
            createdAt: Date.now(),
        };
    };

    /**
     * Generates one quest of each type and replaces the active quest list.
     * Call this when a dungeon run begins.
     */
    this.generateQuestSet = (dungeon, monsterManager, inventoryManager) => {
        this.activeQuests = [];

        const levels = dungeon && Array.isArray(dungeon.levels) ? dungeon.levels : [];
        const deepestLevel = levels.length ? levels[levels.length - 1].id : 1;

        // Travel quest
        const travel = this.generateQuest('travel', { level: deepestLevel });
        if (travel) this.activeQuests.push(travel);

        // Bounty quest — pick a random monster type
        const monsterKeys = monsterManager ? Object.keys(monsterManager.monsters || {}) : [];
        const monsterName = monsterKeys.length
            ? monsterKeys[Math.floor(Math.random() * monsterKeys.length)].replace(/_/g, ' ')
            : 'enemies';
        const bounty = this.generateQuest('bounty', { count: 5, monster: monsterName, level: deepestLevel });
        if (bounty) this.activeQuests.push(bounty);

        // Item retrieval quest — pick a random item from allItems
        const itemKeys = inventoryManager ? Object.keys(inventoryManager.allItems || {}) : [];
        const randomKey = itemKeys.length ? itemKeys[Math.floor(Math.random() * itemKeys.length)] : null;
        const itemName = (randomKey && inventoryManager.allItems[randomKey] && inventoryManager.allItems[randomKey].name)
            ? inventoryManager.allItems[randomKey].name
            : 'lost relic';
        const retrieval = this.generateQuest('item_retrieval', { item: itemName });
        if (retrieval) this.activeQuests.push(retrieval);

        return this.activeQuests;
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
