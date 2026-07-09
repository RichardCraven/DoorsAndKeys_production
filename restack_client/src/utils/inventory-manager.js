import BREW_INGREDIENTS from './brew-ingredients';
import { REAGENTS } from './reagents';

function copy(item) {
    // Guard against undefined/null inputs — JSON.stringify(undefined) -> undefined
    // which makes JSON.parse throw. Return null for missing items so callers
    // can choose to skip them.
    if (item === undefined || item === null) return null;
    return JSON.parse(JSON.stringify(item));
}
const swords = [ // eslint-disable-line no-unused-vars
    'longsword_sword',
    'broadsword_sword',
    'golden_gladius_sword',
    'claymore_sword',
    'katana_sword',
    'falchion_sword',
    'cutlass_sword',
    'gladius_sword',
    'greatsword_sword',
    'shortsword_sword',
    'wyrmsbane_sword',
    'doomreaver_sword',
    'nightfall_sword',
    'dreadedge_sword',
    'sunsteel_sword',
    'voidrender_sword',
    'warlords_cleaver_sword',
    'emberbrand_sword',
    'frostbite_sword',
    'bloodsong_sword',
    'shadowfang_sword',
    'skymourne_sword',
    'opalveil_sword',
    'titans_claw_sword',
    'entropy_sword',
]

const axes = [
    'woodcutters_axe',
    'bloodcleaver_axe',
    'hillbiter_axe',
    'ironcleaver_axe',
    'rune_axe',
    'timberfall_axe',
    'grovehack_axe',
    'stormsplitter_axe',
    'bonecutter_axe',
    'frostedge_axe',
    'emberchop_axe',
    'razorfang_axe',
    'stonebreaker_axe',
    'mossreaper_axe',
    'warcleaver_axe',
    'blackroot_axe',
    'dawnsplitter_axe',
    'duskbane_axe',
    'thunderhewer_axe',
    'skullsplitter_axe',
    'giantsbane_axe',
    'vinecutter_axe',
    'obsidian_axe',
    'ashwood_axe',
    'drakebane_axe'
];

export function InventoryManager() {
    this.tiles = [];
    this.gold = 0;
    this.shimmering_dust = 0;
    this.totems = 0;

    this.charms_names = [
        'beetle_charm',
        'demonskull_charm',
        'evilai_charm',
        'hamsa_charm',
        'lundi_charm',
        'nukta_charm',
        'scarab_charm'
    ]
    this.amulets_names = [
        'elasi_amulet',
        'darkarrow_amulet',
        'elemental_amulet',
        'silver_amulet',
        'ruby_amulet',
        'acorn_amulet',
        'voodoo_amulet',
        'yaga_amulet',
        'temprance_amulet',
        'emerald_amulet',
        'maconic_amulet'
    ]
    this.shields_names = []
    this.boots_names = [
        'travelers_boots',
        'wayfinders_boots',
        'oily_boots',
        'highwaymans_boots',
        'voyagers_boots',
        'northerners_boots',
        'midas_boots',
        'sentinels_boots',
        'imperial_boots',
        'mariners_boots',
        'magicians_boots',
        'sorcerers_boots',
        'shadow_boots',
        'twilight_boots',
        'moonstone_boots',
        'eldritch_boots',
        'glimmering_boots',
        'princes_boots',
        'lords_boots',
        'golems_boots',
        'darklings_boots',
        'ornate_boots',
        'rainmans_boots'
    ]
    this.masks_names = [
        'crimson_mask',
        'eldritch_mask',
        'entropic_mask',
        'necrotic_mask',
        'paradox_mask',
        'seraphic_mask',
        'shadow_mask',
        'twilight_mask',
    ]
    this.helms_names = [
        'basic_helm',
        'knight_helm',
        'spartan_helm',
        'legionaire_helm',
        'cretan_helm',
        'archer_helm',
        'kettle_hat',
        'hounskull',
        'plague_helm',
        'warlord_helm',
        'juggernaut_helm',
        'moonlord_helm',
        'witch_knight_helm',
        'collosus_helm',
        'omega_helm',
        'immortal_helm',
        'nasal_helm_upgradeable',
        'nasal_helm_upgradeable_upgraded',
        'soldier_helm_upgradeable',
        'soldier_helm_upgradeable_upgraded',
        'crusader_helm_upgradeable',
        'crusader_helm_upgradeable_upgraded',
        'cavalry_helm_upgradeable',
        'cavalry_helm_upgradeable_upgraded',
        'war_helm_upgradeable',
        'war_helm_upgradeable_upgraded',
        'coif_helm_upgradeable',
        'coif_helm_upgradeable_upgraded',
        'gladiator_helm_upgradeable',
        'gladiator_helm_upgradeable_upgraded',
        'battle_mage_helm_upgradeable',
        'battle_mage_helm_upgradeable_upgraded',
        'knight_helm_upgradeable',
        'knight_helm_upgradeable_upgraded',
        'janissary_helm_upgradeable',
        'janissary_helm_upgradeable_upgraded',
        'bascinet_upgradeable',
        'bascinet_upgradeable_upgraded',
        'imperial_helm_upgradeable',
        'imperial_helm_upgradeable_upgraded',
        'ranger_hood_upgradeable',
        'ranger_hood_upgradeable_upgraded'
    ]
    this.tabards_names = [
        'ockneys_tabard',
        'sigilum_tabard',
        'mercurial_tabard',
        'wayfair_tabard',
        'justicairs_tabard',
        'livinricks_tabard',
        'sorcerers_tabard',
        'medici_tabard',
        'ophiniomancers_tabard',
        'runic_tabard',
        'oslins_tabard',
        'astral_tabard',
        'archmages_tabard'
    ]
    this.wands_names = [
        'cloudfire_wand',
        'animus_wand',
        'glyndas_wand',
        'justicator_wand',
        'willowcaster'
    ]
    this.staves_names = [
        'archmages_staff',
        'enchanters_staff',
        'imperial_mage_staff',
        'staff_of_espilon',
        'staff_of_marduk',
        'staff_of_omicron',
        'staff_of_tomorrow'
    ]
    this.misc_names = [
        'crown',
        'lantern',
        'moxadite_banner',
        'benthachite_banner',
        'pyremnite_banner'
    ]
    this.jewels_names = [
        'ruby',
        'sapphire',
        'amber',
        'ruby_shards',
        'sapphire_shards',
        'amber_shards',
        'polished_ruby',
        'polished_sapphire',
        'polished_amber',
        'moxite',
        'pyrite',
        'benthite',
        'memnite',
        'labradite',
        'malachite',
        'onyx',
        'moxite_cluster',
        'pyrite_cluster',
        'benthite_cluster',
        'memnite_cluster',
        'labradite_cluster',
        'malachite_cluster',
        'onyx_cluster',
        'yazatas_focus',
        'yazatas_focus_shards',
        'mishnes_focus',
        'mishnes_focus_shards',
        'masekets_focus',
        'masekets_focus_shards',
        'abyssal_crystal',
        'abyssal_crystal_shards'
    ]
    this.runes_names = [
        'volcanic_rune',
        'stone_rune',
        'pewter_rune',
        'earthen_rune',
        'onyxian_rune',
        'shadow_rune',
        'feldspar_rune',
        'archaic_rune',
        'sulphuric_rune',
        'volcanic_rune_shard',
        'stone_rune_shard',
        'pewter_rune_shard',
        'earthen_rune_shard',
        'onyxian_rune_shard',
        'shadow_rune_shard',
        'feldspar_rune_shard',
        'archaic_rune_shard',
        'sulphuric_rune_shard'
    ]
    this.keys_names = [
        'minor_key',
        'major_key',
        'treasury_key',
        'lockbox_key',
        'cryptic_key',
        'necrotic_key',
        'necrotic_master_key',
        'violet_key',
        'rubicund_key',
        'cyan_key',
        'imperial_key',
        'dimensional_key',
        'master_key'
    ]
    this.weapons_names = axes.concat([
        'flail',
        'spear',
        'sword',
        'longbow',
        'sylvan_bow',
        'sentinels_bow',
        'outriders_bow',
        'cryonic_bow',
        'vitriolic_bow',
        'arcane_bow',
        'merklins_peacekeeper',
        'scepter',
        'longsword_sword',
        'broadsword_sword',
        'golden_gladius_sword',
        'claymore_sword',
        'katana_sword',
        'falchion_sword',
        'cutlass_sword',
        'gladius_sword',
        'greatsword_sword',
        'shortsword_sword',
        'wyrmsbane_sword',
        'doomreaver_sword',
        'nightfall_sword',
        'dreadedge_sword',
        'sunsteel_sword',
        'voidrender_sword',
        'warlords_cleaver_sword',
        'emberbrand_sword',
        'frostbite_sword',
        'bloodsong_sword',
        'shadowfang_sword',
        'skymourne_sword',
        'opalveil_sword',
        'titans_claw_sword',
        'entropy_sword',
    ]);
    this.potions_names = [
        'minor_health_potion',
        'major_health_potion',
        'grand_health_potion',
        'supreme_health_potion',
    ]

    const GATES = [ // eslint-disable-line no-unused-vars
        {
            key: 'archway',
            requires: ''
        },
        {
            key: 'dungeon_door',
            requires: 'minor_key'
        },
        {
            key: 'gryphon_gate',
            requires: 'major_key'
        },
        {
            key: 'bat_gate',
            requires: 'major_key'
        },
        {
            key: 'evil_gate',
            requires: 'ornate_key'
        }
    ]
    this.consumables = {
        minor_health_potion: {
            effect: 'health gain',
            amount: 15,
            icon: 'minor_health_potion',
            type: 'consumable',
            name: 'minor health potion',
            equippedBy: null,
            description: 'Minor health potions replenish 15% total HP'
        },
        major_health_potion: {
            effect: 'health gain',
            amount: 35,
            icon: 'major_health_potion',
            type: 'consumable',
            name: 'major health potion',
            equippedBy: null,
            description: 'Major health potions replenish 35% total HP'
        },
        grand_health_potion: {
            effect: 'health gain',
            amount: 80,
            icon: 'grand_health_potion',
            type: 'consumable',
            name: 'grand health potion',
            equippedBy: null,
            description: 'Grand health potions replenish 80% total HP'
        },
        supreme_health_potion: {
            effect: {
                type: 'heal_and_endurance',
                healPct: 100,
                endurance: 100,
                cleanse: ['poison', 'poisoned', 'bleed', 'bleeding', 'frozen', 'stunned', 'stun', 'ensnared', 'bind', 'silenced', 'silence', 'slowed', 'slow']
            },
            icon: 'supreme_health_potion',
            type: 'consumable',
            name: 'supreme health potion',
            equippedBy: null,
            description: 'Supreme health potions replenish 100% total HP, restore 100% Endurance, and cleanse all debuffs'
        },
        minor_key: {
            effect: 'key',
            type: 'key',
            icon: 'minor_key',
            name: 'minor key',
            description: 'Minor keys open locked dungeon doors'
        },
        major_key: {
            effect: 'key',
            type: 'key',
            icon: 'major_key',
            name: 'major key',
            description: 'Major keys open bat gates and gryphon gates'
        },
        ornate_key: {
            effect: 'key',
            type: 'key',
            icon: 'ornate_key',
            name: 'ornate key',
            description: 'Ornate keys open void gates and planar gates'
        },
        treasury_key: {
            effect: 'key',
            type: 'key',
            icon: 'treasury_key',
            name: 'treasury key',
            description: 'Treasury keys unlock treasure vaults and secure chambers'
        },
        cryptic_key: {
            effect: 'key',
            type: 'key',
            icon: 'cryptic_key',
            name: 'cryptic key',
            description: 'A strange, cryptic key with mysterious runes etched upon its surface.'
        },
        lockbox_key: {
            effect: 'key',
            type: 'key',
            icon: 'lockbox_key',
            name: 'lockbox key',
            description: 'Lockbox keys open sealed lockboxes and personal caches'
        },
        necrotic_key: {
            effect: 'key',
            type: 'key',
            icon: 'necrotic_key',
            name: 'necrotic key',
            description: 'Necrotic keys unlock cursed doors in undead lairs'
        },
        necrotic_master_key: {
            effect: 'key',
            type: 'key',
            icon: 'necrotic_master_key',
            name: 'necrotic master key',
            description: 'Necrotic master keys open any necrotic seal or death chamber'
        },
        violet_key: {
            effect: 'key',
            type: 'key',
            icon: 'violet_key',
            name: 'violet key',
            description: 'Violet keys are attuned to arcane vaults and mage towers'
        },
        rubicund_key: {
            effect: 'key',
            type: 'key',
            icon: 'rubicund_key',
            name: 'rubicund key',
            description: 'Rubicund keys open fire-forged locks found in volcanic sanctums'
        },
        cyan_key: {
            effect: 'key',
            type: 'key',
            icon: 'cyan_key',
            name: 'cyan key',
            description: 'Cyan keys are used to access aquatic passages and flooded vaults'
        },
        imperial_key: {
            effect: 'key',
            type: 'key',
            icon: 'imperial_key',
            name: 'imperial key',
            description: 'Imperial keys grant access to grand halls and royal chambers'
        },
        dimensional_key: {
            effect: 'key',
            type: 'key',
            icon: 'dimensional_key',
            name: 'dimensional key',
            description: 'Dimensional keys unlock portals between planes of existence'
        },
        master_key: {
            effect: 'key',
            type: 'key',
            icon: 'master_key',
            name: 'master key',
            description: 'Master keys can open almost any mundane lock'
        },
    }
    this.weapons = {
        /* named axes mapped to numbered axe icons */
        woodcutters_axe: { damage: 15, icon: 'axe_1', type: 'weapon', subtype: 'cutting', tier: 1, name: "Woodcutter's Axe", range: 'close', equippedBy: null, description: "A sturdy woodcutter's axe +30% atk [Tier 1]" },
        bloodcleaver_axe: { damage: 18, icon: 'axe_2', type: 'weapon', subtype: 'cutting', tier: 1, name: "Bloodcleaver Axe", range: 'close', equippedBy: null, description: 'A vicious cleaver +32% atk [Tier 1]' },
        hillbiter_axe: { damage: 19, icon: 'axe_3', type: 'weapon', subtype: 'cutting', tier: 1, name: 'Hillbiter Axe', range: 'close', equippedBy: null, description: 'A hillbiter axe +34% atk [Tier 1]' },
        ironcleaver_axe: { damage: 20, icon: 'axe_4', type: 'weapon', subtype: 'cutting', tier: 1, name: 'Ironcleaver Axe', range: 'close', equippedBy: null, description: 'An iron cleaver +36% atk [Tier 1]' },
        rune_axe: { damage: 22, icon: 'axe_5', type: 'weapon', subtype: 'cutting', tier: 1, name: 'Rune Axe', range: 'close', equippedBy: null, description: 'A rune-etched axe +38% atk [Tier 1]' },
        timberfall_axe: { damage: 24, icon: 'axe_6', type: 'weapon', subtype: 'cutting', tier: 1, name: 'Timberfall Axe', range: 'close', equippedBy: null, description: 'A timberfall axe +40% atk [Tier 1]' },
        grovehack_axe: { damage: 25, icon: 'axe_7', type: 'weapon', subtype: 'cutting', tier: 1, name: 'Grovehack Axe', range: 'close', equippedBy: null, description: 'A grovehack axe +42% atk [Tier 1]' },
        stormsplitter_axe: { damage: 26, icon: 'axe_8', type: 'weapon', subtype: 'cutting', tier: 1, name: 'Stormsplitter Axe', range: 'close', equippedBy: null, description: 'A stormsplitter axe +44% atk [Tier 1]' },
        bonecutter_axe: { damage: 27, icon: 'axe_9', type: 'weapon', subtype: 'cutting', tier: 1, name: 'Bonecutter Axe', range: 'close', equippedBy: null, description: 'A bonecutter axe +46% atk [Tier 1]' },
        frostedge_axe: { damage: 28, icon: 'axe_10', type: 'weapon', subtype: 'cutting', tier: 1, name: 'Frostedge Axe', range: 'close', equippedBy: null, description: 'A frostedge axe +48% atk [Tier 1]' },
        emberchop_axe: { damage: 30, icon: 'axe_11', type: 'weapon', subtype: 'cutting', tier: 1, name: 'Emberchop Axe', range: 'close', equippedBy: null, description: 'An emberchop axe +50% atk [Tier 1]' },

        razorfang_axe: { damage: 40, icon: 'axe_12', type: 'weapon', subtype: 'cutting', tier: 2, name: 'Razorfang Axe', range: 'close', equippedBy: null, description: 'A razorfang axe +52% atk [Tier 2]' },
        stonebreaker_axe: { damage: 42, icon: 'axe_13', type: 'weapon', subtype: 'cutting', tier: 2, name: 'Stonebreaker Axe', range: 'close', equippedBy: null, description: 'A stonebreaker axe +54% atk [Tier 2]' },
        mossreaper_axe: { damage: 44, icon: 'axe_14', type: 'weapon', subtype: 'cutting', tier: 2, name: 'Mossreaper Axe', range: 'close', equippedBy: null, description: 'A mossreaper axe +44% atk [Tier 2]' },
        warcleaver_axe: { damage: 46, icon: 'axe_15', type: 'weapon', subtype: 'cutting', tier: 2, name: 'Warcleaver Axe', range: 'close', equippedBy: null, description: 'A warcleaver axe +58% atk [Tier 2]' },
        blackroot_axe: { damage: 48, icon: 'axe_16', type: 'weapon', subtype: 'cutting', tier: 2, name: 'Blackroot Axe', range: 'close', equippedBy: null, description: 'A blackroot axe +60% atk [Tier 2]' },
        dawnsplitter_axe: { damage: 50, icon: 'axe_17', type: 'weapon', subtype: 'cutting', tier: 2, name: 'Dawnsplitter Axe', range: 'close', equippedBy: null, description: 'A dawnsplitter axe +62% atk [Tier 2]' },
        duskbane_axe: { damage: 52, icon: 'axe_18', type: 'weapon', subtype: 'cutting', tier: 2, name: 'Duskbane Axe', range: 'close', equippedBy: null, description: 'A dusk-bane axe +64% atk [Tier 2]' },

        thunderhewer_axe: { damage: 70, icon: 'axe_19', type: 'weapon', subtype: 'cutting', tier: 3, name: 'Thunderhewer Axe', range: 'close', equippedBy: null, description: 'A thunderhewer axe +66% atk [Tier 3]' },
        skullsplitter_axe: { damage: 74, icon: 'axe_20', type: 'weapon', subtype: 'cutting', tier: 3, name: 'Skullsplitter Axe', range: 'close', equippedBy: null, description: 'A skullsplitter axe +68% atk [Tier 3]' },
        giantsbane_axe: { damage: 78, icon: 'axe_21', type: 'weapon', subtype: 'cutting', tier: 3, name: 'Giantsbane Axe', range: 'close', equippedBy: null, description: 'A giantsbane axe +70% atk [Tier 3]' },
        vinecutter_axe: { damage: 84, icon: 'axe_22', type: 'weapon', subtype: 'cutting', tier: 3, name: 'Vinecutter Axe', range: 'close', equippedBy: null, description: 'A vinecutter axe +72% atk [Tier 3]' },
        obsidian_axe: { damage: 88, icon: 'axe_23', type: 'weapon', subtype: 'cutting', tier: 3, name: 'Obsidian Axe', range: 'close', equippedBy: null, description: 'An obsidian axe +74% atk [Tier 3]' },
        ashwood_axe: { damage: 98, icon: 'axe_24', type: 'weapon', subtype: 'cutting', tier: 3, name: 'Ashwood Axe', range: 'close', equippedBy: null, description: 'An ashwood axe +76% atk [Tier 3]' },
        drakebane_axe: { damage: 104, icon: 'axe_25', type: 'weapon', subtype: 'cutting', tier: 3, name: 'Drakebane Axe', range: 'close', equippedBy: null, description: 'A drakebane axe +78% atk [Tier 3]' },

        sylvan_bow: { damage: 42, icon: 'sylvan_bow', type: 'weapon', subtype: 'cutting', tier: 1, name: 'Sylvan Bow', range: 'far', equippedBy: null, description: 'A balanced woodland bow [Tier 1]' },
        sentinels_bow: { damage: 46, icon: 'sentinels_bow', type: 'weapon', subtype: 'cutting', tier: 1, name: "Sentinel's Bow", range: 'far', equippedBy: null, description: 'A sentry-crafted longbow [Tier 1]' },
        outriders_bow: { damage: 50, icon: 'outriders_bow', type: 'weapon', subtype: 'cutting', tier: 1, name: "Outrider's Bow", range: 'far', equippedBy: null, description: 'A swift cavalry bow [Tier 1]' },

        cryonic_bow: { damage: 72, icon: 'cryonic_bow', type: 'weapon', subtype: 'cutting', tier: 2, name: 'Cryonic Bow', range: 'far', equippedBy: null, description: 'A frost-laced war bow [Tier 2]' },
        vitriolic_bow: { damage: 78, icon: 'vitriolic_bow', type: 'weapon', subtype: 'cutting', tier: 2, name: 'Vitriolic Bow', range: 'far', equippedBy: null, description: 'An acid-etched composite bow [Tier 2]' },
        arcane_bow: { damage: 84, icon: 'arcane_bow', type: 'weapon', subtype: 'cutting', tier: 2, name: 'Arcane Bow', range: 'far', equippedBy: null, description: 'An enchanted focus bow [Tier 2]' },

        merklins_peacekeeper: { damage: 120, icon: 'merklins_peacekeeper', type: 'weapon', subtype: 'cutting', tier: 3, name: "Merklin's Peacekeeper", range: 'far', equippedBy: null, description: 'A masterwork legend bow [Tier 3]' },


        shortsword_sword: { damage: 25, icon: 'shortsword', type: 'weapon', subtype: 'cutting', tier: 1, name: 'shortsword', range: 'close', equippedBy: null, description: 'The shortsword does +25% atk [Tier 1]' },
        cutlass_sword: { damage: 30, icon: 'cutlass', type: 'weapon', subtype: 'cutting', tier: 1, name: 'cutlass', range: 'close', equippedBy: null, description: 'The cutlass does +30% atk [Tier 1]' },
        gladius_sword: { damage: 40, icon: 'gladius', type: 'weapon', subtype: 'cutting', tier: 1, name: 'gladius', range: 'close', equippedBy: null, description: 'The gladius does +40% atk [Tier 1]' },
        falchion_sword: { damage: 45, icon: 'falchion', type: 'weapon', subtype: 'cutting', tier: 1, name: 'falchion', range: 'close', equippedBy: null, description: 'The falchion does +45% atk [Tier 1]' },
        longsword_sword: { damage: 45, icon: 'longsword', type: 'weapon', subtype: 'cutting', tier: 1, name: 'longsword', range: 'close', equippedBy: null, description: 'The longsword does +45% atk [Tier 1]' },
        broadsword_sword: { damage: 50, icon: 'broadsword', type: 'weapon', subtype: 'cutting', tier: 1, name: 'broadsword', range: 'close', equippedBy: null, description: 'The broadsword does +50% atk [Tier 1]' },
        golden_gladius_sword: { damage: 55, icon: 'gladius', type: 'weapon', subtype: 'cutting', tier: 1, name: 'gladius', range: 'close', equippedBy: null, description: 'The gladius does +40% atk [Tier 1]' },
        wyrmsbane_sword: { damage: 52, icon: 'wyrmsbane', type: 'weapon', subtype: 'cutting', tier: 1, name: 'wyrmsbane', range: 'close', equippedBy: null, description: 'The wyrmsbane does +52% atk [Tier 1]' },
        katana_sword: { damage: 55, icon: 'katana', type: 'weapon', subtype: 'cutting', tier: 1, name: 'katana', range: 'close', equippedBy: null, description: 'The katana does +55% atk [Tier 1]' },
        claymore_sword: { damage: 60, icon: 'claymore', type: 'weapon', subtype: 'cutting', tier: 1, name: 'claymore', range: 'close', equippedBy: null, description: 'The claymore does +60% atk [Tier 1]' },
        greatsword_sword: { damage: 70, icon: 'greatsword', type: 'weapon', subtype: 'cutting', tier: 1, name: 'greatsword', range: 'close', equippedBy: null, description: 'The greatsword does +70% atk [Tier 1]' },

        doomreaver_sword: { damage: 78, icon: 'doomreaver', type: 'weapon', subtype: 'cutting', tier: 2, name: 'doomreaver', range: 'close', equippedBy: null, description: 'The doomreaver does +78% atk [Tier 2]' },
        nightfall_sword: { damage: 82, icon: 'nightfall', type: 'weapon', subtype: 'cutting', tier: 2, name: 'nightfall', range: 'close', equippedBy: null, description: 'The nightfall does +82% atk [Tier 2]' },
        dreadedge_sword: { damage: 88, icon: 'dreadedge', type: 'weapon', subtype: 'cutting', tier: 2, name: 'dreadedge', range: 'close', equippedBy: null, description: 'The dreadedge does +88% atk [Tier 2]' },
        sunsteel_sword: { damage: 95, icon: 'sunsteel', type: 'weapon', subtype: 'cutting', tier: 2, name: 'sunsteel', range: 'close', equippedBy: null, description: 'The sunsteel does +95% atk [Tier 2]' },
        voidrender_sword: { damage: 100, icon: 'voidrender', type: 'weapon', subtype: 'cutting', tier: 2, name: 'voidrender', range: 'close', equippedBy: null, description: 'The voidrender does +100% atk [Tier 2]' },
        warlords_cleaver_sword: { damage: 105, icon: 'warlords_cleaver', type: 'weapon', subtype: 'cutting', tier: 2, name: 'warlords_cleaver', range: 'close', equippedBy: null, description: 'The warlords_cleaver does +105% atk [Tier 2]' },
        emberbrand_sword: { damage: 110, icon: 'emberbrand', type: 'weapon', subtype: 'cutting', tier: 2, name: 'emberbrand', range: 'close', equippedBy: null, description: 'The emberbrand does +110% atk [Tier 2]' },

        frostbite_sword: { damage: 130, icon: 'frostbite', type: 'weapon', subtype: 'cutting', tier: 3, name: 'frostbite', range: 'close', equippedBy: null, description: 'The frostbite does +130% atk [Tier 3]' },
        bloodsong_sword: { damage: 140, icon: 'bloodsong', type: 'weapon', subtype: 'cutting', tier: 3, name: 'bloodsong', range: 'close', equippedBy: null, description: 'The bloodsong does +140% atk [Tier 3]' },
        shadowfang_sword: { damage: 150, icon: 'shadowfang', type: 'weapon', subtype: 'cutting', tier: 3, name: 'shadowfang', range: 'close', equippedBy: null, description: 'The shadowfang does +150% atk [Tier 3]' },
        skymourne_sword: { damage: 160, icon: 'skymourne', type: 'weapon', subtype: 'cutting', tier: 3, name: 'skymourne', range: 'close', equippedBy: null, description: 'The skymourne does +160% atk [Tier 3]' },
        opalveil_sword: { damage: 170, icon: 'opalveil', type: 'weapon', subtype: 'cutting', tier: 3, name: 'opalveil', range: 'close', equippedBy: null, description: 'The opalveil does +170% atk [Tier 3]' },
        titans_claw_sword: { damage: 180, icon: 'titans_claw', type: 'weapon', subtype: 'cutting', tier: 3, name: 'titans_claw', range: 'close', equippedBy: null, description: 'The titans_claw does +180% atk [Tier 3]' },
        entropy_sword: { damage: 190, icon: 'entropy', type: 'weapon', subtype: 'cutting', tier: 3, name: 'entropy', range: 'close', equippedBy: null, description: 'The entropy does +190% atk [Tier 3]' },
    }
    Object.values(this.weapons).forEach((weapon) => {
        if (!weapon || typeof weapon.damage !== 'number') return;
        const flatBonus = (weapon.damage * 0.1).toFixed(1);
        const tierText = weapon.tier ? ` [Tier ${weapon.tier}]` : '';
        weapon.description = `${weapon.name} grants +${weapon.damage}% base atk and +${flatBonus} flat damage${tierText}`;
    });

    this.armor = {
        /////////////// shields
        buckler: {
            tier: 1,
            armor: 20,
            type: 'armor',
            subtype: 'shield',
            icon: 'buckler',
            name: 'buckler',
            equippedBy: null,
            description: 'Small parrying buckler. Defense: 20 (~14% damage reduction)'
        },
        infantry_shield: {
            tier: 1,
            armor: 35,
            type: 'armor',
            subtype: 'shield',
            icon: 'infantry_shield',
            name: 'infantry shield',
            equippedBy: null,
            description: 'Standard-issue infantry kite shield. Defense: 35 (~24% damage reduction)'
        },
        cold_steel_shield: {
            tier: 1,
            armor: 50,
            type: 'armor',
            subtype: 'shield',
            icon: 'cold_steel_shield',
            name: 'cold steel shield',
            equippedBy: null,
            description: 'Heavy steel campaign shield. Defense: 50 (~35% damage reduction)'
        },
        banded_steel_shield: {
            armor: 65,
            type: 'armor',
            subtype: 'shield',
            icon: 'banded_steel_shield',
            name: 'banded steel shield',
            equippedBy: null,
            description: 'Reinforced banded-steel kite. Defense: 65 (~45% damage reduction)'
        },
        crusaders_shield: {
            tier: 2,
            armor: 80,
            type: 'armor',
            subtype: 'shield',
            icon: 'crusaders_shield',
            name: "crusader's shield",
            equippedBy: null,
            description: "Blessed crusader tower shield. Defense: 80 (~56% damage reduction)"
        },
        dawnguard: {
            tier: 2,
            armor: 95,
            type: 'armor',
            subtype: 'shield',
            icon: 'dawnguard',
            name: 'dawnguard',
            equippedBy: null,
            description: 'Elite sentinel shield of the Dawnguard order. Defense: 95 (~66% damage reduction)'
        },
        twilight_screen: {
            tier: 2,
            armor: 107,
            type: 'armor',
            subtype: 'shield',
            icon: 'twilight_screen',
            name: 'twilight screen',
            equippedBy: null,
            description: 'Twilight-forged aegis of living shadow. Defense: 107 (~75% damage reduction, max)'
        },
        revenants_shield: {
            tier: 3,
            armor: 107,
            type: 'armor',
            subtype: 'shield',
            icon: 'revenants_shield',
            name: "revenant's shield",
            equippedBy: null,
            description: "Undying revenant ward. Defense: 107 (~75% damage reduction, max)"
        },
        aegis_bulwark: {
            tier: 3,
            armor: 107,
            type: 'armor',
            subtype: 'shield',
            icon: 'aegis_bulwark',
            name: 'aegis bulwark',
            equippedBy: null,
            description: 'The legendary Aegis — ultimate protection. Defense: 107 (~75% damage reduction, max)'
        },
        //////////////// boots
        travelers_boots: {
            tier: 1,
            armor: 5,
            type: 'armor',
            subtype: 'boots',
            icon: 'travelers_boots',
            name: "traveler's boots",
            equippedBy: null,
            description: ''
        },
        wayfinders_boots: {
            tier: 1,
            armor: 5,
            type: 'armor',
            subtype: 'boots',
            icon: 'wayfinders_boots',
            name: "wayfinder's boots",
            equippedBy: null,
            description: 'Boots favored by wayfinders, offering a blend of protection and navigation affinity. Defense: 5 (~3% damage reduction)'
        },
        oily_boots: {
            tier: 1,
            armor: 5,
            type: 'armor',
            subtype: 'boots',
            icon: 'oily_boots',
            name: 'oily boots',
            equippedBy: null,
            description: 'Boots favored by those who prefer a sleek and unobtrusive style, offering a blend of protection and stealth. Defense: 5 (~3% damage reduction)'
        },
        highwaymans_boots: {
            tier: 1,
            armor: 5,
            type: 'armor',
            subtype: 'boots',
            icon: 'highwaymans_boots',
            name: "highwayman's boots",
            equippedBy: null,
            description: 'Boots favored by highwaymen, offering a blend of protection and agility. Defense: 5 (~3% damage reduction)'
        },
        voyagers_boots: {
            tier: 1,
            armor: 5,
            type: 'armor',
            subtype: 'boots',
            icon: 'voyagers_boots',
            name: "voyager's boots",
            equippedBy: null,
            description: 'Boots favored by voyagers, offering a blend of protection and exploration affinity. Defense: 5 (~3% damage reduction)'
        },
        northerners_boots: {
            tier: 1,
            armor: 5,
            type: 'armor',
            subtype: 'boots',
            icon: 'northerners_boots',
            name: "northerner's boots",
            equippedBy: null,
            description: 'Boots favored by northerners, offering a blend of protection and cold resistance. Defense: 5 (~3% damage reduction)'
        },
        midas_boots: {
            tier: 1,
            armor: 5,
            type: 'armor',
            subtype: 'boots',
            icon: 'midas_boots',
            name: 'Midas boots',
            equippedBy: null,
            description: 'Boots favored by those seeking fortune, offering a blend of protection and wealth affinity. Defense: 5 (~3% damage reduction)'
        },
        sentinels_boots: {
            tier: 1,
            armor: 5,
            type: 'armor',
            subtype: 'boots',
            icon: 'sentinels_boots',
            name: "sentinel's boots",
            equippedBy: null,
            description: 'Boots favored by sentinels, offering a blend of protection and vigilance. Defense: 5 (~3% damage reduction)'
        },
        imperial_boots: {
            tier: 1,
            armor: 5,
            type: 'armor',
            subtype: 'boots',
            icon: 'imperial_boots',
            name: 'imperial boots',
            equippedBy: null,
            description: 'Boots favored by sentinels, offering a blend of protection and vigilance. Defense: 5 (~3% damage reduction)'
        },
        mariners_boots: {
            tier: 1,
            armor: 5,
            type: 'armor',
            subtype: 'boots',
            icon: 'mariners_boots',
            name: "mariner's boots",
            equippedBy: null,
            description: 'Boots favored by mariners, offering a blend of protection and water affinity. Defense: 5 (~3% damage reduction)'
        },
        magicians_boots: {
            tier: 1,
            armor: 5,
            type: 'armor',
            subtype: 'boots',
            icon: 'magicians_boots',
            name: "magician's boots",
            equippedBy: null,
            description: 'Boots favored by magicians, offering a blend of protection and magical affinity. Defense: 5 (~3% damage reduction)'
        },
        sorcerers_boots: {
            tier: 1,
            armor: 5,
            type: 'armor',
            subtype: 'boots',
            icon: 'sorcerers_boots',
            name: "sorcerer's boots",
            equippedBy: null,
            description: 'Boots favored by sorcerers, offering a blend of protection and arcane affinity. Defense: 5 (~3% damage reduction)'
        },
        shadow_boots: {
            tier: 1,
            armor: 5,
            type: 'armor',
            subtype: 'boots',
            icon: 'shadow_boots',
            name: 'shadow boots',
            equippedBy: null,
            description: 'Boots that blend into the shadows, providing stealth and moderate protection. Defense: 5 (~3% damage reduction)'
        },
        twilight_boots: {
            tier: 3,
            armor: 45,
            type: 'armor',
            subtype: 'boots',
            icon: 'twilight_boots',
            name: 'twilight boots',
            equippedBy: null,
            description: 'Boots forged in the twilight realm, granting enhanced agility and protection. Defense: 45 (~30% damage reduction)'
        },
        moonstone_boots: {
            tier: 3,
            armor: 45,
            type: 'armor',
            subtype: 'boots',
            icon: 'moonstone_boots',
            name: 'moonstone boots',
            equippedBy: null,
            description: 'Boots imbued with the essence of the moonstone, enhancing agility and providing substantial protection. Defense: 45 (~30% damage reduction)   '
        },
        eldritch_boots: {
            tier: 3,
            armor: 45,
            type: 'armor',
            subtype: 'boots',
            icon: 'eldritch_boots',
            name: 'eldritch boots',
            equippedBy: null,
            description: 'Boots imbued with eldritch energy, enhancing magical prowess and providing substantial protection. Defense: 45 (~30% damage reduction)'
        },
        glimmering_boots: {
            tier: 3,
            armor: 45,
            type: 'armor',
            subtype: 'boots',
            icon: 'glimmering_boots',
            name: 'glimmering boots',
            equippedBy: null,
            description: 'Boots that shimmer with a glimmering light, providing enhanced agility and substantial protection. Defense: 45 (~30% damage reduction)'
        },
        princes_boots: {
            tier: 2,
            armor: 24,
            type: 'armor',
            subtype: 'boots',
            icon: 'princes_boots',
            name: "prince's boots",
            equippedBy: null,
            description: "Boots favored by princes, offering a blend of protection and regal elegance. Defense: 24 (~16% damage reduction)"
        },
        lords_boots: {
            tier: 2,
            armor: 24,
            type: 'armor',
            subtype: 'boots',
            icon: 'lords_boots',
            name: "lord's boots",
            equippedBy: null,
            description: "Boots favored by lords, offering a blend of protection and noble authority. Defense: 24 (~16% damage reduction)"
        },
        golems_boots: {
            tier: 2,
            armor: 24,
            type: 'armor',
            subtype: 'boots',
            icon: 'golems_boots',
            name: "golem's boots",
            equippedBy: null,
            description: "Boots favored by golems, offering a blend of protection and elemental resilience. Defense: 24 (~16% damage reduction)"
        },
        darklings_boots: {
            tier: 2,
            armor: 24,
            type: 'armor',
            subtype: 'boots',
            icon: 'darklings_boots',
            name: "darkling's boots",
            equippedBy: null,
            description: "Boots favored by darklings, offering a blend of protection and shadow affinity. Defense: 24 (~16% damage reduction)"
        },
        ornate_boots: {
            tier: 2,
            armor: 24,
            type: 'armor',
            subtype: 'boots',
            icon: 'ornate_boots',
            name: 'ornate boots',
            equippedBy: null,
            description: "Boots favored for their ornate design, offering a blend of protection and aesthetic appeal. Defense: 24 (~16% damage reduction)"
        },
        rainmans_boots: {
            tier: 2,
            armor: 24,
            type: 'armor',
            subtype: 'boots',
            icon: 'rainmans_boots',
            name: "rainman's boots",
            equippedBy: null,
            description: "Boots favored by rainmen, offering a blend of protection and weather resistance. Defense: 24 (~16% damage reduction)"
        },
        //////////////// standard helms
        archer_helm: {
            tier: 1,
            armor: 8,
            type: 'armor',
            subtype: 'helm',
            icon: 'archer_helm',
            name: 'archer helm',
            equippedBy: null,
            description: 'Helm favored by archers, offering a blend of protection and agility. Defense: 8 (~5% damage reduction)'
        },
        kettle_hat: {
            tier: 1,
            armor: 8,
            type: 'armor',
            subtype: 'helm',
            icon: 'kettle_hat',
            name: 'kettle hat',
            equippedBy: null,
            description: 'Helm favored by infantry, offering a blend of protection and durability. Defense: 8 (~5% damage reduction)'
        },
        hounskull: {
            tier: 1,
            armor: 8,
            type: 'armor',
            subtype: 'helm',
            icon: 'hounskull',
            name: 'hounskull',
            equippedBy: null,
            description: 'Helm favored by hounds, offering a blend of protection and keen senses. Defense: 8 (~5% damage reduction)'
        },
        plague_helm: {
            tier: 1,
            armor: 8,
            type: 'armor',
            subtype: 'helm',
            icon: 'plague_helm',
            name: 'plague helm',
            equippedBy: null,
            description: 'Helm favored by plague doctors, offering a blend of protection and disease resistance. Defense: 8 (~5% damage reduction)'
        },
        warlord_helm: {
            tier: 3,
            armor: 18,
            type: 'armor',
            subtype: 'helm',
            icon: 'warlord_helm',
            name: 'warlord helm',
            equippedBy: null,
            description: 'Helm favored by warlords, offering a blend of protection and leadership. Defense: 18 (~12% damage reduction)'
        },
        juggernaut_helm: {
            tier: 3,
            armor: 18,
            type: 'armor',
            subtype: 'helm',
            icon: 'juggernaut_helm',
            name: 'juggernaut helm',
            equippedBy: null,
            description: 'Helm favored by juggernauts, offering a blend of protection and brute strength. Defense: 18 (~12% damage reduction)'
        },
        moonlord_helm: {
            tier: 3,
            armor: 18,
            type: 'armor',
            subtype: 'helm',
            icon: 'moonlord_helm',
            name: 'moonlord helm',
            equippedBy: null,
            description: 'Helm favored by moonlords, offering a blend of protection and lunar power. Defense: 18 (~12% damage reduction)'
        },
        witch_knight_helm: {
            tier: 3,
            armor: 18,
            type: 'armor',
            subtype: 'helm',
            icon: 'witch_knight_helm',
            name: 'witch knight helm',
            equippedBy: null,
            description: 'Helm favored by witch knights, offering a blend of protection and dark magic. Defense: 18 (~12% damage reduction)'
        },
        collosus_helm: {
            tier: 4,
            armor: 24,
            type: 'armor',
            subtype: 'helm',
            icon: 'collosus_helm',
            name: 'collosus helm',
            equippedBy: null,
            description: 'Helm favored by colossus warriors, offering a blend of protection and immense strength. Defense: 24 (~16% damage reduction)'
        },
        omega_helm: {
            tier: 4,
            armor: 24,
            type: 'armor',
            subtype: 'helm',
            icon: 'omega_helm',
            name: 'omega helm',
            equippedBy: null,
            description: 'Helm favored by omegas, offering a blend of protection and ultimate power. Defense: 24 (~16% damage reduction)'
        },
        immortal_helm: {
            tier: 4,
            armor: 24,
            type: 'armor',
            subtype: 'helm',
            icon: 'immortal_helm',
            name: 'immortal helm',
            equippedBy: null,
            description: 'Helm favored by immortals, offering a blend of protection and eternal resilience. Defense: 24 (~16% damage reduction)'
        },
        //////////////// upgradeable helms
        nasal_helm_upgradeable: {
            tier: 1,
            armor: 8,
            type: 'armor',
            subtype: 'helm',
            icon: 'nasal_helm_upgradeable',
            name: 'nasal helm',
            upgradeable: true,
            equippedBy: null,
            description: 'Helm favored by infantry, offering a blend of protection and durability. Defense: 8 (~5% damage reduction)'
        },
        nasal_helm_upgradeable_upgraded: {
            tier: 1,
            armor: 12,
            type: 'armor',
            subtype: 'helm',
            icon: 'nasal_helm_upgradeable_upgraded',
            name: 'nasal helm upgraded',
            equippedBy: null,
            description: 'Helm favored by infantry, offering a blend of protection and durability. Defense: 12 (~8% damage reduction)'
        },
        soldier_helm_upgradeable: {
            tier: 1,
            armor: 8,
            type: 'armor',
            subtype: 'helm',
            icon: 'soldier_helm_upgradeable',
            name: 'soldier helm',
            upgradeable: true,
            equippedBy: null,
            description: 'Helm favored by soldiers, offering a blend of protection and discipline. Defense: 8 (~5% damage reduction)'
        },
        soldier_helm_upgradeable_upgraded: {
            tier: 1,
            armor: 12,
            type: 'armor',
            subtype: 'helm',
            icon: 'soldier_helm_upgradeable_upgraded',
            name: 'soldier helm upgraded',
            equippedBy: null,
            description: 'Helm favored by soldiers, offering a blend of protection and discipline. Defense: 12 (~8% damage reduction)'
        },
        crusader_helm_upgradeable: {
            tier: 1,
            armor: 8,
            type: 'armor',
            subtype: 'helm',
            icon: 'crusader_helm_upgradeable',
            name: 'crusader helm',
            upgradeable: true,
            equippedBy: null,
            description: 'Helm favored by crusaders, offering a blend of protection and valor. Defense: 8 (~5% damage reduction)'
        },
        crusader_helm_upgradeable_upgraded: {
            tier: 1,
            armor: 12,
            type: 'armor',
            subtype: 'helm',
            icon: 'crusader_helm_upgradeable_upgraded',
            name: 'crusader helm upgraded',
            equippedBy: null,
            description: 'Helm favored by crusaders, offering a blend of protection and valor. Defense: 12 (~8% damage reduction)'
        },
        cavalry_helm_upgradeable: {
            tier: 1,
            armor: 8,
            type: 'armor',
            subtype: 'helm',
            icon: 'cavalry_helm_upgradeable',
            name: 'cavalry helm',
            upgradeable: true,
            equippedBy: null,
            description: 'Helm favored by cavalry, offering a blend of protection and mobility. Defense: 8 (~5% damage reduction)'
        },
        cavalry_helm_upgradeable_upgraded: {
            tier: 1,
            armor: 12,
            type: 'armor',
            subtype: 'helm',
            icon: 'cavalry_helm_upgradeable_upgraded',
            name: 'cavalry helm upgraded',
            equippedBy: null,
            description: 'Helm favored by cavalry, offering a blend of protection and mobility. Defense: 12 (~8% damage reduction)'
        },
        war_helm_upgradeable: {
            tier: 2,
            armor: 8,
            type: 'armor',
            subtype: 'helm',
            icon: 'war_helm_upgradeable',
            name: 'war helm',
            upgradeable: true,
            equippedBy: null,
            description: 'Helm favored by warriors, offering a blend of protection and strength. Defense: 8 (~5% damage reduction)'
        },
        war_helm_upgradeable_upgraded: {
            tier: 2,
            armor: 12,
            type: 'armor',
            subtype: 'helm',
            icon: 'war_helm_upgradeable_upgraded',
            name: 'war helm upgraded',
            equippedBy: null,
            description: 'Helm favored by warriors, offering a blend of protection and strength. Defense: 12 (~8% damage reduction)'
        },
        coif_helm_upgradeable: {
            tier: 2,
            armor: 8,
            type: 'armor',
            subtype: 'helm',
            icon: 'coif_helm_upgradeable',
            name: 'coif helm',
            upgradeable: true,
            equippedBy: null,
            description: 'Helm favored by infantry, offering a blend of protection and durability. Defense: 8 (~5% damage reduction)'
        },
        coif_helm_upgradeable_upgraded: {
            tier: 2,
            armor: 12,
            type: 'armor',
            subtype: 'helm',
            icon: 'coif_helm_upgradeable_upgraded',
            name: 'coif helm upgraded',
            equippedBy: null,
            description: 'Helm favored by infantry, offering a blend of protection and durability. Defense: 12 (~8% damage reduction)'
        },
        gladiator_helm_upgradeable: {
            tier: 2,
            armor: 8,
            type: 'armor',
            subtype: 'helm',
            icon: 'gladiator_helm_upgradeable',
            name: 'gladiator helm',
            upgradeable: true,
            equippedBy: null,
            description: 'Helm favored by gladiators, offering a blend of protection and agility. Defense: 8 (~5% damage reduction)'
        },
        gladiator_helm_upgradeable_upgraded: {
            tier: 2,
            armor: 12,
            type: 'armor',
            subtype: 'helm',
            icon: 'gladiator_helm_upgradeable_upgraded',
            name: 'gladiator helm upgraded',
            equippedBy: null,
            description: 'Helm favored by gladiators, offering a blend of protection and agility. Defense: 12 (~8% damage reduction)'
        },
        battle_mage_helm_upgradeable: {
            tier: 2,
            armor: 8,
            type: 'armor',
            subtype: 'helm',
            icon: 'battle_mage_helm_upgradeable',
            name: 'battle mage helm',
            upgradeable: true,
            equippedBy: null,
            description: 'Helm favored by battle mages, offering a blend of protection and magical prowess. Defense: 8 (~5% damage reduction)'
        },
        battle_mage_helm_upgradeable_upgraded: {
            tier: 2,
            armor: 12,
            type: 'armor',
            subtype: 'helm',
            icon: 'battle_mage_helm_upgradeable_upgraded',
            name: 'battle mage helm upgraded',
            equippedBy: null,
            description: 'Helm favored by battle mages, offering a blend of protection and magical prowess. Defense: 12 (~8% damage reduction)'
        },
        knight_helm_upgradeable: {
            tier: 2,
            armor: 8,
            type: 'armor',
            subtype: 'helm',
            icon: 'knight_helm_upgradeable',
            name: 'knight helm',
            upgradeable: true,
            equippedBy: null,
            description: 'Helm favored by knights, offering a blend of protection and honor. Defense: 8 (~5% damage reduction)'
        },
        knight_helm_upgradeable_upgraded: {
            tier: 2,
            armor: 12,
            type: 'armor',
            subtype: 'helm',
            icon: 'knight_helm_upgradeable_upgraded',
            name: 'knight helm upgraded',
            equippedBy: null,
            description: 'Helm favored by knights, offering a blend of protection and honor. Defense: 12 (~8% damage reduction)'
        },
        janissary_helm_upgradeable: {
            tier: 2,
            armor: 8,
            type: 'armor',
            subtype: 'helm',
            icon: 'janissary_helm_upgradeable',
            name: 'janissary helm',
            upgradeable: true,
            equippedBy: null,
            description: 'Helm favored by janissaries, offering a blend of protection and agility. Defense: 8 (~5% damage reduction)'
        },
        janissary_helm_upgradeable_upgraded: {
            tier: 2,
            armor: 12,
            type: 'armor',
            subtype: 'helm',
            icon: 'janissary_helm_upgradeable_upgraded',
            name: 'janissary helm upgraded',
            equippedBy: null,
            description: 'Helm favored by janissaries, offering a blend of protection and agility. Defense: 12 (~8% damage reduction)'
        },
        bascinet_upgradeable: {
            tier: 2,
            armor: 8,
            type: 'armor',
            subtype: 'helm',
            icon: 'bascinet_upgradeable',
            name: 'bascinet',
            upgradeable: true,
            equippedBy: null,
            description: 'Helm favored by infantry, offering a blend of protection and durability. Defense: 8 (~5% damage reduction)'
        },
        bascinet_upgradeable_upgraded: {
            tier: 2,
            armor: 12,
            type: 'armor',
            subtype: 'helm',
            icon: 'bascinet_upgradeable_upgraded',
            name: 'bascinet upgraded',
            equippedBy: null,
            description: 'Helm favored by infantry, offering a blend of protection and durability. Defense: 12 (~8% damage reduction)'
        },
        imperial_helm_upgradeable: {
            tier: 2,
            armor: 8,
            type: 'armor',
            subtype: 'helm',
            icon: 'imperial_helm_upgradeable',
            name: 'imperial helm',
            upgradeable: true,
            equippedBy: null,
            description: 'Helm favored by emperors, offering a blend of protection and prestige. Defense: 8 (~5% damage reduction)'
        },
        imperial_helm_upgradeable_upgraded: {
            tier: 2,
            armor: 12,
            type: 'armor',
            subtype: 'helm',
            icon: 'imperial_helm_upgradeable_upgraded',
            name: 'imperial helm upgraded',
            equippedBy: null,
            description: 'Helm favored by emperors, offering a blend of protection and prestige. Defense: 12 (~8% damage reduction)'
        },
        ranger_hood_upgradeable: {
            tier: 2,
            armor: 8,
            type: 'armor',
            subtype: 'helm',
            icon: 'ranger_hood_upgradeable',
            name: 'ranger hood',
            upgradeable: true,
            equippedBy: null,
            description: 'Hood favored by rangers, offering a blend of protection and stealth. Defense: 8 (~5% damage reduction)'
        },
        ranger_hood_upgradeable_upgraded: {
            tier: 2,
            armor: 12,
            type: 'armor',
            subtype: 'helm',
            icon: 'ranger_hood_upgradeable_upgraded',
            name: 'ranger hood upgraded',
            equippedBy: null,
            description: 'Hood favored by rangers, offering a blend of protection and stealth. Defense: 12 (~8% damage reduction)'
        },
        ///////// chest pieces
        ockneys_tabard: {
            tier: 1,
            armor: 4,
            type: 'armor',
            subtype: 'tabard',
            icon: 'ockneys_tabard',
            name: "Ockney's Tabard",
            equippedBy: null,
            magicReduction: 20,
            resolveResist: 10,
            description: "A woven tabard offering +4 physical armor, 20% magic damage reduction, and +10% resolve check resistance."
        },
        sigilum_tabard: {
            tier: 1,
            armor: 4,
            type: 'armor',
            subtype: 'tabard',
            icon: 'sigilum_tabard',
            name: "Sigilum Tabard",
            equippedBy: null,
            magicReduction: 25,
            mentalityResist: 10,
            description: "Enscribed with minor sigils. Offers +4 physical armor, 25% magic damage reduction, and +10% mentality check resistance."
        },
        mercurial_tabard: {
            tier: 1,
            armor: 5,
            type: 'armor',
            subtype: 'tabard',
            icon: 'mercurial_tabard',
            name: "Mercurial Tabard",
            equippedBy: null,
            magicReduction: 20,
            speedResist: 15,
            description: "Lightweight and flexible. Offers +5 physical armor, 20% magic damage reduction, and +15% action speed bonus."
        },
        wayfair_tabard: {
            tier: 1,
            armor: 3,
            type: 'armor',
            subtype: 'tabard',
            icon: 'wayfair_tabard',
            name: "Wayfair Tabard",
            equippedBy: null,
            magicReduction: 20,
            resolveResist: 15,
            description: "Worn by wandering scholars. Offers +3 physical armor, 20% magic damage reduction, and +15% resolve check resistance."
        },
        justicairs_tabard: {
            tier: 2,
            armor: 8,
            type: 'armor',
            subtype: 'tabard',
            icon: 'justicairs_tabard',
            name: "Justicair's Tabard",
            equippedBy: null,
            magicReduction: 35,
            resolveResist: 20,
            description: "Tabard worn by judges of the high court. Offers +8 physical armor, 35% magic damage reduction, and +20% resolve check resistance."
        },
        livinricks_tabard: {
            tier: 2,
            armor: 7,
            type: 'armor',
            subtype: 'tabard',
            icon: 'livinricks_tabard',
            name: "Livinrick's Tabard",
            equippedBy: null,
            magicReduction: 30,
            mentalityResist: 15,
            description: "Favored by traditionalist mages. Offers +7 physical armor, 30% magic damage reduction, and +15% mentality check resistance."
        },
        sorcerers_tabard: {
            tier: 2,
            armor: 6,
            type: 'armor',
            subtype: 'tabard',
            icon: 'sorcerers_tabard',
            name: "Sorcerer's Tabard",
            equippedBy: null,
            magicReduction: 40,
            power: 15,
            description: "Surging with mana. Offers +6 physical armor, 40% magic damage reduction, and +15% spell power."
        },
        medici_tabard: {
            tier: 2,
            armor: 7,
            type: 'armor',
            subtype: 'tabard',
            icon: 'medici_tabard',
            name: "Medici Tabard",
            equippedBy: null,
            magicReduction: 30,
            resolveResist: 20,
            description: "Imbued with protective herbs. Offers +7 physical armor, 30% magic damage reduction, and +20% resistance to resolve penalties."
        },
        ophiniomancers_tabard: {
            tier: 2,
            armor: 8,
            type: 'armor',
            subtype: 'tabard',
            icon: 'ophiniomancers_tabard',
            name: "Ophiniomancer's Tabard",
            equippedBy: null,
            magicReduction: 35,
            mentalityResist: 20,
            description: "Dark robes of snake-binders. Offers +8 physical armor, 35% magic damage reduction, and +20% mentality check resistance."
        },
        runic_tabard: {
            tier: 3,
            armor: 12,
            type: 'armor',
            subtype: 'tabard',
            icon: 'runic_tabard',
            name: "Runic Tabard",
            equippedBy: null,
            magicReduction: 50,
            resolveResist: 25,
            description: "Heavy runes protect the wearer. Offers +12 physical armor, 50% magic damage reduction, and +25% resolve check resistance."
        },
        oslins_tabard: {
            tier: 3,
            armor: 10,
            type: 'armor',
            subtype: 'tabard',
            icon: 'oslins_tabard',
            name: "Oslin's Tabard",
            equippedBy: null,
            magicReduction: 45,
            mentalityResist: 30,
            description: "Weaved by sage Oslin. Offers +10 physical armor, 45% magic damage reduction, and +30% mentality check resistance."
        },
        astral_tabard: {
            tier: 3,
            armor: 10,
            type: 'armor',
            subtype: 'tabard',
            icon: 'astral_tabard',
            name: "Astral Tabard",
            equippedBy: null,
            magicReduction: 55,
            resolveResist: 25,
            description: "Shimmers with starglow. Offers +10 physical armor, 55% magic damage reduction, and +25% resolve check resistance."
        },
        archmages_tabard: {
            tier: 3,
            armor: 12,
            type: 'armor',
            subtype: 'tabard',
            icon: 'archmages_tabard',
            name: "Archmage's Tabard",
            equippedBy: null,
            magicReduction: 60,
            mentalityResist: 50,
            description: "The ultimate magic-user vestment. Offers +12 physical armor, 60% magic damage reduction, and +50% mentality check resistance."
        }
    }

    this.magical = {
        // wands
        cloudfire_wand: {
            tier: 1,
            type: 'magical',
            icon: 'cloudfire_wand',
            name: 'Cloudfire Wand',
            equippedBy: null,
            subtype: 'wand',
            power: 1,
            description: 'Wand favored by mages, offering a blend of magical power and versatility.'
        },
        animus_wand: {
            tier: 1,
            type: 'magical',
            icon: 'animus_wand',
            name: 'Animus Wand',
            equippedBy: null,
            subtype: 'wand',
            power: 1,
            description: 'Wand favored by animus, offering a blend of magical power and versatility.'
        },
        glyndas_wand: {
            tier: 1,
            type: 'magical',
            icon: 'glyndas_wand',
            name: "Glynda's Wand",
            equippedBy: null,
            subtype: 'wand',
            power: 1,
            description: "Wand favored by Glynda, offering a blend of magical power and versatility."
        },
        justicator_wand: {
            tier: 2,
            type: 'magical',
            icon: 'justicator_wand',
            name: 'Justicator Wand',
            equippedBy: null,
            subtype: 'wand',
            power: 2,
            description: 'Wand favored by justicators, offering a blend of magical power and justice.'
        },
        willowcaster: {
            tier: 2,
            type: 'magical',
            icon: 'willowcaster',
            name: 'Willowcaster',
            equippedBy: null,
            subtype: 'wand',
            power: 2,
            description: 'Wand favored by willows, offering a blend of magical power and versatility.'
        },
        // staves
        archmages_staff: {
            tier: 1,
            type: 'magical',
            icon: 'archmages_staff',
            name: "Archmage's Staff",
            equippedBy: null,
            subtype: 'staff',
            power: 1,
            description: "Staff favored by archmages, offering a blend of magical power and wisdom."
        },
        enchanters_staff: {
            tier: 1,
            type: 'magical',
            icon: 'enchanters_staff',
            name: "Enchanter's Staff",
            equippedBy: null,
            subtype: 'staff',
            power: 1,
            description: "Staff favored by enchanters, offering a blend of magical power and enchantment."
        },
        imperial_mage_staff: {
            tier: 1,
            type: 'magical',
            icon: 'imperial_mage_staff',
            name: 'Imperial Mage Staff',
            equippedBy: null,
            subtype: 'staff',
            power: 1,
            description: "Staff favored by imperial mages, offering a blend of magical power and authority."
        },
        staff_of_espilon: {
            tier: 2,
            type: 'magical',
            icon: 'staff_of_espilon',
            name: 'Staff of Espilon',
            equippedBy: null,
            subtype: 'staff',
            power: 2,
            description: "Staff favored by Espilon, offering a blend of magical power and wisdom."
        },
        staff_of_marduk: {
            tier: 2,
            type: 'magical',
            icon: 'staff_of_marduk',
            name: 'Staff of Marduk',
            equippedBy: null,
            subtype: 'staff',
            power: 2,
            description: "Staff favored by Marduk, offering a blend of magical power and wisdom."
        },
        staff_of_omicron: {
            tier: 2,
            type: 'magical',
            icon: 'staff_of_omicron',
            name: 'Staff of Omicron',
            equippedBy: null,
            subtype: 'staff',
            power: 2,
            description: "Staff favored by Omicron, offering a blend of magical power and wisdom."
        },
        staff_of_tomorrow: {
            tier: 3,
            type: 'magical',
            icon: 'staff_of_tomorrow',
            name: 'Staff of Tomorrow',
            equippedBy: null,
            subtype: 'staff',
            power: 3,
            description: "Staff favored by the seers of tomorrow, offering a blend of magical power and foresight."
        },
        //charms < charms can only be used once per battle
        beetle_charm: {
            type: 'magical',
            icon: 'beetle_charm',
            name: 'beetle charm',
            equippedBy: null,
            subtype: 'charm',
            power: 2,
            description: `Beetle charms have a power of 2 and a 60% chance to cast a minor boon on use. Passive: +2 damage absorbtion for the user and all adjacent allies`
        },
        evilai_charm: {
            type: 'magical',
            icon: 'evilai_charm',
            name: 'evilai charm',
            equippedBy: null,
            subtype: 'charm',
            power: 4,
            description: `Evilai charms have a power of 4 and a 100% chance to cast 2 minor boons and 1 minor curse on use. Passive: +3 damage for the user and all adjacent allies & every time user is hit, 20% chance of casting minor curse on wearer`
        },
        nukta_charm: {
            type: 'magical',
            icon: 'nukta_charm',
            name: 'nukta charm',
            equippedBy: null,
            subtype: 'charm',
            power: 6,
            description: `Nukta charms have a power of 6 and a 50% chance to cast a 1 major boon. Passive: +4 dexterity for entire crew.`
        },
        lundi_charm: {
            type: 'magical',
            icon: 'lundi_charm',
            name: 'lundi charm',
            equippedBy: null,
            subtype: 'charm',
            power: 8,
            description: `Lundi charms have a power of 8.  On Use: 4x(70% chance to cast minor boon) Passive: +4 dexterity for entire crew.`
        },
        hamsa_charm: {
            type: 'magical',
            icon: 'hamsa_charm',
            name: 'hamsa charm',
            equippedBy: null,
            subtype: 'charm',
            power: 9,
            description: `Hamsa charms have a power of 9.  On Use: Summon 2 spirit warriors to fight for you Passive: On being hit, 20% to negate and teleport back 1 space, applies to entire crew.`
        },
        scarab_charm: {
            type: 'magical',
            icon: 'scarab_charm',
            name: 'scarab charm',
            equippedBy: null,
            subtype: 'charm',
            power: 10,
            description: `Scarab charms have a power of 10.  On Use: Summon 1 djinn to fight for you Passive: On hit, 20% to cast minor boon, 5% chance cast major boon.`
        },
        demonskull_charm: {
            type: 'magical',
            icon: 'demonskull_charm',
            name: 'demonskull charm',
            equippedBy: null,
            subtype: 'charm',
            power: 12,
            description: `Demonskull charms have a power of 12.  On Use: Cast 2 random eldritch spells Passive: Skill cooldowns are doubled, -1 to all stats for wearer.`
        },
        //amulets
        elasi_amulet: {
            tier: 1,
            type: 'magical',
            icon: 'elasi_amulet',
            name: 'Elasi Amulet',
            equippedBy: null,
            subtype: 'amulet',
            power: 1,
            effect: '+5 protection from curses',
            description: 'Crafted by the silver-tongued Elasi priestesses, this amulet whispers ancient wards against curses and binding magics.'
        },
        darkarrow_amulet: {
            tier: 1,
            type: 'magical',
            icon: 'darkarrow_amulet',
            name: 'Darkarrow Amulet',
            equippedBy: null,
            subtype: 'amulet',
            power: 1,
            effect: '+5% increased ranged attack damage and +5% increased critical strike chance for ranged attacks',
            description: 'Named for the black arrows of the Shadow Wars, this amulet channels the swiftness and precision of those legendary archers.'
        },
        elemental_amulet: {
            tier: 1,
            type: 'magical',
            icon: 'elemental_amulet',
            name: 'Elemental Amulet',
            equippedBy: null,
            subtype: 'amulet',
            power: 1,
            effect: 'gain 5% resistance to fire, cold, and lightning damage',
            description: 'A primal stone that channels the breath of all elements—fire, water, earth, and wind bound in harmonious balance.'
        },
        silver_amulet: {
            tier: 1,
            type: 'magical',
            icon: 'silver_amulet',
            name: 'Silver Amulet',
            equippedBy: null,
            subtype: 'amulet',
            power: 1,
            effect: 'gain 5% resistance to piercing, slashing, and blunt damage',
            description: 'Forged from moonsilver and blessed by the Temple Wardens, this amulet glows softly and repels malevolent spirits.'
        },
        ruby_amulet: {
            tier: 1,
            type: 'magical',
            icon: 'ruby_amulet',
            name: 'Ruby Amulet',
            equippedBy: null,
            subtype: 'amulet',
            power: 1,
            effect: 'gain 5% increased melee damage and +10% increased critical strike damage',
            description: 'A blood-red gem pulled from the volcanic heart of the Crimson Wastes, burning with primal fire and passion.'
        },
        acorn_amulet: {
            tier: 1,
            type: 'magical',
            icon: 'acorn_amulet',
            name: 'Acorn Amulet',
            equippedBy: null,
            subtype: 'amulet',
            power: 1,
            effect: 'gain 5% increased damage to plants and beasts and +10% increased critical strike damage',
            description: 'A gift from the Fae, this acorn pulses with ancient forest magic and grants kinship with the natural world.'
        },
        voodoo_amulet: {
            tier: 1,
            type: 'magical',
            icon: 'voodoo_amulet',
            name: 'Voodoo Amulet',
            equippedBy: null,
            subtype: 'amulet',
            effect: 'Doubles the duration of curses and debuffs on enemies, and reduces the duration of all boons on allies by half.',
            description: 'Imbued with sympathetic magic by the shadow priests of the Bayou, this amulet allows the wearer to touch distant threads of fate.'
        },
        yaga_amulet: {
            tier: 1,
            type: 'magical',
            icon: 'yaga_amulet',
            name: 'Yaga Amulet',
            equippedBy: null,
            subtype: 'amulet',
            power: 1,
            effect: 'Critical hits on enemies have a 25% chance to trigger a hex that reduces their Armor and Magic Resistance by 20% for 10 seconds.',
            description: 'Given by the dreaded Yaga herself to those who survive her trials, this amulet carries her capricious blessing.'
        },
        temprance_amulet: {
            tier: 1,
            type: 'magical',
            icon: 'temprance_amulet',
            name: 'Temprance Amulet',
            equippedBy: null,
            subtype: 'amulet',
            effect: 'Reduces stamina cost of abilities by 20%.',
            description: 'Blessed by the monks of the Abstinent Order, this amulet brings clarity and balance to turbulent hearts.'
        },
        emerald_amulet: {
            tier: 1,
            type: 'magical',
            icon: 'emerald_amulet',
            name: 'Emerald Amulet',
            equippedBy: null,
            subtype: 'amulet',
            effect: 'Regenerates 2 HP per round.',
            description: 'A verdant stone treasured by the Druid circles, it thrums with the life force of eternal spring.'
        },
        maconic_amulet: {
            tier: 1,
            type: 'magical',
            icon: 'maconic_amulet',
            name: 'Maconic Amulet',
            equippedBy: null,
            subtype: 'amulet',
            power: 1,
            effect: 'Grants +5 Defense.',
            description: 'Carved with the sacred symbols of the Stoneworkers\' Guild, this amulet draws strength from stone and mountain.'
        },
        warding_amulet: {
            tier: 2,
            type: 'magical',
            icon: 'warding_amulet',
            name: 'Warding Amulet',
            equippedBy: null,
            subtype: 'amulet',
            power: 2,
            effect: 'Grants a shield of 25% max HP for 3 rounds on combat start.',
            description: 'A masterwork of protective enchantment from the Sentry Corps, it weaves barriers of pure force around the wearer.'
        },
        bloodvial_amulet: {
            tier: 2,
            type: 'magical',
            icon: 'bloodvial_amulet',
            name: 'Bloodvial Amulet',
            equippedBy: null,
            subtype: 'amulet',
            power: 2,
            effect: 'Restores 50 HP if health falls below 30% (once per combat).',
            description: 'A chilling relic said to contain the essence of a fallen hero, it grants vitality bound to sacrifice and blood-debt.'
        },
        enchantress_amulet: {
            tier: 2,
            type: 'magical',
            icon: 'enchantress_amulet',
            name: 'Enchantress Amulet',
            equippedBy: null,
            subtype: 'amulet',
            power: 2,
            effect: 'Reduces cooldowns of special abilities by 1 round.',
            description: 'Woven by the Enchantresses of the Coral Spire, this amulet bends the weave of magic itself around its bearer.'
        },
        goldclaw_amulet: {
            tier: 2,
            type: 'magical',
            icon: 'goldclaw_amulet',
            name: 'Goldclaw Amulet',
            equippedBy: null,
            subtype: 'amulet',
            power: 2,
            effect: 'Critical hits on enemies have a 25% chance to trigger a 1x multiplier for gold rewards from combat.',
            description: 'Taken from the hoard of an ancient dragon, this amulet burns with avarice and grants the wearer uncanny fortune.'
        },
        clerics_amulet: {
            tier: 2,
            type: 'magical',
            icon: 'clerics_amulet',
            name: "Cleric's Amulet",
            equippedBy: null,
            subtype: 'amulet',
            power: 2,
            effect: 'Healing amounts increased by 65%.',
            description: 'Sanctified in the High Cathedral, this amulet channels divine grace and mends the wounds of body and spirit.'
        },
        queens_amulet: {
            tier: 2,
            type: 'magical',
            icon: 'queens_amulet',
            name: 'Queens Amulet',
            equippedBy: null,
            subtype: 'amulet',
            power: 2,
            effect: 'Increases Attack of adjacent allies by 15%.',
            description: 'Once worn by the last queen before the realm fractured, this amulet carries the weight of sovereignty and ancient command.'
        },
        ice_amulet: {
            tier: 3,
            type: 'magical',
            icon: 'ice_amulet',
            name: 'Ice Amulet',
            equippedBy: null,
            subtype: 'amulet',
            power: 3,
            effect: 'Critical hits on enemies have a 25% chance to freeze them for 2 rounds.',
            description: 'Frozen from the very heart of the Eternal Glacier, this amulet imprisons a shard of primordial winter and slows all decay.'
        },
        hypnosis_amulet: {
            tier: 3,
            type: 'magical',
            icon: 'hypnosis_amulet',
            name: 'Hypnosis Amulet',
            equippedBy: null,
            subtype: 'amulet',
            power: 3,
            effect: 'Critical hits on enemies have a 25% chance to charm them for 1 round.',
            description: 'Created by the Dream-Walkers of the Somnium, this amulet bends perception and weaves illusions of hauntingly beautiful deception.'
        },
        vampiric_amulet: {
            tier: 3,
            type: 'magical',
            icon: 'vampiric_amulet',
            name: 'Vampiric Amulet',
            equippedBy: null,
            subtype: 'amulet',
            power: 3,
            effect: 'Critical hits restore HP equal to 50% of damage dealt. Passive: Melee attacks restore HP equal to 15% of damage dealt.',
            description: 'A terrible treasure from the Crimson Courts, this amulet thirsts for life and grants terrible strength to those who feed it.'
        },
        platinum_amulet: {
            tier: 3,
            type: 'magical',
            icon: 'platinum_amulet',
            name: 'Platinum Amulet',
            equippedBy: null,
            subtype: 'amulet',
            power: 3,
            effect: 'Reduces incoming damage by 15%.',
            description: 'Forged from the rarest metal in the Star-Forges of the Celestial Smiths, this amulet blazes with otherworldly radiance.'
        },
        necrotic_amulet: {
            tier: 3,
            type: 'magical',
            icon: 'necrotic_amulet',
            name: 'Necrotic Amulet',
            equippedBy: null,
            subtype: 'amulet',
            power: 3,
            effect: 'Critical hits have a 25% chance to poison target.',
            description: 'Crafted in the Catacombs by warlocks who dare commune with death itself, this amulet whispers promises of undying power.'
        },
        voidward_amulet: {
            tier: 4,
            type: 'magical',
            icon: 'voidward_amulet',
            name: 'Voidward Amulet',
            equippedBy: null,
            subtype: 'amulet',
            power: 4,
            effect: 'Grants status ailment immunity.',
            description: 'A legendary artifact sealed with the last breath of a Void Guardian, it creates an impenetrable barrier against the abyss itself.'
        },
        celestial_amulet: {
            tier: 4,
            type: 'magical',
            icon: 'celestial_amulet',
            name: 'Celestial Amulet',
            equippedBy: null,
            subtype: 'amulet',
            power: 4,
            effect: 'Critical hits have a 25% chance to cause a holy explosion (25 splash damage to adjacent).',
            description: 'Fallen from a distant star and blessed by the Heavenly Choir, this amulet bathes the wearer in divine light and cosmic purpose.'
        },
        dimensional_amulet: {
            tier: 4,
            type: 'magical',
            icon: 'dimensional_amulet',
            name: 'Dimensional Amulet',
            equippedBy: null,
            subtype: 'amulet',
            power: 4,
            effect: '30% chance to immediately reset ability cooldown upon use.',
            description: 'Woven from the fabric of folded space by the Interdimensional Council, this amulet grants glimpses beyond the veil of reality.'
        },

        //spellbooks
        oily_manual: {
            tier: 1,
            type: 'magical',
            icon: 'oily_manual',
            name: 'Oily Manual',
            equippedBy: null,
            subtype: 'spellbook',
            power: 2,
            description: `A battered manual smeared with oils and arcane ink`
        },
        bound_tome: {
            tier: 1,
            type: 'magical',
            icon: 'bound_tome',
            name: 'Bound Tome',
            equippedBy: null,
            subtype: 'spellbook',
            power: 3,
            description: `A tome bound tightly with worn leather straps`
        },
        glowing_tome: {
            tier: 1,
            type: 'magical',
            icon: 'glowing_tome',
            name: 'Glowing Tome',
            equippedBy: null,
            subtype: 'spellbook',
            power: 3,
            description: `A tome that pulses faintly with stored magical energy`
        },
        kelrigans_manual: {
            tier: 1,
            type: 'magical',
            icon: 'kelrigans_manual',
            name: "Kelrigan's Manual",
            equippedBy: null,
            subtype: 'spellbook',
            power: 4,
            description: `A well-worn manual penned by the scholar Kelrigan`
        },
        the_watchful_eye: {
            tier: 2,
            type: 'magical',
            icon: 'the_watchful_eye',
            name: 'The Watchful Eye',
            equippedBy: null,
            subtype: 'spellbook',
            power: 4,
            description: `An arcane folio said to observe its reader in return`
        },
        moonbird_folio: {
            tier: 2,
            type: 'magical',
            icon: 'moonbird_folio',
            name: 'Moonbird Folio',
            equippedBy: null,
            subtype: 'spellbook',
            power: 5,
            description: `A folio covered in moonbird sigils and lunar charts`
        },
        icewing_folio: {
            tier: 2,
            type: 'magical',
            icon: 'icewing_folio',
            name: 'Icewing Folio',
            equippedBy: null,
            subtype: 'spellbook',
            power: 5,
            description: `A folio inscribed with frost-laced incantations`
        },
        emerald_tablet: {
            tier: 2,
            type: 'magical',
            icon: 'emerald_tablet',
            name: 'Emerald Tablet',
            equippedBy: null,
            subtype: 'spellbook',
            power: 6,
            description: `A green-jeweled tome housing ancient transmutation lore`
        },
        ruby_tablet: {
            tier: 2,
            type: 'magical',
            icon: 'ruby_tablet',
            name: 'Ruby Tablet',
            equippedBy: null,
            subtype: 'spellbook',
            power: 7,
            description: `A red-gemmed tome crackling with volatile fire magic`
        },
        feldons_manual: {
            tier: 3,
            type: 'magical',
            icon: 'feldons_manual',
            name: "Feldon's Manual",
            equippedBy: null,
            subtype: 'spellbook',
            power: 7,
            description: `Feldon's comprehensive manual of intermediate sorcery`
        },
        the_beast_book: {
            tier: 3,
            type: 'magical',
            icon: 'the_beast_book',
            name: 'The Beast Book',
            equippedBy: null,
            subtype: 'spellbook',
            power: 8,
            description: `A tome bound in hide, filled with beast-summoning rites`
        },
        book_of_jade: {
            tier: 3,
            type: 'magical',
            icon: 'book_of_jade',
            name: 'Book of Jade',
            equippedBy: null,
            subtype: 'spellbook',
            power: 8,
            description: `A jade-covered codex of eastern elemental magic`
        },
        igors_grimoire: {
            tier: 3,
            type: 'magical',
            icon: 'igors_grimoire',
            name: "Igor's Grimoire",
            equippedBy: null,
            subtype: 'spellbook',
            power: 9,
            description: `Igor's personal grimoire, dense with dark experiments`
        },
        forbidden_grimoire: {
            tier: 3,
            type: 'magical',
            icon: 'forbidden_grimoire',
            name: 'Forbidden Grimoire',
            equippedBy: null,
            subtype: 'spellbook',
            power: 9,
            description: `A chained grimoire whose contents are proscribed by most mage councils`
        },
        monadic_engine: {
            tier: 4,
            type: 'magical',
            icon: 'monadic_engine',
            name: 'Monadic Engine',
            equippedBy: null,
            subtype: 'spellbook',
            power: 10,
            description: `A mechanical folio that computes and channels arcane formulae`
        },
        verdant_engine: {
            tier: 4,
            type: 'magical',
            icon: 'verdant_engine',
            name: 'Verdant Engine',
            equippedBy: null,
            subtype: 'spellbook',
            power: 11,
            description: `A living folio woven from enchanted vines and growth magic`
        },
        crimson_engine: {
            tier: 4,
            type: 'magical',
            icon: 'crimson_engine',
            name: 'Crimson Engine',
            equippedBy: null,
            subtype: 'spellbook',
            power: 12,
            description: `A blood-red engine-tome that amplifies destructive spells`
        },
        folio_of_coincidence: {
            tier: 4,
            type: 'magical',
            icon: 'folio_of_coincidence',
            name: 'Folio of Coincidence',
            equippedBy: null,
            subtype: 'spellbook',
            power: 12,
            description: `A folio that bends probability, making the unlikely inevitable`
        },
        folio_of_paradox: {
            tier: 4,
            type: 'magical',
            icon: 'folio_of_paradox',
            name: 'Folio of Paradox',
            equippedBy: null,
            subtype: 'spellbook',
            power: 14,
            description: `A folio containing contradictory truths that somehow all hold`
        },
        septemons_grimoire: {
            tier: 4,
            type: 'magical',
            icon: 'septemons_grimoire',
            name: "Septemon's Grimoire",
            equippedBy: null,
            subtype: 'spellbook',
            power: 15,
            description: `The legendary grimoire of Septemon, architect of seven sealed dimensions`
        }
    }
    // Move mask/ornament items into the magical collection so they are available
    // via the same initialization loop as other magical items. This replaces
    // the previous `this.ornaments` object.
    this.magical = Object.assign({}, this.magical, {
        crimson_mask: {
            tier: 3,
            type: 'magical',
            icon: 'crimson_mask',
            name: 'crimson mask',
            subtype: 'mask',
            equippedBy: null,
            power: 3,
            description: '50% damage reduction from demons and fire magic'
        },
        seraphic_mask: {
            tier: 3,
            type: 'magical',
            icon: 'seraphic_mask',
            name: 'seraphic mask',
            subtype: 'mask',
            equippedBy: null,
            power: 3,
            description: '50% damage reduction from undead and dark magic'
        },
        shadow_mask: {
            tier: 3,
            type: 'magical',
            icon: 'shadow_mask',
            name: 'shadow mask',
            subtype: 'mask',
            equippedBy: null,
            power: 3,
            description: '50% damage reduction from eldritch and dark magic'
        },
        twilight_mask: {
            tier: 3,
            type: 'magical',
            icon: 'twilight_mask',
            name: 'twilight mask',
            subtype: 'mask',
            equippedBy: null,
            power: 3,
            description: '50% damage reduction from all magic types'
        },
        eldritch_mask: {
            tier: 4,
            type: 'magical',
            icon: 'eldritch_mask',
            name: 'eldritch mask',
            subtype: 'mask',
            equippedBy: null,
            power: 4,
            description: ''
        },
        paradox_mask: {
            tier: 4,
            type: 'magical',
            icon: 'paradox_mask',
            name: 'paradox mask',
            subtype: 'mask',
            equippedBy: null,
            power: 4,
            description: ''
        },
        necrotic_mask: {
            tier: 4,
            type: 'magical',
            icon: 'necrotic_mask',
            name: 'necrotic mask',
            subtype: 'mask',
            equippedBy: null,
            power: 4,
            description: ''
        },
        entropic_mask: {
            tier: 4,
            type: 'magical',
            icon: 'entropic_mask',
            name: 'entropic mask',
            subtype: 'mask',
            equippedBy: null,
            power: 4,
            description: ''
        }
    });
    this.jewels = {
        ruby: {
            icon: 'ruby',
            type: 'jewel',
            name: 'ruby',
            tier: 1,
            shard: false,
            slottedIn: null
        },
        sapphire: {
            icon: 'sapphire',
            type: 'jewel',
            name: 'sapphire',
            tier: 1,
            shard: false,
            slottedIn: null
        },
        amber: {
            icon: 'amber',
            type: 'jewel',
            name: 'amber',
            tier: 1,
            shard: false,
            slottedIn: null
        },
        ruby_shards: {
            icon: 'ruby_shards',
            type: 'jewel',
            name: 'ruby shards',
            tier: 1,
            shard: true
        },
        sapphire_shards: {
            icon: 'sapphire_shards',
            type: 'jewel',
            name: 'sapphire shards',
            tier: 1,
            shard: true
        },
        amber_shards: {
            icon: 'amber_shards',
            type: 'jewel',
            name: 'amber shards',
            tier: 1,
            shard: true
        },
        polished_ruby: {
            icon: 'polished_ruby',
            type: 'jewel',
            name: 'polished ruby',
            tier: 2,
            shard: false,
            slottedIn: null
        },
        polished_sapphire: {
            icon: 'polished_sapphire',
            type: 'jewel',
            name: 'polished sapphire',
            tier: 2,
            shard: false,
            slottedIn: null
        },
        polished_amber: {
            icon: 'polished_amber',
            type: 'jewel',
            name: 'polished amber',
            tier: 2,
            shard: false,
            slottedIn: null
        },
        pyrite: {
            icon: 'pyrite',
            type: 'jewel',
            name: 'pyrite',
            tier: 2,
            shard: false,
            cluster: false,
            slottedIn: null
        },
        benthite: {
            icon: 'benthite',
            type: 'jewel',
            name: 'benthite',
            tier: 2,
            shard: false,
            cluster: false,
            slottedIn: null
        },
        memnite: {
            icon: 'memnite',
            type: 'jewel',
            name: 'memnite',
            tier: 2,
            shard: false,
            cluster: false,
            slottedIn: null
        },
        labradite: {
            icon: 'labradite',
            type: 'jewel',
            name: 'labradite',
            tier: 2,
            shard: false,
            cluster: false,
            slottedIn: null
        },
        malachite: {
            icon: 'malachite',
            type: 'jewel',
            name: 'malachite',
            tier: 2,
            shard: false,
            cluster: false,
            slottedIn: null
        },
        onyx: {
            icon: 'onyx',
            type: 'jewel',
            name: 'onyx',
            tier: 2,
            shard: false,
            cluster: false,
            slottedIn: null
        },
        moxite: {
            icon: 'moxite',
            type: 'jewel',
            name: 'moxite',
            tier: 2,
            shard: false,
            cluster: false,
            slottedIn: null
        },
        pyrite_cluster: {
            icon: 'pyrite_cluster',
            type: 'jewel',
            name: 'pyrite cluster',
            tier: 2,
            cluster: true
        },
        benthite_cluster: {
            icon: 'benthite_cluster',
            type: 'jewel',
            name: 'benthite cluster',
            tier: 2,
            cluster: true
        },
        memnite_cluster: {
            icon: 'memnite_cluster',
            type: 'jewel',
            name: 'memnite cluster',
            tier: 2,
            cluster: true
        },
        labradite_cluster: {
            icon: 'labradite_cluster',
            type: 'jewel',
            name: 'labradite cluster',
            tier: 2,
            cluster: true
        },
        malachite_cluster: {
            icon: 'malachite_cluster',
            type: 'jewel',
            name: 'malachite cluster',
            tier: 2,
            cluster: true
        },
        onyx_cluster: {
            icon: 'onyx_cluster',
            type: 'jewel',
            name: 'onyx cluster',
            tier: 2,
            cluster: true
        },
        moxite_cluster: {
            icon: 'moxite_cluster',
            type: 'jewel',
            name: 'moxite cluster',
            tier: 2,
            cluster: true
        },
        yazatas_focus: {
            icon: 'yazatas_focus',
            type: 'jewel',
            name: 'yazatas focus',
            tier: 3,
            shard: false,
            slottedIn: null
        },
        yazatas_focus_shards: {
            icon: 'yazatas_focus',
            type: 'jewel',
            name: 'yazatas focus shards',
            tier: 3,
            shard: true
        },
        mishnes_focus: {
            icon: 'mishnes_focus',
            type: 'jewel',
            name: 'mishnes focus',
            tier: 3,
            shard: false,
            slottedIn: null
        },
        mishnes_focus_shards: {
            icon: 'mishnes_focus',
            type: 'jewel',
            name: 'mishnes focus shards',
            tier: 3,
            shard: true
        },
        masekets_focus: {
            icon: 'masekets_focus',
            type: 'jewel',
            name: 'masekets focus',
            tier: 3,
            shard: false,
            slottedIn: null
        },
        masekets_focus_shards: {
            icon: 'masekets_focus',
            type: 'jewel',
            name: 'masekets focus shards',
            tier: 3,
            shard: true
        },
        abyssal_crystal: {
            icon: 'abyssal_crystal',
            type: 'jewel',
            name: 'abyssal focus',
            tier: 3,
            shard: false,
            slottedIn: null
        },
        abyssal_crystal_shards: {
            icon: 'abyssal_crystal',
            type: 'jewel',
            name: 'abyssal focus shards',
            tier: 3,
            shard: true
        }
    }
    this.runes = {
        volcanic_rune: {
            icon: 'volcanic_rune',
            type: 'rune',
            name: 'volcanic rune',
            tier: 1,
            shard: false
        },
        stone_rune: {
            icon: 'stone_rune',
            type: 'rune',
            name: 'stone rune',
            tier: 1,
            shard: false
        },
        pewter_rune: {
            icon: 'pewter_rune',
            type: 'rune',
            name: 'pewter rune',
            tier: 1,
            shard: false
        },
        earthen_rune: {
            icon: 'earthen_rune',
            type: 'rune',
            name: 'earthen rune',
            tier: 1,
            shard: false
        },
        onyxian_rune: {
            icon: 'onyxian_rune',
            type: 'rune',
            name: 'onyxian rune',
            tier: 1,
            shard: false
        },
        shadow_rune: {
            icon: 'shadow_rune',
            type: 'rune',
            name: 'shadow rune',
            tier: 1,
            shard: false
        },
        feldspar_rune: {
            icon: 'feldspar_rune',
            type: 'rune',
            name: 'feldspar rune',
            tier: 1,
            shard: false
        },
        archaic_rune: {
            icon: 'archaic_rune',
            type: 'rune',
            name: 'archaic rune',
            tier: 1,
            shard: false
        },
        sulphuric_rune: {
            icon: 'sulphuric_rune',
            type: 'rune',
            name: 'sulphuric rune',
            tier: 1,
            shard: false
        },
        volcanic_rune_shard: {
            icon: 'volcanic_rune',
            type: 'rune',
            name: 'volcanic rune shards',
            tier: 1,
            shard: true
        },
        stone_rune_shard: {
            icon: 'stone_rune',
            type: 'rune',
            name: 'stone rune shards',
            tier: 1,
            shard: true
        },
        pewter_rune_shard: {
            icon: 'pewter_rune',
            type: 'rune',
            name: 'pewter rune shards',
            tier: 1,
            shard: true
        },
        earthen_rune_shard: {
            icon: 'earthen_rune',
            type: 'rune',
            name: 'earthen rune shards',
            tier: 1,
            shard: true
        },
        onyxian_rune_shard: {
            icon: 'onyxian_rune',
            type: 'rune',
            name: 'onyxian rune shards',
            tier: 1,
            shard: true
        },
        shadow_rune_shard: {
            icon: 'shadow_rune',
            type: 'rune',
            name: 'shadow rune shards',
            tier: 1,
            shard: true
        },
        feldspar_rune_shard: {
            icon: 'feldspar_rune',
            type: 'rune',
            name: 'feldspar rune shards',
            tier: 1,
            shard: true
        },
        archaic_rune_shard: {
            icon: 'archaic_rune',
            type: 'rune',
            name: 'archaic rune shards',
            tier: 1,
            shard: true
        },
        sulphuric_rune_shard: {
            icon: 'sulphuric_rune',
            type: 'rune',
            name: 'sulphuric rune shards',
            tier: 1,
            shard: true
        }
    }
    this.misc = {
        ornate_key: {
            icon: 'ornate_key',
            type: 'key',
            name: 'ornate key',
            equippedBy: null,
        },
        minor_key: {
            icon: 'minor_key',
            type: 'key',
            name: 'minor key',
            equippedBy: null,
        },
        major_key: {
            icon: 'major_key',
            type: 'key',
            name: 'major key',
            equippedBy: null,
        },
        treasury_key: {
            icon: 'treasury_key',
            type: 'key',
            name: 'treasury key',
            equippedBy: null,
        },
        cryptic_key: {
            icon: 'cryptic_key',
            type: 'key',
            name: 'cryptic key',
            equippedBy: null,
        },
        lockbox_key: {
            icon: 'lockbox_key',
            type: 'key',
            name: 'lockbox key',
            equippedBy: null,
        },
        necrotic_key: {
            icon: 'necrotic_key',
            type: 'key',
            name: 'necrotic key',
            equippedBy: null,
        },
        necrotic_master_key: {
            icon: 'necrotic_master_key',
            type: 'key',
            name: 'necrotic master key',
            equippedBy: null,
        },
        violet_key: {
            icon: 'violet_key',
            type: 'key',
            name: 'violet key',
            equippedBy: null,
        },
        rubicund_key: {
            icon: 'rubicund_key',
            type: 'key',
            name: 'rubicund key',
            equippedBy: null,
        },
        cyan_key: {
            icon: 'cyan_key',
            type: 'key',
            name: 'cyan key',
            equippedBy: null,
        },
        imperial_key: {
            icon: 'imperial_key',
            type: 'key',
            name: 'imperial key',
            equippedBy: null,
        },
        dimensional_key: {
            icon: 'dimensional_key',
            type: 'key',
            name: 'dimensional key',
            equippedBy: null,
        },
        master_key: {
            icon: 'master_key',
            type: 'key',
            name: 'master key',
            equippedBy: null,
        },
        crown: {
            icon: 'crown',
            type: 'crown',
            name: 'crown',
            equippedBy: null,
        },
        lantern: {
            icon: 'lantern',
            type: 'lantern',
            name: 'lantern',
            equippedBy: null,
        },
        curse_doll: {
            icon: 'curse_doll',
            type: 'special',
            name: 'curse doll',
            equippedBy: null,
        },
        moxadite_banner: {
            icon: 'moxadite_banner',
            type: 'misc',
            name: 'moxadite banner',
            equippedBy: null,
            description: 'Plant a banner beacon into the earth and travel to it at will.'
        },
        benthachite_banner: {
            icon: 'benthachite_banner',
            type: 'misc',
            name: 'benthachite banner',
            equippedBy: null,
            description: 'Plant a banner beacon into the earth and travel to it at will.'
        },
        pyremnite_banner: {
            icon: 'pyremnite_banner',
            type: 'misc',
            name: 'pyremnite banner',
            equippedBy: null,
            description: 'Plant a banner beacon into the earth and travel to it at will.'
        },

        // crystals


    }

    // Fill any explicitly blank descriptions without overwriting authored text.
    // This ensures all items that declare a `description` key have usable copy.
    this.buildAutoDescription = (item, key = '') => {
        if (!item) return '';
        const itemName = (item.name && String(item.name).trim())
            ? String(item.name).trim()
            : String(key || 'item').replaceAll('_', ' ');
        const subtype = item.subtype ? String(item.subtype).toLowerCase() : '';

        if (item.type === 'weapon' && typeof item.damage === 'number') {
            return `${itemName} grants +${item.damage}% base atk and +${(item.damage * 0.1).toFixed(1)} flat damage.`;
        }

        if (typeof item.armor === 'number') {
            if (subtype === 'boots') {
                return `${itemName} reinforces footing and lower-body protection. Defense: ${item.armor}.`;
            }
            if (subtype === 'helm') {
                return `${itemName} protects the head and face in combat. Defense: ${item.armor}.`;
            }
            if (subtype === 'shield') {
                return `${itemName} offers reliable blocking coverage. Defense: ${item.armor}.`;
            }
            return `${itemName} provides defensive protection. Defense: ${item.armor}.`;
        }

        if (item.type === 'magical') {
            if (typeof item.power === 'number') {
                return `${itemName} channels arcane focus. Power: ${item.power}.`;
            }
            if (subtype) {
                return `${itemName} is a magical ${subtype} used by seasoned adventurers.`;
            }
            return `${itemName} is a magical item imbued with arcane properties.`;
        }

        return `${itemName} is an adventuring item.`;
    };

    this.hydrateBlankDescriptions = (collection) => {
        if (!collection || typeof collection !== 'object') return;
        Object.entries(collection).forEach(([key, item]) => {
            if (!item || typeof item !== 'object') return;
            if (!Object.prototype.hasOwnProperty.call(item, 'description')) return;
            const hasText = typeof item.description === 'string' && item.description.trim().length > 0;
            if (hasText) return;
            item.description = this.buildAutoDescription(item, key);
        });
    };

    this.hydrateBlankDescriptions(this.weapons);
    this.hydrateBlankDescriptions(this.armor);
    this.hydrateBlankDescriptions(this.magical);

    this.allItems = {};
    // Build category key list defensively so a missing/undefined category array
    // never crashes InventoryManager construction.
    this.items = [].concat(
        this.weapons_names || [],
        this.masks_names || [],
        this.helms_names || [],
        this.keys_names || [],
        this.amulets_names || [],
        this.charms_names || [],
        this.wands_names || [],
        this.staves_names || [],
        this.misc_names || [],
        this.jewels_names || [],
        this.runes_names || [],
        this.shields_names || [],
        this.boots_names || [],
        this.tabards_names || []
    )
    this.initializeItems = (data = null) => {
        for (let key in this.consumables) {
            this.allItems[key] = this.consumables[key]
        }
        // Masks/ornaments were merged into `this.magical` above. We no longer
        // iterate `this.ornaments` here.
        for (let key in this.armor) {
            this.allItems[key] = this.armor[key]
        }
        for (let key in this.magical) {
            this.allItems[key] = this.magical[key]
        }
        for (let key in this.jewels) {
            this.allItems[key] = this.jewels[key]
        }
        for (let key in this.runes) {
            this.allItems[key] = this.runes[key]
        }
        for (let key in BREW_INGREDIENTS) {
            this.allItems[key] = BREW_INGREDIENTS[key];
        }
        for (let key in REAGENTS) {
            this.allItems[key] = REAGENTS[key];
        }
        this.iconToKey = {};
        for (let key in this.weapons) {
            this.allItems[key] = this.weapons[key];
            // Stamp each weapon entry with its own key so saved copies can be
            // re-hydrated even without knowing the original property name.
            if (this.allItems[key] && !this.allItems[key]._im_key) {
                this.allItems[key]._im_key = key;
            }
            // Build icon→key fallback for items saved before _im_key existed.
            // First writer wins; duplicate icons (e.g. gladius) map to the
            // first definition encountered.
            const icon = this.weapons[key] && this.weapons[key].icon;
            if (icon && !this.iconToKey[icon]) this.iconToKey[icon] = key;
        }
        for (let key in this.misc) {
            // Keep richer metadata (especially descriptions on key items)
            // if a misc entry shares the same key as an existing item.
            const existing = this.allItems[key];
            const next = this.misc[key];
            this.allItems[key] = {
                ...(existing || {}),
                ...(next || {}),
                description: (next && next.description) || (existing && existing.description) || ''
            }
        }
        this.inventory = [];
        if (!data) {
            this.inventory = this.getStarterPack();
            this.gold = 0
            this.shimmering_dust = 0
            this.totems = 0
        } else {
            this.inventory = data.items.map(e => {
                const equippedBy = e.equippedBy;
                // Prefer _im_key (stamped on weapons at initializeItems time) so
                // dropped weapons survive save/reload. Fall back to name-based lookup
                // for consumables and older saved items that lack _im_key.
                const key = (e._im_key && this.allItems[e._im_key])
                    ? e._im_key
                    : (e.name || '').replaceAll(' ', '_');
                if (this.allItems[key]) {
                    const v = copy(this.allItems[key]);
                    if (v) v.equippedBy = equippedBy;
                    return v;
                } else {
                    console.warn('InventoryManager: unknown saved item key:', key, '| item:', e);
                    return null;
                }
            }).filter(v => v !== null);
            this.gold = data.gold;
            this.shimmering_dust = data.shimmering_dust;
            this.totems = data.totems;
        }
    }
    // Re-hydrate every weapon in an inventory array from the current allItems
    // definitions so that changes to damage/stats in this file are always the
    // source of truth for combat.  Non-weapon items and unknown weapons are
    // returned as-is.  Slot/equipped metadata is preserved.
    this.refreshWeaponStats = (inventory) => {
        if (!Array.isArray(inventory)) return inventory;
        return inventory.map(item => {
            if (!item || item.type !== 'weapon') return item;
            const k = (item._im_key && this.allItems[item._im_key])
                ? item._im_key
                : (item.icon && this.iconToKey && this.iconToKey[item.icon])
                    ? this.iconToKey[item.icon]
                    : null;
            if (!k || !this.allItems[k]) return item;
            const refreshed = copy(this.allItems[k]);
            if (!refreshed) return item;
            refreshed.equippedBy = item.equippedBy != null ? item.equippedBy : refreshed.equippedBy;
            refreshed.equippedSlot = item.equippedSlot != null ? item.equippedSlot : refreshed.equippedSlot;
            // Auto-correct the damage number in "+N% atk" so allItems damage is always reflected.
            if (refreshed.description && refreshed.damage != null) {
                refreshed.description = refreshed.description.replace(/\+\d+% atk/, `+${refreshed.damage}% atk`);
            }
            return refreshed;
        });
    };

    this.addItemsByName = (items) => {
        let arr = [];
        items.forEach(e => {
            if (this.allItems[e]) {
                const v = copy(this.allItems[e]);
                if (v) arr.push(v);
            } else {
                console.warn('addItemsByName: unknown item key:', e);
            }
        })
        this.inventory = this.inventory.concat(arr);
    }
    // this.addItems = (items) => {
    //     this.inventory.concat(items)
    // }
    this.addItem = (item) => {
        this.inventory.push(item);
    }
    this.removeItemByIndex = (index) => {
        this.inventory.splice(index, 1)
    }
    // Remove the first occurrence of an item with the given key that is not equipped.
    this.removeItemByKey = (key) => {
        const idx = this.inventory.findIndex(item =>
            item &&
            item.equippedBy == null &&
            (item._im_key === key ||
                (item.name || '').replace(/ /g, '_') === key ||
                item.name === key)
        );
        if (idx !== -1) this.inventory.splice(idx, 1);
    }
    this.addCurrency = (data) => {
        switch (data.type) {
            case 'gold':
                this.gold += data.amount;
                break;
            case 'shimmering_dust':
                this.shimmering_dust += data.amount;
                break;
            case 'shimmering dust':
                this.shimmering_dust += data.amount;
                break;
            case 'totems':
                this.totems += data.amount;
                break;
            default:
                break;
        }
    }
    this.getStarterPack = () => {
        return [
            {
                effect: 'health gain',
                amount: 15,
                icon: 'minor_health_potion',
                type: 'consumable',
                name: 'minor health potion',
                equippedBy: null
            },
            {
                effect: 'health gain',
                amount: 15,
                icon: 'minor_health_potion',
                type: 'consumable',
                name: 'minor health potion',
                equippedBy: null
            },
            {
                effect: 'health gain',
                amount: 15,
                icon: 'minor_health_potion',
                type: 'consumable',
                name: 'minor health potion',
                equippedBy: null
            },
            {
                effect: 'health gain',
                amount: 15,
                icon: 'minor_health_potion',
                type: 'consumable',
                name: 'minor health potion',
                equippedBy: null
            },
        ]
    }

    // ── Tier weapon pools ────────────────────────────────────────────────────────
    this.TIER1_WEAPONS = [
        'woodcutters_axe', 'bloodcleaver_axe', 'hillbiter_axe', 'ironcleaver_axe',
        'rune_axe', 'timberfall_axe', 'grovehack_axe', 'stormsplitter_axe',
        'bonecutter_axe', 'frostedge_axe', 'emberchop_axe',
        'shortsword_sword', 'cutlass_sword', 'gladius_sword', 'falchion_sword',
        'longsword_sword', 'broadsword_sword', 'golden_gladius_sword',
        'wyrmsbane_sword', 'katana_sword', 'claymore_sword', 'greatsword_sword',
    ];
    this.TIER2_WEAPONS = [
        'razorfang_axe', 'stonebreaker_axe', 'mossreaper_axe', 'warcleaver_axe',
        'blackroot_axe', 'dawnsplitter_axe', 'duskbane_axe',
        'doomreaver_sword', 'nightfall_sword', 'dreadedge_sword', 'sunsteel_sword',
        'voidrender_sword', 'warlords_cleaver_sword', 'emberbrand_sword',
    ];
    this.TIER3_WEAPONS = [
        'thunderhewer_axe', 'skullsplitter_axe', 'giantsbane_axe', 'vinecutter_axe',
        'obsidian_axe', 'ashwood_axe', 'drakebane_axe',
        'frostbite_sword', 'bloodsong_sword', 'shadowfang_sword', 'skymourne_sword',
        'opalveil_sword', 'titans_claw_sword', 'entropy_sword',
    ];
    this.TIER4_WEAPONS = [
        // No tier-4 weapons defined yet, use tier 3 pool
        ...this.TIER3_WEAPONS
    ];

    // ── Tier armor pools (shields, boots, helms, masks) ─────────────────────────
    this.TIER1_ARMOR = [
        'buckler', 'infantry_shield', 'cold_steel_shield',
        'travelers_boots', 'wayfinders_boots', 'oily_boots', 'highwaymans_boots',
        'voyagers_boots', 'northerners_boots', 'midas_boots', 'sentinels_boots',
        'imperial_boots', 'mariners_boots', 'magicians_boots', 'sorcerers_boots',
        'shadow_boots', 'twilight_boots', 'moonstone_boots', 'eldritch_boots',
        'glimmering_boots', 'princes_boots', 'lords_boots', 'golems_boots',
        'darklings_boots', 'ornate_boots', 'rainmans_boots',
        'basic_helm', 'knight_helm', 'spartan_helm', 'legionaire_helm', 'cretan_helm',
        'archer_helm', 'kettle_hat', 'hounskull', 'plague_helm', 'warlord_helm',
        'crimson_mask', 'eldritch_mask', 'entropic_mask', 'necrotic_mask', 'paradox_mask',
        'seraphic_mask', 'shadow_mask', 'twilight_mask',
    ];
    this.TIER2_ARMOR = [
        'crusaders_shield', 'dawnguard', 'twilight_screen',
        'nasal_helm_upgradeable', 'soldier_helm_upgradeable', 'crusader_helm_upgradeable',
        'cavalry_helm_upgradeable', 'war_helm_upgradeable', 'coif_helm_upgradeable',
        'gladiator_helm_upgradeable', 'battle_mage_helm_upgradeable', 'knight_helm_upgradeable',
        'janissary_helm_upgradeable', 'bascinet_upgradeable', 'imperial_helm_upgradeable',
        'ranger_hood_upgradeable',
    ];
    this.TIER3_ARMOR = [
        'revenants_shield', 'aegis_bulwark',
        'juggernaut_helm', 'moonlord_helm', 'witch_knight_helm', 'collosus_helm', 'omega_helm',
        'immortal_helm', 'nasal_helm_upgradeable_upgraded', 'soldier_helm_upgradeable_upgraded',
        'crusader_helm_upgradeable_upgraded', 'cavalry_helm_upgradeable_upgraded',
        'war_helm_upgradeable_upgraded', 'coif_helm_upgradeable_upgraded',
        'gladiator_helm_upgradeable_upgraded', 'battle_mage_helm_upgradeable_upgraded',
        'knight_helm_upgradeable_upgraded', 'janissary_helm_upgradeable_upgraded',
        'bascinet_upgradeable_upgraded', 'imperial_helm_upgradeable_upgraded',
        'ranger_hood_upgradeable_upgraded',
    ];
    this.TIER4_ARMOR = [];

    // ── Tier magical pools (wands, staves, spellbooks, tablets, engines, folios, charms, amulets, manuals) ──
    this.TIER1_MAGICAL = [
        'cloudfire_wand', 'animus_wand', 'glyndas_wand',
        'archmages_staff', 'enchanters_staff', 'imperial_mage_staff',
        'oily_manual', 'bound_tome', 'glowing_tome', 'kelrigans_manual',
        'beetle_charm', 'demonskull_charm', 'evilai_charm', 'hamsa_charm',
        'lundi_charm', 'nukta_charm', 'scarab_charm',
        'elasi_amulet', 'darkarrow_amulet', 'elemental_amulet', 'silver_amulet',
        'ruby_amulet', 'acorn_amulet', 'voodoo_amulet', 'yaga_amulet',
        'temprance_amulet', 'emerald_amulet', 'maconic_amulet',
    ];
    this.TIER2_MAGICAL = [
        'justicator_wand', 'willowcaster',
        'staff_of_espilon', 'staff_of_marduk', 'staff_of_omicron',
        'the_watchful_eye', 'moonbird_folio', 'icewing_folio',
        'emerald_tablet', 'ruby_tablet',
        'warding_amulet', 'bloodvial_amulet', 'enchantress_amulet', 'goldclaw_amulet',
        'clerics_amulet', 'queens_amulet',
    ];
    this.TIER3_MAGICAL = [
        'staff_of_tomorrow',
        'feldons_manual', 'the_beast_book', 'book_of_jade',
        'igors_grimoire', 'forbidden_grimoire',
        'ice_amulet', 'hypnosis_amulet', 'vampiric_amulet', 'platinum_amulet', 'necrotic_amulet',
    ];
    this.TIER4_MAGICAL = [
        'monadic_engine', 'verdant_engine', 'crimson_engine',
        'folio_of_coincidence', 'folio_of_paradox', 'septemons_grimoire',
        'voidward_amulet', 'celestial_amulet', 'dimensional_amulet',
    ];

    // ── Mixed item pools (weapons, armor, magical) per tier ──────────────────────
    this.TIER1_ITEM = [this.TIER1_WEAPONS, this.TIER1_ARMOR, this.TIER1_MAGICAL];
    this.TIER2_ITEM = [this.TIER2_WEAPONS, this.TIER2_ARMOR, this.TIER2_MAGICAL];
    this.TIER3_ITEM = [this.TIER3_WEAPONS, this.TIER3_ARMOR, this.TIER3_MAGICAL];
    this.TIER4_ITEM = [this.TIER4_WEAPONS, this.TIER4_ARMOR, this.TIER4_MAGICAL];

    this.TIER1_POTION = 'minor_health_potion';
    this.TIER2_POTION = 'major_health_potion';
    this.TIER3_POTION = 'grand_health_potion';
    this.TIER4_POTION = 'supreme_health_potion';
}

// Create a singleton instance to provide tier pools
export const inventoryManager = new InventoryManager();