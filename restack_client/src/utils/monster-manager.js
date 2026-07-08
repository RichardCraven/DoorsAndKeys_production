import * as images from '../utils/images'
import { inventoryManager } from '../utils/inventory-manager'

// ── Tier weapon pools (from inventoryManager) ────────────────────────────────
const TIER1_WEAPONS = inventoryManager.TIER1_WEAPONS;
const TIER2_WEAPONS = inventoryManager.TIER2_WEAPONS;
const TIER3_WEAPONS = inventoryManager.TIER3_WEAPONS;
const TIER4_WEAPONS = inventoryManager.TIER4_WEAPONS;

// ── Tier magical pools (from inventoryManager) ──────────────────────────────
const TIER1_MAGICAL = inventoryManager.TIER1_MAGICAL;
const TIER2_MAGICAL = inventoryManager.TIER2_MAGICAL;
const TIER3_MAGICAL = inventoryManager.TIER3_MAGICAL;
const TIER4_MAGICAL = inventoryManager.TIER4_MAGICAL;

// ── Tier armor pools (from inventoryManager) ───────────────────────────────
const TIER1_ARMOR = inventoryManager.TIER1_ARMOR;
const TIER2_ARMOR = inventoryManager.TIER2_ARMOR;
const TIER3_ARMOR = inventoryManager.TIER3_ARMOR;
const TIER4_ARMOR = inventoryManager.TIER4_ARMOR;

// Mixed item pools (weapons, armor, magical) per tier
const TIER1_ITEM = inventoryManager.TIER1_ITEM;
const TIER2_ITEM = inventoryManager.TIER2_ITEM;
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
            stats: {
                hp: 38,
                atk: 3,
                def: 5,
                speed: 11, // nimble, hard to pin down
                willpower: 0
            },
            level: 2,
            portrait: images['goblin_portrait'],
            greetings: ['bones for my master!'],
            deathCries: ['nooooooo'],
            specials: ['sticky_fingers'],
            attacks: ['claws', 'bite'],
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
            stats: {
                hp: 35,
                atk: 5,
                def: 7,
                speed: 7, // shambling undead
                willpower: 0
            },
            level: 3,
            portrait: images['skeleton_portrait'],
            greetings: ['*screech*'],
            deathCries: ['*screech*'],
            specials: [],
            passives: ['reassemble'],
            attacks: ['claws', 'claws', 'claws'],
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
            tier: 1,
            subtype: 'demon',
            key: 'kabuki_demon_minion',
            image_names: ['kabuki_demon_minion'],
            monster_names: ['Ikiro', 'Jimbu'],
            stats: {
                hp: 50,
                atk: 5,
                def: 3,
                speed: 10, // agile demon
                willpower: 0
            },
            level: 4,
            portrait: images['kabuki_demon_minion_portrait'],
            greetings: ['Assaaa'],
            deathCries: ['No! Impossible!'],
            specials: ['obliterate', 'invisibility'],
            passives: ['flying'],
            attacks: ['void_lance', 'major_magic_missile'],
            weaknesses: ['arcane', 'holy-aura'],
            drops: [
                { item: TIER1_POTION, percentChance: 35 },
                { itemPool: TIER1_WEAPONS, percentChance: 35 },
            ]
        },
        // ── Level 5 (minion) ─────────────────────────────────────────────
        beholder_minion: {
            type: 'beholder_minion',
            tier: 1,
            subtype: 'eldritch',
            key: 'beholder_minion',
            image_names: ['beholder_minion'],
            monster_names: ['Nirnuceks', 'Adalak', 'Vemrindon'],
            stats: {
                hp: 60,
                atk: 7,
                def: 2,
                speed: 8, // floating eyeball
                willpower: 0
            },
            level: 5,
            portrait: images['beholder_minion_portrait'],
            portraitFilter: 'sepia(0.4) hue-rotate(320deg)',
            greetings: ['Vukdaj kolo gurdu'],
            deathCries: ['Urdu meklak milnaurku...'],
            specials: ['bifurcate', 'minor_magic_missile'],
            passives: ['flying'],
            attacks: ['claws'],
            weaknesses: ['arcane', 'holy-aura'],
            drops: [
                { item: TIER1_POTION, percentChance: 35 },
                { itemPool: TIER1_WEAPONS, percentChance: 35 },
            ]
        },
        // ── Level 6 ──────────────────────────────────────────────────────
        troll: {
            type: 'troll',
            tier: 2,
            subtype: 'brutekin',
            key: 'troll',
            image_names: ['troll'],
            monster_names: ['Mundzungu', 'Wugum'],
            stats: {
                hp: 178,
                atk: 10,
                def: 13,
                speed: 5, // big lumbering brute
                willpower: 0
            },
            level: 6,
            portrait: images['troll_portrait'],
            greetings: ['you stink of fresh meat'],
            deathCries: ['*gurgle*'],
            specials: ['regeneration'],
            attacks: ['crush', 'tackle', 'bite'],
            weaknesses: ['fire'],
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
            stats: {
                hp: 250,
                atk: 10,
                def: 13,
                speed: 4, // slow ancient undead — easy to hit but very tanky
                willpower: 0
            },
            level: 6,
            portrait: images['mummy_portrait'],
            greetings: ['time is unravelling'],
            deathCries: ['at last'],
            specials: ['induce_fear'],
            attacks: ['grasp', 'energy_drain', 'claws'],
            weaknesses: ['arcane', 'fire', 'electricity'],
            minions: ['skeleton', 'skeleton'],
            drops: [
                { item: TIER1_POTION, percentChance: 35 },
                { itemPool: TIER1_ITEM, percentChance: 50 },
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
            stats: {
                hp: 282,
                atk: 9,
                def: 8,
                speed: 12, // ghostly, nearly untouchable
                willpower: 0
            },
            level: 8,
            portrait: images['wraith_portrait'],
            greetings: ['*hissssss*', 'come to the silence'],
            deathCries: ['*screams*'],
            specials: ['banshee wail'],
            attacks: ['grasp', 'energy_drain'],
            weaknesses: ['holy', 'psionic'],
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
            stats: {
                hp: 172,
                atk: 9,
                def: 11,
                speed: 5, // massive but slow
                willpower: 0
            },
            level: 8,
            portrait: images['ogre_portrait'],
            greetings: ['Guarkog buzu', 'Mogab burdu'],
            deathCries: ['*gurgle*'],
            specials: ['berserk'],
            attacks: ['crush', 'bite', 'tackle'],
            weaknesses: ['fire', 'psionic'],
            drops: [
                { item: TIER1_POTION, percentChance: 35 },
                { itemPool: TIER1_WEAPONS, percentChance: 45 },
            ]
        },
        // ── Level 9 ──────────────────────────────────────────────────────
        gorgon: {
            type: 'gorgon',
            tier: 2,
            subtype: 'serpentine',
            key: 'gorgon',
            image_names: ['gorgon'],
            monster_names: ['Lithios', 'Merkaba', 'Axolus'],
            stats: {
                hp: 162,
                atk: 8,
                def: 9,
                speed: 8, // serpentine, medium agility
                willpower: 0
            },
            level: 9,
            portrait: images['gorgon_portrait'],
            greetings: ['Ssssurrenderrrr', 'Be ssstill'],
            deathCries: ['Arrrghhh!'],
            specials: ['petrify'],
            attacks: ['snake_strike', 'bite'],
            weaknesses: ['ice', 'psionic'],
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
            monster_names: ['Vukodlak', 'Morias', 'Roterach'],
            stats: {
                hp: 194,
                atk: 9,
                def: 12,
                speed: 13, // supernaturally fast
                willpower: 0
            },
            level: 10,
            portrait: images['vampire_portrait'],
            greetings: ['My hunger sees you'],
            deathCries: ['Peace at last...'],
            specials: ['obliterate', 'invisibility'],
            passives: ['flying'],
            attacks: ['claws', 'bite'],
            weaknesses: ['arcane', 'holy-aura'],
            minions: ['goblin', 'goblin'],
            drops: [
                { item: TIER2_POTION, percentChance: 35 },
                { itemPool: TIER2_WEAPONS, percentChance: 45 },
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
            stats: {
                hp: 92,
                atk: 11,
                def: 11,
                speed: 10, // demonic quickness
                willpower: 0
            },
            level: 11,
            portrait: images['goat_demon_portrait'],
            greetings: ['More ingredients for my ritual..'],
            deathCries: ['Arrrghhh!'],
            specials: ['petrify'],
            attacks: ['snake_strike', 'bite'],
            weaknesses: ['ice', 'psionic'],
            minions: ['goblin', 'goblin'],
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
            stats: {
                hp: 160,
                atk: 13,
                def: 8,
                speed: 9, // elusive spell-caster
                willpower: 0
            },
            level: 12,
            portrait: images['witch_p1_1'],
            greetings: ['Thy blood is quickening'],
            deathCries: ['Mercy'],
            specials: ['obliterate', 'invisibility'],
            attacks: ['void_lance', 'major_magic_missile'],
            weaknesses: ['arcane', 'holy-aura'],
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
        //     attacks: ['major_magic_missile'],
        //     weaknesses: ['arcane', 'holy-aura'],
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
            stats: {
                hp: 110,
                atk: 15,
                def: 5,
                speed: 9, // drifts and repositions
                willpower: 0
            },
            level: 14,
            portrait: images['beholder_portrait'],
            greetings: ['Vukudaj kolo gurdu'],
            deathCries: ['Urdu meklak milnaurku...'],
            specials: ['obliterate', 'energy_burn', 'petrify', 'invisibility', 'major_magic_missile'],
            attacks: ['void_lance'],
            weaknesses: ['arcane', 'holy-aura'],
            minions: ['beholder_minion', 'beholder_minion'],
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
        //     attacks: ['void_lance', 'major_magic_missile'],
        //     weaknesses: ['arcane', 'holy-aura'],
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
            stats: {
                hp: 140,
                atk: 13,
                def: 3,
                speed: 11, // swift leader demon
                willpower: 0
            },
            level: 15,
            portrait: images['kabuki_demon_portrait'],
            greetings: ['Assaaa'],
            deathCries: ['No! Impossible!'],
            specials: ['obliterate', 'invisibility', 'major_magic_missile'],
            passives: ['flying'],
            attacks: ['void_lance'],
            weaknesses: ['arcane', 'holy-aura'],
            minions: ['kabuki_demon_minion', 'kabuki_demon_minion'],
            drops: [
                { item: TIER2_POTION, percentChance: 35 },
                { itemPool: TIER3_ITEM, percentChance: 35 },
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
            stats: {
                hp: 175,
                atk: 10,
                def: 11,
                speed: 10, // elemental mastery enhances evasion
                willpower: 0
            },
            level: 19,
            portrait: images['djinn_portrait'],
            greetings: ['your fate leads you here, now it will all end'],
            deathCries: ['it seems your fate has other plans'],
            specials: ['duplicate', 'meditate'],
            attacks: ['claws', 'void_lance', 'fire_breath'],
            weaknesses: ['arcane'],
            drops: [
                { item: TIER2_POTION, percentChance: 35 },
                { itemPool: TIER3_MAGICAL, percentChance: 45 },
            ]
        },
        // ── Level 29 ─────────────────────────────────────────────────────
        sphinx: {
            type: 'sphinx',
            tier: 4,
            subtype: 'eldritch',
            key: 'sphinx',
            image_names: ['sphinx'],
            monster_names: ['Nunufet', 'Ipalot', 'Vizieros'],
            stats: {
                hp: 325,
                atk: 13,
                // atk: 2,
                def: 13,
                speed: 7, // large creature, deliberate movements
                willpower: 0
            },
            level: 29,
            // portrait: images[this.pickRandom(['sphinx_portrait', 'sphinx_portrait2'])],
            portrait: images['sphinx_portrait2'],
            greetings: ['be thee worthy?'],
            deathCries: ['you may pass'],
            specials: ['possess', 'tesseract'],
            // attacks: ['claws', 'claws', 'claws'],
            attacks: ['claws', 'claws', 'induce_madness', 'lightning'],
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
            stats: {
                hp: 325,
                atk: 20,
                def: 17,
                speed: 6, // immense, slow but near-immune to damage
                willpower: 0
            },
            level: 30,
            portrait: images[this.pickRandom(['wyvern_portrait', 'wyvern_portrait2'])],
            greetings: ['*roar*'],
            deathCries: ['*scream*'],
            specials: ['firestorm'],
            attacks: ['claws', 'bite', 'fire_breath'],
            weaknesses: ['psionic'],
            drops: [
                { item: TIER4_POTION, percentChance: 35 },
                { itemPool: TIER4_ITEM, percentChance: 35 },
                { itemPool: TIER4_ITEM, percentChance: 20 },
            ]
        },
    }
    let count = 100;
    for (let key in this.monsters) {
        let m = this.monsters[key]
        m.id = count;
        count++
    }

    this.getMonster = (monsterString) => {
        // console.log('get monster:', monsterString);
        let match = null;
        // console.log('this.monsters', this.monsters);
        match = this.monsters[monsterString];
        return match ? JSON.parse(JSON.stringify(match)) : null;
    }
    this.getRandomMonster = () => {
        // return this.monsters['sphinx']
        return this.pickRandom(Object.values(this.monsters))
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