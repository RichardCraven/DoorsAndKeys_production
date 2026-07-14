import * as images from '../utils/images'
import { inventoryManager } from '../utils/inventory-manager'

// ── Tier weapon pools (from inventoryManager) ────────────────────────────────
const TIER1_WEAPONS = inventoryManager.TIER1_WEAPONS;
const TIER2_WEAPONS = inventoryManager.TIER2_WEAPONS;

// ── Tier magical pools (from inventoryManager) ──────────────────────────────
const TIER2_MAGICAL = inventoryManager.TIER2_MAGICAL;
const TIER3_MAGICAL = inventoryManager.TIER3_MAGICAL;

// ── Tier armor pools (from inventoryManager) ───────────────────────────────

// Mixed item pools (weapons, armor, magical) per tier
const TIER1_ITEM = inventoryManager.TIER1_ITEM;
const TIER3_ITEM = inventoryManager.TIER3_ITEM;
const TIER4_ITEM = inventoryManager.TIER4_ITEM;

const TIER1_POTION = inventoryManager.TIER1_POTION;
const TIER2_POTION = inventoryManager.TIER2_POTION;
const TIER3_POTION = inventoryManager.TIER3_POTION;
const TIER4_POTION = inventoryManager.TIER4_POTION;

export function MonsterManager() {
    this.pickRandom = (array) => {
        let index = Math.floor(Math.random() * array.length)
        return array[index]
    }
    this.battleMonster = null;
    this.monsters = {
        // ── Level 2 ──────────────────────────────────────────────────────
        goblin: {
            type: 'goblin',
            tier: 1,
            subtype: 'brutekin',
            key: 'goblin',
            image_names: ['goblin'],
            monster_names: ['Wiggit', 'Miggi', "Gurnak"],
            lordName: 'Glundok the Cruel',
            stats: {
                hp: 38,
                atk: 3,
                def: 5,
                speed: 11, // nimble, hard to pin down
                willpower: 1,
                str: 3,
                int: 2,
                dex: 8,
                fort: 3
            },
            level: 2,
            portrait: images['goblin_portrait'],
            greetings: ['bones for my master!'],
            deathCries: ['nooooooo'],
            skills: ['claw_strike', 'bite'],
            minions: ['goblin', 'goblin', 'goblin'],
            weaknesses: ['crushing', 'cutting', 'electricity'],
            drops: [
                { item: TIER1_POTION, percentChance: 35 },
                { itemPool: TIER1_WEAPONS, percentChance: 25 },
            ]
        },
        // ── Level 3 ──────────────────────────────────────────────────────
        skeleton: {
            type: 'skeleton',
            tier: 1,
            subtype: 'undead',
            key: 'skeleton',
            image_names: ['skeleton'],
            monster_names: ['bones'],
            lordName: 'Bonelord',
            stats: {
                hp: 50,
                atk: 5,
                def: 7,
                speed: 7, // shambling undead
                willpower: 2,
                str: 4,
                int: 1,
                dex: 4,
                fort: 5
            },
            level: 3,
            portrait: images['skeleton_portrait'],
            greetings: ['*screech*'],
            deathCries: ['*screech*'],
            skills: ['sword_swing', 'reassembly'],
            minions: ['skeleton', 'skeleton'],
            weaknesses: ['fire'],
            drops: [
                { item: TIER1_POTION, percentChance: 35 },
                { itemPool: TIER1_ITEM, percentChance: 35 },
            ]
        },
        // ── Level 4 (minion) ─────────────────────────────────────────────
        kabuki_demon_minion: {
            type: 'kabuki_demon_minion',
            isMinion: true,
            tier: 1,
            subtype: 'demon',
            key: 'kabuki_demon_minion',
            image_names: ['kabuki_demon_minion'],
            monster_names: ['Ikiro', 'Jimbu'],
            lordName: 'Lord Sargas',
            stats: {
                hp: 50,
                atk: 5,
                def: 3,
                speed: 10, // agile demon
                willpower: 3,
                str: 4,
                int: 6,
                dex: 7,
                fort: 4
            },
            level: 4,
            portrait: images['kabuki_demon_minion_portrait'],
            greetings: ['Assaaa'],
            deathCries: ['No! Impossible!'],
            skills: ['void_lance', 'magic_missile', 'obliterate', 'invisibility'],
            passives: ['flying'],
            weaknesses: ['arcane', 'holy'],
            minions: ['kabuki_demon_minion', 'kabuki_demon_minion'],
            drops: [
                { item: TIER1_POTION, percentChance: 35 },
                { itemPool: TIER1_WEAPONS, percentChance: 35 },
            ]
        },
        // ── Level 5 (minion) ─────────────────────────────────────────────
        beholder_minion: {
            type: 'beholder_minion',
            isMinion: true,
            tier: 1,
            subtype: 'eldritch',
            key: 'beholder_minion',
            image_names: ['beholder_minion'],
            monster_names: ['Nirnuceks', 'Adalak', 'Vemrindon'],
            lordName: 'The Putrid Crawler',
            stats: {
                hp: 60,
                atk: 7,
                def: 2,
                speed: 8, // floating eyeball
                willpower: 3,
                str: 3,
                int: 7,
                dex: 5,
                fort: 4
            },
            level: 5,
            portrait: images['beholder_minion_portrait'],
            portraitFilter: 'sepia(0.4) hue-rotate(320deg)',
            greetings: ['Vukdaj kolo gurdu'],
            deathCries: ['Urdu meklak milnauru...'],
            skills: ['claw_strike', 'bifurcate', 'minor_magic_missile'],
            passives: ['flying'],
            weaknesses: ['arcane', 'holy'],
            minions: ['beholder_minion', 'beholder_minion'],
            drops: [
                { item: TIER1_POTION, percentChance: 35 },
                { itemPool: TIER1_WEAPONS, percentChance: 35 },
            ]
        },
        horned_pet: {
            type: 'horned_pet',
            isMinion: true,
            tier: 2,
            subtype: 'demon',
            key: 'horned_pet',
            image_names: ['horned_pet'],
            monster_names: ['Spiketooth', 'Gorehound', 'Ravager'],
            lordName: `Hashmalim's Dog`,
            stats: {
                hp: 60,
                atk: 7,
                def: 6,
                speed: 9,
                willpower: 3,
                str: 5,
                int: 3,
                dex: 6,
                fort: 4
            },
            level: 5,
            portrait: images['horned_pet_portrait'],
            greetings: ['*growls and flares its horns*', '*snarls fiercely*'],
            deathCries: ['*whines and collapses*'],
            skills: ['rake', 'bite', 'head_butt'],
            weaknesses: ['holy'],
            minions: ['skeleton', 'skeleton'],
            drops: [
                { item: TIER1_POTION, percentChance: 35 },
                { itemPool: TIER1_ITEM, percentChance: 35 },
            ]
        },
        // ── Level 6 ──────────────────────────────────────────────────────
        ghoul: {
            type: 'ghoul',
            tier: 2,
            subtype: 'undead',
            key: 'ghoul',
            image_names: ['ghoul'],
            monster_names: ['lurch'],
            lordName: 'Skrabl',
            stats: {
                hp: 80,
                atk: 7,
                def: 6,
                speed: 5,
                willpower: 3,
                str: 7,
                int: 3,
                dex: 6,
                fort: 4
            },
            level: 6,
            portrait: images['ghoul_portrait'],
            minions: ['beholder_minion', 'beholder_minion'],
            greetings: [], deathCries: [], skills: [], weaknesses: [], drops: []
        },
        archaic_familiar: {
            type: 'archaic_familiar',
            tier: 2,
            subtype: 'undead',
            key: 'archaic_familiar',
            image_names: ['archaic_familiar'],
            monster_names: ['none'],
            lordName: '',
            stats: {
                hp: 80,
                atk: 7,
                def: 6,
                speed: 5,
                willpower: 3,
                str: 7,
                int: 3,
                dex: 6,
                fort: 4
            },
            level: 6,
            portrait: 'archaic_familiar_portrait',
            minions: [],
            greetings: [], deathCries: [], skills: ['lightning_strike', 'ice_blast'], weaknesses: ['crushing'], drops: []
        },
        blalok: {
            type: 'blalok',
            tier: 2,
            subtype: 'aberration',
            key: 'blalok',
            image_names: ['blalok'],
            lordName: 'Ghulguth the Soul Glutton',
            monster_names: ['blalokin', 'blalorn', 'blaloz'],
            stats: {
                hp: 90,
                atk: 7,
                def: 6,
                speed: 9,
                willpower: 3,
                str: 5,
                int: 3,
                dex: 6,
                fort: 4
            },
            level: 6,
            minions: ['blalok', 'blalok'],
            portrait: images['blalok'],
            greetings: [], deathCries: [], skills: ['claw_strike', 'bite', 'regenerate', 'sacrificial_mending'], weaknesses: [], drops: []
        },
        shade: {
            type: 'shade',
            tier: 2,
            subtype: 'undead',
            key: 'shade',
            image_names: ['shade'],
            monster_names: ['Whisperer', 'Gloom'],
            lordName: 'Oblivion',
            stats: {
                hp: 120,
                atk: 8,
                def: 8,
                speed: 10,
                willpower: 4,
                str: 3,
                int: 7,
                dex: 6,
                fort: 4
            },
            level: 6,
            portrait: images['shade'],
            greetings: ['*chilling whispers*', 'the shadows consume you'],
            deathCries: ['*shrieks and fades*'],
            skills: ['undead_grasp', 'despair', 'induce_fear'],
            weaknesses: ['fire', 'holy'],
            minions: ['shade'],
            drops: [
                { item: TIER1_POTION, percentChance: 35 },
                { itemPool: TIER1_ITEM, percentChance: 35 },
            ]
        },
        troll: {
            type: 'troll',
            tier: 2,
            subtype: 'brutekin',
            key: 'troll',
            image_names: ['troll'],
            monster_names: ['Mundzungu', 'Wugum'],
            lordName: 'Brog the Tenderizer',
            stats: {
                hp: 178,
                atk: 10,
                def: 13,
                speed: 5, // big lumbering brute
                willpower: 2,
                str: 9,
                int: 2,
                dex: 3,
                fort: 9
            },
            level: 6,
            portrait: images['troll_portrait'],
            greetings: ['you stink of fresh meat'],
            deathCries: ['*gurgle*'],
            skills: ['claw_strike', 'bite', 'regenerate', 'gore'],
            weaknesses: ['fire'],
            minions: ['goblin', 'goblin'],
            drops: [
                { item: TIER1_POTION, percentChance: 35 },
                { itemPool: TIER1_ITEM, percentChance: 35 },
            ]
        },
        mummy: {
            type: 'mummy',
            tier: 2,
            subtype: 'undead',
            key: 'mummy',
            image_names: ['mummy'],
            monster_names: ['Kufu', 'Razeset'],
            lordName: 'Akmen-Ra the Undying',
            stats: {
                hp: 190,
                atk: 10,
                def: 13,
                speed: 4, // slow ancient undead — easy to hit but very tanky
                willpower: 5,
                str: 7,
                int: 5,
                dex: 2,
                fort: 10
            },
            level: 6,
            portrait: images['mummy_portrait'],
            greetings: ['time is unravelling'],
            deathCries: ['at last'],
            skills: ['claw_strike', 'induce_fear', 'energy_drain', 'undead_grasp'],
            weaknesses: ['arcane', 'fire', 'electricity'],
            minions: ['skeleton', 'shade'],
            drops: [
                { item: TIER1_POTION, percentChance: 35 },
                { itemPool: TIER1_ITEM, percentChance: 50 },
            ]
        },
        basilisk_cultists: {
            type: 'basilisk_cultists',
            tier: 2,
            subtype: 'eldritch',
            key: 'basilisk_cultists',
            image_names: ['basilisk_cultists'],
            monster_names: ['Acolyte Vane', 'Zealot Malakor', 'Initiate Selene'],
            lordName: 'Mewlok the Mad',
            stats: {
                hp: 80,
                atk: 6,
                def: 5,
                speed: 9,
                willpower: 6,
                str: 3,
                int: 8,
                dex: 7,
                fort: 4
            },
            level: 7,
            portrait: images['basilisk_cultists_portrait'],
            greetings: ['Hear the whispers...', 'The master speaks to us!'],
            deathCries: ['The whispers... end...'],
            skills: ['magic_missile', 'fireball', 'ice_blast'],
            weaknesses: ['holy', 'physical'],
            minions: ['blalok', 'blalok'],
            drops: [
                { item: TIER1_POTION, percentChance: 35 },
                { itemPool: TIER1_ITEM, percentChance: 35 },
            ]
        },
        // ── Level 8 ──────────────────────────────────────────────────────
        wraith: {
            type: 'wraith',
            tier: 2,
            subtype: 'undead',
            key: 'wraith',
            image_names: ['wraith'],
            monster_names: ['Sicirath', 'Olnuk', 'Ygra'],
            lordName: 'Vesper the Soul Collector',
            stats: {
                hp: 128,
                atk: 9,
                def: 8,
                speed: 12, // ghostly, nearly untouchable
                willpower: 5,
                str: 3,
                int: 7,
                dex: 9,
                fort: 4
            },
            level: 8,
            portrait: images['wraith_portrait'],
            greetings: ['*hissssss*', 'come to the silence'],
            deathCries: ['*screams*'],
            skills: ['undead_grasp', 'nether_bolt', 'invoke_darkness', 'shadow_armor'],
            weaknesses: ['holy', 'psionic'],
            minions: ['shade', 'shade'],
            drops: [
                { item: TIER1_POTION, percentChance: 35 },
                { itemPool: TIER1_ITEM, percentChance: 50 },
            ]
        },
        ogre: {
            type: 'ogre',
            tier: 2,
            subtype: 'brutekin',
            key: 'ogre',
            image_names: ['ogre'],
            monster_names: ['Uggo', 'Tubodu', 'Gumluk'],
            lordName: 'Ug the Unmindful',
            stats: {
                hp: 192,
                atk: 9,
                def: 11,
                speed: 5, // massive but slow
                willpower: 3,
                str: 8,
                int: 2,
                dex: 3,
                fort: 8
            },
            level: 8,
            portrait: images['ogre_portrait'],
            greetings: ['Guarkog buzu', 'Mogab burdu'],
            deathCries: ['*gurgle*'],
            skills: ['claw_strike', 'bite', 'stomp', 'head_butt'],
            weaknesses: ['fire', 'psionic'],
            minions: ['blalok', 'blalok', 'goblin', 'goblin'],
            drops: [
                { item: TIER1_POTION, percentChance: 35 },
                { itemPool: TIER1_WEAPONS, percentChance: 45 },
            ],
        },
        // ── Level 9 ──────────────────────────────────────────────────────
        gorgon: {
            type: 'gorgon',
            tier: 2,
            subtype: 'serpentine',
            key: 'gorgon',
            image_names: ['gorgon'],
            monster_names: ['Lithios', 'Merkaba', 'Axolus'],
            lordName: 'The Great Mother',
            stats: {
                hp: 162,
                atk: 8,
                def: 9,
                speed: 8, // serpentine, medium agility
                willpower: 5,
                str: 6,
                int: 5,
                dex: 6,
                fort: 6
            },
            level: 9,
            portrait: images['gorgon_portrait'],
            greetings: ['Ssssurrenderrrr', 'Be ssstill'],
            deathCries: ['Arrrghhh!'],
            skills: ['snake_strike', 'bite', 'petrify'],
            weaknesses: ['ice', 'psionic'],
            minions: ['basilisk_cultists', 'blalok', 'blalok'],
            drops: [
                { item: TIER1_POTION, percentChance: 35 },
                { itemPool: TIER1_WEAPONS, percentChance: 45 },
            ]
        },
        // ── Level 10 ─────────────────────────────────────────────────────
        vampire: {
            type: 'vampire',
            tier: 2,
            subtype: 'undead',
            key: 'vampire',
            image_names: ['black_vampire'],
            monster_names: ['Vukodlak', 'Morias', 'Sekhem Apep'],
            lordName: 'Lord Sengir',
            stats: {
                hp: 204,
                atk: 9,
                def: 12,
                speed: 13, // supernaturally fast
                willpower: 7,
                str: 6,
                int: 7,
                dex: 10,
                fort: 6
            },
            level: 10,
            portrait: images['vampire_portrait'],
            greetings: ['My hunger sees you'],
            deathCries: ['Peace at last...'],
            skills: ['vampiric_bite', 'claw_strike', 'bat_fly', 'crimson_sight', 'soul_suck'],
            weaknesses: ['arcane', 'holy'],
            minions: ['ghoul', 'skeleton', 'skeleton'],
            drops: [
                { item: TIER2_POTION, percentChance: 35 },
                { itemPool: TIER2_WEAPONS, percentChance: 45 },
            ]
        },
        high_priest_of_the_basilisk: {
            type: 'high_priest_of_the_basilisk',
            tier: 3,
            subtype: 'aberration',
            key: 'high_priest_of_the_basilisk',
            image_names: ['high_priest_of_the_basilisk'],
            monster_names: ['Kael-Zara', 'Zul-Garth', 'Mok-Tor'],
            lordName: 'Shithrak the Pestilent',
            stats: {
                hp: 140,
                atk: 11,
                def: 12,
                speed: 7,
                willpower: 5,
                str: 8,
                int: 7,
                dex: 6,
                fort: 7
            },
            level: 10,
            portrait: images['high_priest_of_the_basilisk_portrait'],
            greetings: ['*chants in tongues of the cosmos*', 'The stars demand your blood!'],
            deathCries: ['*cosmic screams*'],
            skills: ['voidbite', 'paradox_engine', 'void_rake', 'invoke_darkness', 'eldritch_wind'],
            weaknesses: ['holy', 'fire'],
            minions: ['basilisk_cultists', 'blalok', 'blalok'],
            drops: [
                { item: TIER2_POTION, percentChance: 35 },
                { itemPool: TIER2_WEAPONS, percentChance: 35 },
            ]
        },

        // ── Level 11 ─────────────────────────────────────────────────────
        goat_demon: {
            type: 'goat_demon',
            tier: 3,
            subtype: 'demon',
            key: 'goat_demon',
            image_names: ['goat_demon'],
            monster_names: ['ur-Xulu', 'ur-Baba', 'ur-Zuzu'],
            lordName: 'Lord Balaxu',
            stats: {
                hp: 155,
                atk: 11,
                def: 11,
                speed: 10, // demonic quickness
                willpower: 6,
                str: 7,
                int: 6,
                dex: 7,
                fort: 6
            },
            level: 11,
            portrait: images['goat_demon_portrait'],
            greetings: ['More ingredients for my ritual..'],
            deathCries: ['Arrrghhh!'],
            skills: ['rake', 'gore_horns', 'silence', 'demon_mark', 'new_moon', 'malevolent_presence'],
            weaknesses: ['ice', 'psionic'],
            minions: ['horned_pet', 'horned_pet'],
            drops: [
                { item: TIER2_POTION, percentChance: 35 },
                { itemPool: TIER2_WEAPONS, percentChance: 35 },
                { itemPool: TIER2_WEAPONS, percentChance: 35 },
            ]
        },
        cyclops: {
            type: 'cyclops',
            tier: 3,
            subtype: 'brutekin',
            key: 'cyclops',
            image_names: ['cyclops'],
            monster_names: ['mog-gol', 'mog-blal', 'mog-sur'],
            lordName: 'The Blooded Scourge',
            stats: {
                hp: 140,
                atk: 11,
                def: 11,
                speed: 7,
                willpower: 3,
                str: 12,
                int: 4,
                dex: 6,
                fort: 8
            },
            level: 11,
            portrait: images['cyclops_portrait'],
            greetings: ['Zug Zug'],
            deathCries: ['Arrrghhh!'],
            skills: ['stomp', 'gore_horns', 'claw_strike'],
            weaknesses: ['ice', 'fire', 'psionic'],
            minions: ['troll', 'ogre'],
            drops: [
                { item: TIER2_POTION, percentChance: 35 },
                { itemPool: TIER2_WEAPONS, percentChance: 35 },
                { itemPool: TIER2_WEAPONS, percentChance: 35 },
            ]
        },
        // ── Level 12 ─────────────────────────────────────────────────────
        witch: {
            type: 'witch',
            tier: 3,
            subtype: 'eldritch',
            key: 'witch',
            image_names: ['witch_p1_1'],
            monster_names: ['Rhea', 'BabaYaga'],
            lordName: 'Yuuul the Ancient',
            stats: {
                hp: 360,
                atk: 13,
                def: 8,
                speed: 9, // elusive spell-caster
                willpower: 10,
                str: 4,
                int: 10,
                dex: 6,
                fort: 5
            },
            level: 12,
            portrait: images['witch_p1_1'],
            greetings: ['Thy blood is quickening'],
            deathCries: ['Mercy'],
            skills: ['greater_magic_missile', 'hex', 'shadow_curse', 'spiderweb', 'summon_spiders', 'dispell', 'demonic_whispers', 'transform'],
            weaknesses: ['arcane', 'holy'],
            minions: ['beholder_minion', 'horned_pet', 'beholder_minion'],
            drops: [
                { item: TIER3_POTION, percentChance: 35 },
                { itemPool: TIER3_ITEM, percentChance: 35 },
            ]
        },
        // mirror: {
        //     type: 'mirror',
        //     key: 'mirror',
        //     image_names: ['mirror'],
        //     monster_names: ['the mirror'],
        //     stats: {
        //         hp: 100,
        //         atk: 10,
        //         def: 8,
        //         speed: 14,
        //         willpower: 20
        //     },
        //     level: 12,
        //     portrait: images['mirror'],
        //     greetings: ['reflect on this'],
        //     deathCries: ['ahhh'],
        //     specials: ['obliterate', 'flying', 'invisibility'],
        //     attacks: ['greater_magic_missile'],
        //     weaknesses: ['arcane', 'holy'],
        //     drops: [
        //         { item: TIER2_POTION, percentChance: 35 },
        //         { itemPool: TIER2_WEAPONS, percentChance: 35 },
        //     ]
        // },
        // ── Level 14 ─────────────────────────────────────────────────────
        beholder: {
            type: 'beholder',
            tier: 3,
            subtype: 'eldritch',
            key: 'beholder',
            image_names: ['beholder'],
            monster_names: ['Nirnuceks', 'Adalak', 'Vemrindon', 'Sardaresh'],
            lordName: 'The Great Tyrant',
            stats: {
                hp: 310,
                atk: 15,
                def: 5,
                speed: 9,
                willpower: 11,
                str: 4,
                int: 12,
                dex: 6,
                fort: 4
            },
            level: 14,
            portrait: images['beholder_portrait'],
            greetings: ['Klo. Vudandi modu... hahaha'],
            deathCries: ['Urdu meklak milnaurku...'],
            skills: ['chainbolt', 'mind_swap', 'displacement_ray', 'invisibility', 'voidbite', 'greater_magic_missile'],
            weaknesses: ['arcane', 'holy'],
            minions: ['beholder_minion', 'beholder_minion', 'beholder_minion'],
            drops: [
                { item: TIER2_POTION, percentChance: 60 },
                { itemPool: TIER2_MAGICAL, percentChance: 35 },
                { itemPool: TIER3_MAGICAL, percentChance: 15 },
                { itemPool: TIER2_WEAPONS, percentChance: 35 },
            ]
        },
        // precipice_guardian: {
        //     type: 'precipice_guardian',
        //     key: 'precipice_guardian',
        //     image_names: ['precipice_guardian'],
        //     monster_names: ['Samra', 'Julu'],
        //     stats: {
        //         hp: 190,
        //         atk: 12,
        //         def: 15,
        //         speed: 9,
        //         willpower: 0
        //     },
        //     level: 14,
        //     portrait: images['beholder_portrait'],
        //     greetings: ['Vukudaj kolo gurdu'],
        //     deathCries: ['Urdu meklak milnaurku...'],
        //     specials: ['obliterate', 'flying', 'invisibility'],
        //     attacks: ['void_lance', 'greater_magic_missile'],
        //     weaknesses: ['arcane', 'holy'],
        //     minions: ['golem'],
        //     drops: [
        //         { item: TIER2_POTION, percentChance: 35 },
        //         { itemPool: TIER2_WEAPONS, percentChance: 35 },
        //     ]
        // },
        // ── Level 15 ─────────────────────────────────────────────────────
        kabuki_demon: {
            type: 'kabuki_demon',
            tier: 3,
            subtype: 'demon',
            key: 'kabuki_demon',
            image_names: ['kabuki_demon_portrait'],
            monster_names: ['Ikiro', 'Jimbu'],
            lordName: 'Lord Sargas',
            stats: {
                hp: 440,
                atk: 13,
                def: 3,
                speed: 11, // swift leader demon
                willpower: 8,
                str: 5,
                int: 8,
                dex: 8,
                fort: 4
            },
            level: 15,
            portrait: images['kabuki_demon_portrait'],
            greetings: ['Assaaa'],
            deathCries: ['No! Impossible!'],
            skills: ['claw_strike', 'invisibility', 'greater_magic_missile', 'rake', 'voidbite'],
            passives: ['flying'],
            weaknesses: ['arcane', 'holy'],
            minions: ['kabuki_demon_minion', 'kabuki_demon_minion'],
            drops: [
                { item: TIER2_POTION, percentChance: 35 },
                { itemPool: TIER3_ITEM, percentChance: 35 },
            ]
        },
        qlippoth: {
            type: 'qlippoth',
            tier: 3,
            subtype: 'eldritch',
            key: 'qlippoth',
            image_names: ['qlippoth'],
            monster_names: ['Whisperer', 'Gloom'],
            lordName: 'Oblivion',
            stats: {
                hp: 220,
                atk: 8,
                def: 8,
                speed: 10,
                willpower: 4,
                str: 3,
                int: 7,
                dex: 6,
                fort: 4
            },
            level: 6,
            portrait: images['qlippoth'],
            greetings: ['*chilling whispers*', 'the shadows consume you'],
            deathCries: ['*shrieks and fades*'],
            skills: ['undead_grasp', 'despair', 'induce_fear'],
            weaknesses: ['fire', 'holy'],
            minions: ['shade'],
            drops: [
                { item: TIER1_POTION, percentChance: 35 },
                { itemPool: TIER1_ITEM, percentChance: 35 },
            ]
        },
        // ── Level 19 ─────────────────────────────────────────────────────
        djinn: {
            type: 'djinn',
            tier: 3,
            subtype: 'eldritch',
            key: 'djinn',
            image_names: ['djinn'],
            monster_names: ['Murmeros', 'Ixcalot', 'il Hagan'],
            lordName: 'Malice the Eternal',
            stats: {
                hp: 375,
                atk: 10,
                def: 11,
                speed: 10, // elemental mastery enhances evasion
                willpower: 10,
                str: 5,
                int: 11,
                dex: 7,
                fort: 7
            },
            level: 19,
            portrait: images['djinn_portrait'],
            greetings: ['your fate leads you here, now it will all end'],
            deathCries: ['it seems your fate has other plans'],
            skills: ['betrayal', 'arcane_barrier', 'bind', 'death_missile', 'rift', 'rake'],
            weaknesses: ['arcane'],
            minions: ['troll', 'troll'],
            drops: [
                { item: TIER2_POTION, percentChance: 35 },
                { itemPool: TIER3_MAGICAL, percentChance: 45 },
            ]
        },
        precipice_guardian: {
            type: 'precipice_guardian',
            tier: 3,
            subtype: 'construct',
            key: 'precipice_guardian',
            image_names: ['precipice_guardian'],
            monster_names: ['rulmak', 'kulnar'],
            lordName: 'The Iron Guard',
            stats: {
                hp: 370,
                atk: 13,
                def: 3,
                speed: 7,
                willpower: 8,
                str: 7,
                int: 8,
                dex: 5,
                fort: 5
            },
            level: 17,
            minions: ['ogre'],
            portrait: images['precipice_guardian_portrait'],
            greetings: ['go no further'], deathCries: ['then I must perish'], skills: ['rake', 'madness', 'magic_missile'], weaknesses: [], drops: []
        },
        sphinx: {
            type: 'sphinx',
            tier: 4,
            subtype: 'eldritch',
            key: 'sphinx',
            image_names: ['sphinx'],
            monster_names: ['Nunufet', 'Ipalot', 'Vizieros'],
            lordName: 'Delphon the Indisputable',
            stats: {
                hp: 365,
                atk: 13,
                def: 13,
                speed: 7, // large creature, deliberate movements
                willpower: 6,
                wits: 18,  // used for willpower checks in Begin the Trials
                str: 8,
                int: 10,
                dex: 5,
                fort: 10
            },
            level: 29,
            // portrait: images[this.pickRandom(['sphinx_portrait', 'sphinx_portrait2'])],
            portrait: images['sphinx_portrait2'],
            greetings: ['be thee worthy?'],
            deathCries: ['you may pass'],
            skills: ['claw_strike', 'induce_madness', 'third_eye', 'polymorph', 'hex', 'begin_the_trials', 'magic_missile'],
            weaknesses: ['arcane'],
            minions: ['djinn'],
            drops: [
                { item: TIER3_POTION, percentChance: 35 },
                { itemPool: TIER3_MAGICAL, percentChance: 35 },
                { itemPool: TIER4_ITEM, percentChance: 15 },
            ]
        },

        // ── Level 30 ─────────────────────────────────────────────────────
        dragon: {
            type: 'dragon',
            tier: 4,
            subtype: 'serpentine',
            key: 'dragon',
            image_names: ['dragon'],
            monster_names: ['Theraxes', 'Daedron', 'Kykerod'],
            lordName: 'Melkor the Great',
            stats: {
                hp: 485,
                atk: 20,
                def: 17,
                speed: 6, // immense, slow but near-immune to damage
                willpower: 10,
                str: 12,
                int: 6,
                dex: 4,
                fort: 14
            },
            level: 30,
            portrait: 'wyvern_portrait',
            greetings: ['*roar*'],
            deathCries: ['*scream*'],
            skills: ['claw_strike', 'bite', 'dragon_whirlwind', 'bombard', 'dragon_dispell', 'lay_eggs', 'blue_dragon_breath'],
            weaknesses: ['psionic'],
            drops: [
                { item: TIER4_POTION, percentChance: 35 },
                { itemPool: TIER4_ITEM, percentChance: 35 },
                { itemPool: TIER4_ITEM, percentChance: 20 },
            ]
        },
        dragon_egg: {
            type: 'dragon_egg',
            isMinion: true,
            isSummoned: true,
            tier: 1,
            subtype: 'construct',
            key: 'dragon_egg',
            image_names: ['egg_1'],
            monster_names: ['Dragon Egg'],
            stats: {
                hp: 50,
                atk: 0,
                def: 5,
                speed: 0,
                willpower: 0,
                str: 1,
                int: 0,
                dex: 0,
                fort: 10
            },
            level: 1,
            portrait: images['egg_1'],
            greetings: [],
            deathCries: ['*splat*'],
            skills: [],
            weaknesses: ['fire'],
            drops: []
        },
        hagigah: {
            type: 'hagigah',
            tier: 4,
            subtype: 'demon',
            key: 'hagigah',
            image_names: ['hagigah'],
            monster_names: [],
            stats: {
                hp: 450,
                atk: 20,
                def: 17,
                speed: 6, // immense, slow but near-immune to damage
                willpower: 0,
                str: 12,
                int: 6,
                dex: 4,
                fort: 14
            },
            level: 25,
            portrait: images['Hagigah'],
            greetings: ['despair, puny ones.', 'It is finished.'],
            deathCries: ['Noooooo!'],
            skills: ['stomp', 'invoke_darkness', 'summon_skulls', 'destitution', 'hagigah_spineskin', 'demon_mark', 'rake'],
            weaknesses: ['holy'],
            drops: []
        },
        hashmallim: {
            type: 'hashmallim',
            tier: 4,
            subtype: 'eldritch',
            key: 'hashmallim',
            image_names: ['hashmallim'],
            monster_names: [],
            stats: {
                hp: 510,
                atk: 20,
                def: 17,
                speed: 6, // immense, slow but near-immune to damage
                willpower: 20,
                str: 12,
                int: 6,
                dex: 4,
                fort: 14
            },
            level: 25,
            portrait: images['Hashmallim'],
            greetings: ['Another fly in the ointment...', 'I tire of these little gnats.'],
            deathCries: ['Impossible...'],
            skills: ['gore', 'rake', 'dominate', 'madness', 'overload', 'meteors', 'entropic_kindred'],
            weaknesses: ['holy', 'fire'],
            drops: []
        },
    }
    let count = 50000;
    for (let key in this.monsters) {
        let m = this.monsters[key]
        m.id = count;
        count++

        // Extract plain string URL if it is an object with default
        if (m.portrait && typeof m.portrait === 'object') {
            m.portrait = m.portrait.default || m.portrait;
        }

        // Dynamically resolve portrait string keys to their asset references
        if (typeof m.portrait === 'string' && !m.portrait.includes('/') && !m.portrait.includes('data:')) {
            const mapped = images[m.portrait] || images[m.portrait.replace('_portrait', '')] || images[key] || images[key + '_portrait'];
            if (mapped) {
                m.portrait = mapped.default || mapped;
            } else if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
                console.warn(`[WARN][MonsterManager] Could not resolve portrait for monster "${key}" with key "${m.portrait}"`);
            }
        }

    }

    this.getMonster = (monsterString) => {
        let match = null;
        match = this.monsters[monsterString];

        return match ? JSON.parse(JSON.stringify(match)) : null;
    }
    this.getRandomMonster = () => {
        // return this.monsters['sphinx']
        const available = Object.values(this.monsters).filter(e => !e.isMinion && !e.isSummoned);
        return this.pickRandom(available);
    }
    this.getRandomMonsterByTier = (tier) => {
        let availableMonsters = Object.values(this.monsters).filter(e => e.tier === tier && !e.isMinion && !e.isSummoned);
        if (availableMonsters.length > 0) {
            return JSON.parse(JSON.stringify(this.pickRandom(availableMonsters)));
        }
        return this.getRandomMonster();
    }



    // this.initializeCrew = (crew) => {
    //     crew.forEach(member=> { 
    //         if(this.memberTypes.includes(member.image)){
    //             this.crew.push({image: member.image, inventory: member.inventory, data: member.data})
    //         }
    //     })
    // }
    // this.addCrewMember = (member) => {
    //     this.crew.push({image: member.image, inventory: member.inventory, data: member.data})
    // }
}