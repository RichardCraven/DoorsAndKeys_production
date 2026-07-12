import React from 'react';

import { INTERVALS, MONSTER_RESPAWN_MINUTES, ITEM_RESPAWN_MINUTES } from '../utils/shared-constants';
import '../styles/dungeon-board.scss'
import Tile from '../components/tile'
import MonsterBattle from './sub-views/MonsterBattle';
import ShrineScreen from './sub-views/ShrineScreen';

import LevelUpScreen from '../components/LevelUpScreen';
import '../styles/level-up-screen.scss';
import { CombatManagerRedux } from '../utils/combat-manager-redux';
import CardDuel from './sub-views/CardDuel';
import CardForge from './sub-views/CardForge';
import TowerSiege from './sub-views/TowerSiege';
import { shardDropChance } from '../utils/card-manager';
// import ExpositionPane from './sub-views/ExpositionPane';
import {
    loadAllDungeonsRequest,
    loadDungeonRequest,
    updateDungeonRequest,
    updateUserRequest,
    addDungeonRequest,
    deleteDungeonRequest
  } from '../utils/api-handler';
import {storeMeta, getMeta, getUserId, getUserName, applyResolvePenalty} from '../utils/session-handler';
import { keyCleanup, itemCleanup, resolveItemPools, resolveMonsterPools } from '../utils/cache-cleanup';
import * as CampManager from '../utils/camp-manager';
import Typewriter from '../utils/typewriter';
import { getNextNarrativePayload } from '../utils/narrative-manager';
import { cilCaretRight, cilCaretLeft, cilMenu} from '@coreui/icons';
import  CIcon  from '@coreui/icons-react';

import { CButton, CFormSelect, CFormInput, CModal, CModalHeader, CModalTitle, CModalBody} from '@coreui/react';
import * as images from '../utils/images'
import { RITUALS, GLYPHS, GLYPH_SPELL_SLOT_COST, computeGlyphPrepTime, BATTLE_TACTICS, INNER_DISCIPLINES, DISCIPLINE_CATEGORIES } from '../utils/spells-table'
import { RECIPES } from '../utils/spells-table'
import skillsMatrix from '../utils/skills-matrix'
import REAGENTS, { REAGENT_KEYS } from '../utils/reagents'
import POTIONS from '../utils/potions'
import { RECIPES as POTION_RECIPES, matchRecipe } from '../utils/recipes'
import BREW_INGREDIENTS, { BREW_INGREDIENT_KEYS } from '../utils/brew-ingredients'
import BREWS from '../utils/brews'
import { BREW_RECIPES, matchBrewRecipe } from '../utils/brew-recipes'
import '../styles/inventory-modal.scss'
import '../styles/quests-modal.scss'
import '../styles/camp-modal.scss'
import '../styles/codex.scss'
import SkillTree from '../components/SkillTree';
import CodexModal from '../components/CodexModal';
import AssemblyAnimation from '../components/assembly-animation';
import '../styles/narrative-overlay.scss'
import MapRedux from '../components/MapRedux';
import '../styles/map-redux.scss';
import { FLAGS } from '../flags';

const runeCtx = typeof require.context === 'function' ? require.context('../assets/icons/runes', true, /\.png$/) : null;
const archaicPieces = runeCtx ? {
    'top left': runeCtx('./archaic/top left.png').default || runeCtx('./archaic/top left.png'),
    'top right': runeCtx('./archaic/top right.png').default || runeCtx('./archaic/top right.png'),
    'bottom left': runeCtx('./archaic/bottom left.png').default || runeCtx('./archaic/bottom left.png'),
    'bottom right': runeCtx('./archaic/bottom right.png').default || runeCtx('./archaic/bottom right.png'),
    'top center': runeCtx('./archaic/top center.png').default || runeCtx('./archaic/top center.png')
} : {};

const SLOT_INFO = {
    'chest': { name: 'Chest Slot', desc: 'Equip body armor or tabards here.' },
    'right': { name: 'Right Hand Slot', desc: 'Equip weapons, wands, shields, or off-hand items.' },
    'left': { name: 'Left Hand Slot', desc: 'Equip weapons, wands, shields, or off-hand items.' },
    'head': { name: 'Head Slot', desc: 'Equip helmets, masks, or hats here.' },
    'boots': { name: 'Boots Slot', desc: 'Equip boots here.' },
    'ancillary-left': { name: 'Ancillary Slot (Left)', desc: 'Equip rings, amulets, relics, or accessories here.' },
    'ancillary-right': { name: 'Ancillary Slot (Right)', desc: 'Equip rings, amulets, relics, or accessories here.' },
    'pet': { name: 'Pet Slot', desc: 'Equip companion pets here to support you in battle.' }
};

// ── Imprint Tattoo constants ─────────────────────────────────────────────────
const TATTOO_IMPRINT_DURATIONS_MS = [
    30 * 60 * 1000,            // 1st:  30 min
    3 * 60 * 60 * 1000,        // 2nd:  3 hours
    2 * 24 * 60 * 60 * 1000,   // 3rd:  2 days
    5 * 24 * 60 * 60 * 1000,   // 4th:  5 days
    8 * 24 * 60 * 60 * 1000,   // 5th:  8 days
    12 * 24 * 60 * 60 * 1000,  // 6th: 12 days
    15 * 24 * 60 * 60 * 1000,  // 7th: 15 days
    20 * 24 * 60 * 60 * 1000,  // 8th: 20 days
];

const TATTOO_SLOT_LABELS = {
    head:       'Head',
    torso:      'Torso',
    left_arm:   'Left Arm',
    right_arm:  'Right Arm',
    left_hand:  'Left Hand',
    right_hand: 'Right Hand',
    left_leg:   'Left Leg',
    right_leg:  'Right Leg',
};

const TATTOO_DESIGNS = {
    fire_bird: {
        name: 'Fire Bird',
        desc: '+3 STR — A blazing phoenix rising across the skin.',
        flavor: 'The bird reborn from ash — as you will be.',
        effect: { str: 3 },
        iconKey: 'tattoo_placeholder',
        color: '#c0392b',
    },
    silver_serpent: {
        name: 'Silver Serpent',
        desc: '+2 DEX, +1 FORT — A coiling serpent of cold silver.',
        flavor: 'The serpent waits, and strikes faster than thought.',
        effect: { dex: 2, fort: 1 },
        iconKey: 'tattoo_placeholder',
        color: '#7f8c8d',
    },
    tribal_hand: {
        name: 'Tribal Hand',
        desc: '+1 STR, +5 Base HP — Ancient markings of ancestral fury.',
        flavor: 'Ten thousand warriors lend their strength.',
        effect: { str: 1, baseHp: 5 },
        iconKey: 'tattoo_placeholder',
        color: '#8B6914',
    },
};

const NarrativeOverlay = ({ sequence, onClose }) => {
    if (!sequence) return null;

    return (
        <div className="narrative-overlay">
            <div className="narrative-overlay__panel">
                <button className="narrative-overlay__close" onClick={onClose} aria-label="Close narrative">
                    ×
                </button>
                <div className="narrative-overlay__figure">
                    <div
                        className="narrative-overlay__image"
                        style={{ backgroundImage: `url(${sequence.narratorImage})` }}
                    />
                </div>
                <div className="narrative-overlay__content">
                    <div className="narrative-overlay__eyebrow">Narrative Sequence</div>
                    <div className="narrative-overlay__name">{sequence.narratorName}</div>
                    <div className="narrative-overlay__text" key={sequence.id}>
                        <Typewriter text={sequence.text} delay={28} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// helper: convert 3/6-digit hex to rgba string
function hexToRgba(hex, alpha = 1){
    if (!hex) return `rgba(128, 128, 128, ${alpha})`; // default gray if no color
    let h = hex.replace('#','').trim();
    if(h.length === 3){
        h = h.split('').map(c=>c+c).join('');
    }
    if(h.length !== 6) return hex;
    const r = parseInt(h.substring(0,2),16);
    const g = parseInt(h.substring(2,4),16);
    const b = parseInt(h.substring(4,6),16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Small subcomponent to render modal header + body based on modalType
const ModalInner = ({ modalType, updates, crew, tileSize, handleMemberClickRitual, handleCrewTileHover, setMemberRitualOptions, onLearnRitual, inventoryManager, saveUserData, onForceUpdate, onClose }) => {
    const [merchantStock, setMerchantStock] = React.useState([]);
    const [feedbackMsg, setFeedbackMsg] = React.useState('');
    const [feedbackColor, setFeedbackColor] = React.useState('#fff');
    const [showContent, setShowContent] = React.useState(false);
    const [showAssembly, setShowAssembly] = React.useState(false);
    const [isAssembled, setIsAssembled] = React.useState(false);

    React.useEffect(() => {
        if (modalType === 'Merchant' || modalType === 'Alchemist') {
            setShowContent(false);
            const timer = setTimeout(() => {
                setShowContent(true);
            }, 1300);
            return () => clearTimeout(timer);
        } else {
            setShowContent(true);
        }
    }, [modalType]);

    React.useEffect(() => {
        if (modalType === 'Merchant' && inventoryManager) {
            const stock = [];
            stock.push({ ...inventoryManager.allItems['minor_health_potion'], price: 20 });
            stock.push({ ...inventoryManager.allItems['major_health_potion'], price: 50 });
            
            const weaponKeys = Object.keys(inventoryManager.weapons || {});
            for (let i = 0; i < 2; i++) {
                const rKey = weaponKeys[Math.floor(Math.random() * weaponKeys.length)];
                const item = inventoryManager.allItems[rKey];
                if (item) {
                    stock.push({ ...item, _im_key: rKey, price: (item.tier === 2 ? 150 : item.tier === 3 ? 350 : 50) });
                }
            }
            
            const armorKeys = Object.keys(inventoryManager.armor || {});
            const rArmorKey = armorKeys[Math.floor(Math.random() * armorKeys.length)];
            const armorItem = inventoryManager.allItems[rArmorKey];
            if (armorItem) {
                stock.push({ ...armorItem, _im_key: rArmorKey, price: (armorItem.tier === 2 ? 120 : armorItem.tier === 3 ? 280 : 45) });
            }

            const magicalKeys = Object.keys(inventoryManager.magical || {});
            const rMagKey = magicalKeys[Math.floor(Math.random() * magicalKeys.length)];
            const magItem = inventoryManager.allItems[rMagKey];
            if (magItem) {
                stock.push({ ...magItem, _im_key: rMagKey, price: (magItem.tier === 2 ? 160 : magItem.tier === 3 ? 320 : 60) });
            }
            
            stock.push({ name: 'shimmering dust', icon: 'shimmering_dust', type: 'currency', currencyType: 'shimmering_dust', price: 10, description: 'Magical dust used for brewing potions.' });
            
            setMerchantStock(stock);
        }
    }, [modalType, inventoryManager]);

    const getItemSellPrice = (item) => {
        if (item.type === 'consumable') {
            if (item.name.includes('minor')) return 10;
            if (item.name.includes('major')) return 25;
            if (item.name.includes('grand')) return 60;
            if (item.name.includes('supreme')) return 125;
            return 10;
        }
        const tier = item.tier || 1;
        if (tier === 1) return 25;
        if (tier === 2) return 75;
        if (tier === 3) return 175;
        if (tier === 4) return 400;
        return 30;
    };

    const handleBuyItem = (item) => {
        if (inventoryManager.gold < item.price) {
            setFeedbackMsg('Not enough gold!');
            setFeedbackColor('#ff4d4d');
            return;
        }
        inventoryManager.gold -= item.price;
        if (item.type === 'currency') {
            inventoryManager.addCurrency({ type: item.currencyType, amount: 1 });
        } else {
            const { price, ...cleanItem } = item;
            inventoryManager.addItem(cleanItem);
        }
        setFeedbackMsg(`Purchased ${item.name}!`);
        setFeedbackColor('#2ecc71');
        if (saveUserData) saveUserData().catch(() => {});
        if (onForceUpdate) onForceUpdate();
    };

    const handleSellItem = (item, invIndex) => {
        const sellPrice = getItemSellPrice(item);
        inventoryManager.removeItemByIndex(invIndex);
        inventoryManager.gold += sellPrice;
        setFeedbackMsg(`Sold ${item.name} for ${sellPrice} gold!`);
        setFeedbackColor('#2ecc71');
        if (saveUserData) saveUserData().catch(() => {});
        if (onForceUpdate) onForceUpdate();
    };

    const handleBrewPotion = (potionKey, goldCost, dustCost) => {
        if (inventoryManager.gold < goldCost) {
            setFeedbackMsg('Not enough gold!');
            setFeedbackColor('#ff4d4d');
            return;
        }
        if (inventoryManager.shimmering_dust < dustCost) {
            setFeedbackMsg('Not enough Shimmering Dust!');
            setFeedbackColor('#ff4d4d');
            return;
        }
        inventoryManager.gold -= goldCost;
        inventoryManager.shimmering_dust -= dustCost;
        const item = inventoryManager.allItems[potionKey];
        if (item) {
            inventoryManager.addItem({ ...item });
        }
        setFeedbackMsg(`Successfully brewed ${item?.name || 'potion'}!`);
        setFeedbackColor('#2ecc71');
        if (saveUserData) saveUserData().catch(() => {});
        if (onForceUpdate) onForceUpdate();
    };

    const hasItem = (key) => {
        return inventoryManager.inventory.some(item =>
            item &&
            item.equippedBy == null &&
            (item._im_key === key ||
                (item.name || '').replaceAll(' ', '_').toLowerCase() === key.toLowerCase() ||
                (item.name || '').toLowerCase() === key.toLowerCase())
        );
    };

    const handleCraftBanner = (recipeKey, ing1, ing2) => {
        if (!hasItem(ing1) || !hasItem(ing2)) {
            setFeedbackMsg('Missing required crystals!');
            setFeedbackColor('#ff4d4d');
            return;
        }
        inventoryManager.removeItemByKey(ing1);
        inventoryManager.removeItemByKey(ing2);
        const item = inventoryManager.allItems[recipeKey];
        if (item) {
            inventoryManager.addItem({ ...item });
        }
        setFeedbackMsg(`Successfully crafted ${item?.name || 'banner'}!`);
        setFeedbackColor('#2ecc71');
        if (saveUserData) saveUserData().catch(() => {});
        if (onForceUpdate) onForceUpdate();
    };

    const handleAssembleRune = () => {
        const shards = (inventoryManager.inventory || []).filter(item => item && item._im_key === 'archaic_rune_shard');
        if (shards.length < 5) {
            setFeedbackMsg('Requires 5 Archaic Shards!');
            setFeedbackColor('#ff4d4d');
            return;
        }
        for (let i = 0; i < 5; i++) {
            inventoryManager.removeItemByKey('archaic_rune_shard');
        }
        setShowAssembly(true);
        setIsAssembled(false);

        const item = inventoryManager.allItems['archaic_rune'];
        if (item) {
            inventoryManager.addItem({ ...item });
        }
        setFeedbackMsg(`Successfully assembled Archaic Rune!`);
        setFeedbackColor('#2ecc71');

        setTimeout(() => {
            setIsAssembled(true);
        }, 300);

        setTimeout(() => {
            setShowAssembly(false);
            setIsAssembled(false);
            if (saveUserData) saveUserData().catch(() => {});
            if (onForceUpdate) onForceUpdate();
        }, 2500);
    };

    const handleTradeIngredient = (action, type, goldAmount) => {
        if (action === 'buy') {
            if (inventoryManager.gold < goldAmount) {
                setFeedbackMsg('Not enough gold!');
                setFeedbackColor('#ff4d4d');
                return;
            }
            inventoryManager.gold -= goldAmount;
            inventoryManager.addCurrency({ type, amount: 1 });
            setFeedbackMsg(`Bought 1 ${type.replace('_', ' ')}!`);
        } else {
            const count = type === 'shimmering_dust' ? inventoryManager.shimmering_dust : inventoryManager.totems;
            if (count <= 0) {
                setFeedbackMsg(`No ${type.replace('_', ' ')} to sell!`);
                setFeedbackColor('#ff4d4d');
                return;
            }
            inventoryManager.addCurrency({ type, amount: -1 });
            inventoryManager.gold += goldAmount;
            setFeedbackMsg(`Sold 1 ${type.replace('_', ' ')}!`);
        }
        setFeedbackColor('#2ecc71');
        if (saveUserData) saveUserData().catch(() => {});
        if (onForceUpdate) onForceUpdate();
    };

    const handleFullHeal = () => {
        if (inventoryManager.gold < 100) {
            setFeedbackMsg('Not enough gold!');
            setFeedbackColor('#ff4d4d');
            return;
        }
        inventoryManager.gold -= 100;
        let healCount = 0;
        crew.forEach(member => {
            if (member && !member.dead) {
                const maxHp = member.stats?.hp || member.starting_hp || 10;
                if (member.hp < maxHp) {
                    member.hp = maxHp;
                    healCount++;
                }
            }
        });
        if (healCount > 0) {
            setFeedbackMsg('All living crew members restored to full health!');
            setFeedbackColor('#2ecc71');
        } else {
            setFeedbackMsg('Gold deducted, but all crew members were already healthy.');
            setFeedbackColor('#ffd700');
        }
        if (saveUserData) saveUserData().catch(() => {});
        if (onForceUpdate) onForceUpdate();
    };

    const renderItemIcon = (iconName) => {
        let src = images[iconName]?.default || images[iconName] || '';
        if (typeof src === 'object') {
            src = src.default || '';
        }
        if (!src) return <div style={{width: 32, height: 32, backgroundColor: '#333', borderRadius: 4, flexShrink: 0}} />;
        return <div style={{
            width: 32,
            height: 32,
            backgroundImage: `url("${encodeURI(String(src))}")`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            borderRadius: 4,
            flexShrink: 0
        }} />;
    };

    // Helper: format ms as "1 hour", "3 hours", "6 hours" etc.
    const formatPrepTime = (ms) => {
        const hours = ms / (1000 * 60 * 60);
        if (hours >= 1) return hours === 1 ? '1 hour' : `${hours} hours`;
        const mins = ms / (1000 * 60);
        return mins === 1 ? '1 minute' : `${Math.round(mins)} minutes`;
    };

    return (
        <CModalBody>
            {modalType === 'Updates' && (
                <div className='updates-zone'>
                    {(updates || []).map((update, i) => (
                        <div key={i}>{update.text}</div>
                    ))}
                </div>
            )}

            {modalType === 'PrepComplete' && (() => {
                const firstUpdate = (updates && updates[0]) || {};
                const actionType = firstUpdate.actionType || '';
                
                let title = "Preparation Completed";
                let emoji = "⚙️";
                let note = "The prepared upgrades and effects are now active.";

                if (actionType === 'tactics') {
                    title = "Tactic Prepared";
                    emoji = "🛡️";
                    note = "Your combat formation and battlefield tactics are now ready.";
                } else if (actionType === 'compound' || actionType === 'brew') {
                    title = "Alchemy Complete";
                    emoji = "🧪";
                    note = "Potions and compounds have been brewed and stored in your supplies.";
                } else if (actionType === 'inner_discipline') {
                    title = "Training Complete";
                    emoji = "🧘";
                    note = "Inner discipline training has completed and passive bonuses are active.";
                } else if (actionType === 'glyph') {
                    title = "Glyph Etched";
                    emoji = "🌀";
                    note = "The runic glyph is fully charged and ready to discharge in combat.";
                }

                return (
                    <div className="prep-complete-zone">
                        <div className="prep-complete-icon">
                            <span role="img" aria-label={title}>{emoji}</span>
                        </div>
                        <h3 className="prep-complete-title">{title}</h3>
                        <div className="prep-complete-card">
                            {(updates || []).map((update, i) => (
                                <p key={i} className="prep-complete-text">{update.text}</p>
                            ))}
                        </div>
                        <p className="prep-complete-note">{note}</p>
                    </div>
                );
            })()}

            {modalType === 'RitualComplete' && (
                <div className="ritual-complete-zone">
                    <div className="ritual-complete-icon"><span role="img" aria-label="sparkles">✨</span></div>
                    <h3 className="ritual-complete-title">Ritual Complete</h3>
                    {(updates || []).map((update, i) => (
                        <div key={i} className="ritual-complete-text">{update.text}</div>
                    ))}
                    <p className="ritual-complete-note">The ritual is now ready to use in combat.</p>
                </div>
            )}

            {modalType === 'FoodComplete' && (
                <div className="food-complete-zone">
                    <div className="food-complete-icon"><span role="img" aria-label="meat">🍖</span></div>
                    <h3 className="food-complete-title">Food Ready!</h3>
                    {(updates || []).map((u, i) => <div key={i} className="food-complete-text">{u.text}</div>)}
                    <p className="food-complete-note">Food has been added to your supplies.</p>
                </div>
            )}

            {modalType === 'Magic' && (
                <div className="ritual-encounter-zone">
                    <div className="ritual-encounter-header">
                        <div className="ritual-encounter-title">✦ A Nexus of Power ✦</div>
                        <div className="ritual-encounter-subtitle">
                            The air crackles with latent magic. Your wizard or sage may study the flows of power and learn a ritual.
                        </div>
                    </div>

                    {/* Magic user selector */}
                    <div className="ritual-magic-users">
                        {crew.filter(e => e.type === 'wizard' || e.type === 'sage').map((magicUser, i) => (
                            <div
                                key={i}
                                className={`ritual-magic-user-tile ${setMemberRitualOptions && setMemberRitualOptions.id === magicUser.id ? 'selected' : ''}`}
                                onClick={() => handleMemberClickRitual({ data: magicUser })}
                            >
                                <Tile
                                    id={i}
                                    tileSize={tileSize}
                                    image={magicUser.image ? magicUser.image : null}
                                    imageOverride={magicUser.portrait ? magicUser.portrait : null}
                                    contains={magicUser.type}
                                    data={magicUser}
                                    color={magicUser.color}
                                    editMode={false}
                                    type={'crew-tile'}
                                    handleClick={handleMemberClickRitual}
                                    handleHover={handleCrewTileHover}
                                    className="crew-tile"
                                />
                                <div className="ritual-magic-user-name">{magicUser.name}</div>
                            </div>
                        ))}
                    </div>

                    {/* Ritual cards */}
                    {(() => {
                        const activeMagicUser = setMemberRitualOptions
                            || (crew.find(e => e.type === 'wizard' || e.type === 'sage'));
                        if (!activeMagicUser) return null;
                        const knownRituals = activeMagicUser.knownRituals || [];
                        const inProgressKeys = (activeMagicUser.specialActions || [])
                            .filter(a => a && a.type === 'ritual' && !a.available)
                            .map(a => a.ritualKey || a.subtype);

                        return (
                            <div className="ritual-cards">
                                {Object.values(RITUALS).map((ritual, i) => {
                                    const isKnown = knownRituals.includes(ritual.key);
                                    const isInProgress = inProgressKeys.includes(ritual.key);
                                    return (
                                        <div key={i} className={`ritual-card ${isKnown ? 'known' : 'unknown'}`}>
                                            <div className="ritual-card-header">
                                                <div
                                                    className="ritual-card-icon"
                                                    style={{
                                                        backgroundImage: `url(${images[ritual.icon] || ''})`,
                                                        ...(ritual.key === 'wardingCircle' ? { filter: 'invert(1)' } : {}),
                                                    }}
                                                />
                                                <div className="ritual-card-name">{ritual.name}</div>
                                            </div>
                                            <div className="ritual-card-flavor">{ritual.flavorText}</div>
                                            <div className="ritual-card-description">{ritual.description}</div>
                                            <div className="ritual-card-footer">
                                                <div className="ritual-card-prep-time">⏱ {formatPrepTime(ritual.prepareTime)}</div>
                                                {isInProgress ? (
                                                    <div className="ritual-card-btn preparing">Preparing…</div>
                                                ) : isKnown ? (
                                                    <div className="ritual-card-btn known-badge">Known ✓</div>
                                                ) : (
                                                    <div
                                                        className="ritual-card-btn learn-btn"
                                                        onClick={() => onLearnRitual && onLearnRitual(activeMagicUser, ritual)}
                                                    >
                                                        Learn
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>
            )}

            {modalType === 'Merchant' && (
                <div className="merchant-screen" style={{
                    opacity: showContent ? 1 : 0,
                    transform: showContent ? 'scale(1)' : 'scale(0.98)',
                    transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                    pointerEvents: showContent ? 'auto' : 'none'
                }}>
                    <div className="vendor-split-container">
                        <div className="vendor-panel">
                            <h3 className="panel-title">Merchant's Stock</h3>
                            <div className="item-list scroll-container">
                                {merchantStock.map((item, idx) => (
                                    <div key={idx} className="item-card">
                                        {renderItemIcon(item.icon)}
                                        <div className="item-details">
                                            <div className="item-name">{item.name}</div>
                                            <div className="item-description">{item.description}</div>
                                        </div>
                                        <button className="buy-btn" onClick={() => handleBuyItem(item)}>
                                            <span>Buy</span>
                                            <span className="price-tag">🪙 {item.price}</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="vendor-panel">
                            <h3 className="panel-title">Your Unequipped Items</h3>
                            <div className="item-list scroll-container">
                                {(() => {
                                    const sellableItems = (inventoryManager?.inventory || []).filter(item => item && item.equippedBy == null);
                                    if (sellableItems.length === 0) {
                                        return <div className="empty-message">No sellable items in inventory.</div>;
                                    }
                                    return sellableItems.map((item, idx) => {
                                        const originalIndex = inventoryManager.inventory.indexOf(item);
                                        const sellPrice = getItemSellPrice(item);
                                        return (
                                            <div key={idx} className="item-card">
                                                {renderItemIcon(item.icon)}
                                                <div className="item-details">
                                                    <div className="item-name">{item.name}</div>
                                                    <div className="item-description">{item.description || item.type}</div>
                                                </div>
                                                <button className="sell-btn" onClick={() => handleSellItem(item, originalIndex)}>
                                                    <span>Sell</span>
                                                    <span className="price-tag">🪙 {sellPrice}</span>
                                                </button>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>

                    <div className="vendor-status-bar">
                        <div className="wallet-info">
                            <span>Gold: <strong style={{color: '#ffd700'}}><span role="img" aria-label="gold coin">🪙</span> {inventoryManager?.gold || 0}</strong></span>
                            <span>Dust: <strong style={{color: '#b388ff'}}><span role="img" aria-label="sparkles">✨</span> {inventoryManager?.shimmering_dust || 0}</strong></span>
                        </div>
                        {feedbackMsg && (
                            <div className="feedback-message" style={{color: feedbackColor}}>{feedbackMsg}</div>
                        )}
                    </div>
                </div>
            )}

            {modalType === 'Alchemist' && (
                <div className="alchemist-screen" style={{
                    opacity: showContent ? 1 : 0,
                    transform: showContent ? 'scale(1)' : 'scale(0.98)',
                    transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                    pointerEvents: showContent ? 'auto' : 'none',
                    position: 'relative'
                }}>
                    {showAssembly && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            zIndex: 999,
                            backgroundColor: 'rgba(10, 10, 12, 0.95)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '12px'
                        }}>
                            <div style={{
                                width: '200px',
                                height: '200px',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid rgba(179, 136, 255, 0.3)',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                boxShadow: '0 0 30px rgba(179, 136, 255, 0.2)'
                            }}>
                                <AssemblyAnimation
                                    pieces={archaicPieces}
                                    isAssembled={isAssembled}
                                    distance={80}
                                />
                            </div>
                            <div style={{
                                marginTop: '24px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                color: '#b388ff',
                                textShadow: '0 0 10px rgba(179, 136, 255, 0.5)',
                                letterSpacing: '1px'
                            }}>
                                Assembling Shards...
                            </div>
                        </div>
                    )}
                    <div className="vendor-split-container">
                        <div className="vendor-panel">
                            <h3 className="panel-title">Potion Brewing</h3>
                            <div className="item-list scroll-container">
                                {[
                                    { key: 'minor_health_potion', name: 'Minor Health Potion', desc: 'Restores 15% HP', gold: 15, dust: 5, icon: 'minor_health_potion' },
                                    { key: 'major_health_potion', name: 'Major Health Potion', desc: 'Restores 35% HP', gold: 40, dust: 10, icon: 'minor_health_potion' },
                                    { key: 'grand_health_potion', name: 'Grand Health Potion', desc: 'Restores 80% HP', gold: 100, dust: 20, icon: 'minor_health_potion' },
                                    { key: 'supreme_health_potion', name: 'Supreme Health Potion', desc: 'Restores 100% HP, 100% Endurance & cleanses debuffs', gold: 200, dust: 40, icon: 'minor_health_potion' },
                                ].map((recipe, idx) => (
                                    <div key={idx} className="item-card">
                                        {renderItemIcon(recipe.icon)}
                                        <div className="item-details">
                                            <div className="item-name">{recipe.name}</div>
                                            <div className="item-description">{recipe.desc}</div>
                                        </div>
                                        <button className="buy-btn brew-btn" onClick={() => handleBrewPotion(recipe.key, recipe.gold, recipe.dust)}>
                                            <span>Brew</span>
                                            <span className="price-tag">🪙 {recipe.gold} + ✨ {recipe.dust}</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="vendor-panel">
                            <h3 className="panel-title">Alchemical Services</h3>
                            <div className="item-list scroll-container">
                                <div className="item-card service-card">
                                    <div className="service-icon"><span role="img" aria-label="healing elixir">🧪</span></div>
                                    <div className="item-details">
                                        <div className="item-name">Elixir of Restoration</div>
                                        <div className="item-description">Restores all living crew members to max HP.</div>
                                    </div>
                                    <button className="buy-btn heal-service-btn" onClick={handleFullHeal}>
                                        <span>Restore HP</span>
                                        <span className="price-tag">🪙 100</span>
                                    </button>
                                </div>

                                <div className="item-card trade-card">
                                    {renderItemIcon('shimmering_dust')}
                                    <div className="item-details">
                                        <div className="item-name">Shimmering Dust</div>
                                        <div className="item-description">Trade Shimmering Dust.</div>
                                    </div>
                                    <div className="trade-btn-group">
                                        <button className="trade-sub-btn" onClick={() => handleTradeIngredient('buy', 'shimmering_dust', 10)}>
                                            <span>Buy (🪙10)</span>
                                        </button>
                                        <button className="trade-sub-btn sell" onClick={() => handleTradeIngredient('sell', 'shimmering_dust', 5)}>
                                            <span>Sell (🪙5)</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="item-card trade-card">
                                    {renderItemIcon('totems')}
                                    <div className="item-details">
                                        <div className="item-name">Totems</div>
                                        <div className="item-description">Trade Totems.</div>
                                    </div>
                                    <div className="trade-btn-group">
                                        <button className="trade-sub-btn" onClick={() => handleTradeIngredient('buy', 'totems', 50)}>
                                            <span>Buy (🪙50)</span>
                                        </button>
                                        <button className="trade-sub-btn sell" onClick={() => handleTradeIngredient('sell', 'totems', 25)}>
                                            <span>Sell (🪙25)</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="vendor-panel">
                            <h3 className="panel-title">Crafting</h3>
                            <div className="item-list scroll-container">
                                {[
                                    {
                                        key: 'moxadite_banner',
                                        name: 'Moxadite Banner',
                                        desc: 'Moxite + Labradite',
                                        tooltip: 'plant a banner beacon into the earth and travel to it at will',
                                        ing1: 'moxite',
                                        ing2: 'labradite',
                                        icon: 'moxadite_banner'
                                    },
                                    {
                                        key: 'benthachite_banner',
                                        name: 'Benthachite Banner',
                                        desc: 'Benthite + Malachite',
                                        tooltip: 'plant a banner beacon into the earth and travel to it at will',
                                        ing1: 'benthite',
                                        ing2: 'malachite',
                                        icon: 'benthachite_banner'
                                    },
                                    {
                                        key: 'pyremnite_banner',
                                        name: 'Pyremnite Banner',
                                        desc: 'Pyrite + Memnite',
                                        tooltip: 'plant a banner beacon into the earth and travel to it at will',
                                        ing1: 'pyrite',
                                        ing2: 'memnite',
                                        icon: 'pyremnite_banner'
                                    }
                                ].map((recipe, idx) => {
                                    const hasIngredients = hasItem(recipe.ing1) && hasItem(recipe.ing2);
                                    return (
                                        <div key={idx} className="item-card">
                                            <div 
                                                title={recipe.tooltip} 
                                                style={{ cursor: 'help' }}
                                                onClick={() => {
                                                     setFeedbackColor('#4db8ff');
                                                     setFeedbackMsg(`${recipe.name}: ${recipe.tooltip}`);
                                                }}
                                            >
                                                {renderItemIcon(recipe.icon)}
                                            </div>
                                            <div className="item-details">
                                                <div className="item-name">{recipe.name}</div>
                                                <div className="item-description">{recipe.desc}</div>
                                            </div>
                                            <button 
                                                className={`buy-btn brew-btn ${!hasIngredients ? 'disabled' : ''}`} 
                                                onClick={() => hasIngredients && handleCraftBanner(recipe.key, recipe.ing1, recipe.ing2)}
                                                disabled={!hasIngredients}
                                                style={{ opacity: hasIngredients ? 1 : 0.5 }}
                                            >
                                                <span>Craft</span>
                                                <span className="price-tag" style={{ fontSize: '10px' }}>
                                                    {recipe.ing1} + {recipe.ing2}
                                                </span>
                                            </button>
                                        </div>
                                    );
                                })}

                                {(() => {
                                    const shardCount = (inventoryManager?.inventory || []).filter(item => item && item._im_key === 'archaic_rune_shard').length;
                                    return (
                                        <div className="item-card" style={{ border: '1px solid rgba(179, 136, 255, 0.25)', boxShadow: '0 0 10px rgba(179, 136, 255, 0.05)' }}>
                                            <div 
                                                title="Assemble Archaic Rune from 5 Archaic Rune Shards" 
                                                style={{ cursor: 'help' }}
                                                onClick={() => {
                                                     setFeedbackColor('#b388ff');
                                                     setFeedbackMsg("Archaic Rune: Equip in Pet slot to gain Summon Familiar.");
                                                }}
                                            >
                                                {renderItemIcon('archaic_rune')}
                                            </div>
                                            <div className="item-details">
                                                <div className="item-name" style={{ color: '#b388ff' }}>Assemble Archaic Rune</div>
                                                <div className="item-description">Combine 5 Archaic Shards into a full Archaic Rune.</div>
                                            </div>
                                            <button 
                                                className={`buy-btn brew-btn ${shardCount < 5 ? 'disabled' : ''}`} 
                                                onClick={() => shardCount >= 5 && handleAssembleRune()}
                                                disabled={shardCount < 5}
                                                style={{ opacity: shardCount >= 5 ? 1 : 0.5 }}
                                            >
                                                <span>Assemble</span>
                                                <span className="price-tag" style={{ fontSize: '10px' }}>
                                                    {shardCount}/5 Shards
                                                </span>
                                            </button>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    <div className="vendor-status-bar">
                        <div className="wallet-info">
                            <span>Gold: <strong style={{color: '#ffd700'}}><span role="img" aria-label="gold coin">🪙</span> {inventoryManager?.gold || 0}</strong></span>
                            <span>Dust: <strong style={{color: '#b388ff'}}><span role="img" aria-label="sparkles">✨</span> {inventoryManager?.shimmering_dust || 0}</strong></span>
                            <span>Totems: <strong style={{color: '#4db8ff'}}><span role="img" aria-label="totem">🗿</span> {inventoryManager?.totems || 0}</strong></span>
                        </div>
                        {feedbackMsg && (
                            <div className="feedback-message" style={{color: feedbackColor}}>{feedbackMsg}</div>
                        )}
                    </div>
                </div>
            )}

            {modalType === 'SharpenBladesDetails' && (
                <div className="sharpen-blades-details-zone" style={{
                    padding: '24px',
                    color: '#f3f4f6',
                    backgroundColor: '#1b1d21',
                    borderRadius: '12px',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            backgroundImage: `url(${images['shortsword'] || ''})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            marginRight: '14px',
                            filter: 'drop-shadow(0 0 6px rgba(235,166,54,0.4))'
                        }} />
                        <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 600, color: '#eba636' }}>Sharpen Blades</h3>
                    </div>
                    
                    <div style={{ fontSize: '0.98rem', lineHeight: '1.6', color: '#d1d5db', marginBottom: '20px' }}>
                        <p style={{ margin: '0 0 12px 0' }}>
                            Begin a detailed sharpening process for the party's bladed weapons. 
                            The Soldier will spend dedicated time honing the edges of all cutting weapons.
                        </p>
                        
                        <div style={{
                            backgroundColor: 'rgba(235,166,54,0.06)',
                            borderLeft: '4px solid #eba636',
                            padding: '12px 16px',
                            borderRadius: '4px',
                            marginBottom: '20px'
                        }}>
                            <span style={{ fontWeight: '600', color: '#eba636' }}>⏱ Preparation Time:</span> 2 Hours
                        </div>

                        <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: 600, color: '#f3f4f6' }}>Upgrade Benefits:</h4>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#9ca3af' }}>
                            <li style={{ marginBottom: '8px' }}>
                                Applies a permanent <strong style={{ color: '#10b981' }}>+80% flat damage boost</strong> to all cutting weapons currently in the shared inventory or equipped by crew members.
                            </li>
                            <li>
                                Weapons will be upgraded to their <strong style={{ color: '#38bdf8' }}>(Sharpened)</strong> version upon completion.
                            </li>
                        </ul>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                        <button className="camp-action-btn" onClick={() => onClose && onClose()} style={{
                            backgroundColor: '#eba636',
                            color: '#111827',
                            border: 'none',
                            fontWeight: '600',
                            padding: '10px 20px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}>
                            Begin Sharpening
                        </button>
                    </div>
                </div>
            )}
        </CModalBody>
    )
}

// eslint-disable-next-line no-extend-native
Date.prototype.addHours= function(h){
    this.setHours(this.getHours()+h);
    return this;
}
// eslint-disable-next-line no-extend-native
Date.prototype.addMinutes= function(minutes){
    this.setMinutes(this.getMinutes()+minutes);
    return this;
}
// eslint-disable-next-line no-extend-native
Date.prototype.addSeconds= function(s){
    this.setSeconds(this.getSeconds()+s);
    return this;
}
// eslint-disable-next-line no-extend-native
Date.prototype.addMinutes= function(minutes){
    this.setMinutes(this.getMinutes()+minutes);
    return this;
}
function diff_minutes(dt2, dt1){
  var diff =(dt2.getTime() - dt1.getTime()) / 1000;
  diff /= 60;
  return Math.round(diff);
}
function diff_seconds(dt2,dt1){
    var diff =(dt2.getTime() - dt1.getTime()) / 1000;
    // diff /= 60;
    return Math.round(diff);
}

// const MAX_DEPTH = 8;
// const MAX_ROWS = 5;
// const TILE_SIZE = 100;
// const SHOW_TILE_BORDERS = false;

const MARKER_TYPES = [
    'enemy',
    'gate',
    'merchant',
    'stairs',
    'misc',
    'custom'
]

// ── Training Drill Picker ─────────────────────────────────────────────────────
// Local component for selecting a drill type + risk level per crew member.
function TrainingDrillPicker({ member, drills, currentFood, onConfirm }) {
    const [selectedDrill, setSelectedDrill] = React.useState(drills[0]?.stat || 'str');
    const [takeRisk, setTakeRisk] = React.useState(false);
    const drill = drills.find(d => d.stat === selectedDrill) || drills[0];

    const progress = member.trainingProgress || { str: 0, dex: 0, fort: 0, int: 0 };
    const progressVal = progress[selectedDrill] || 0;
    const cost = Math.max(1, 1 + progressVal);
    const canAfford = currentFood >= cost;

    return (
        <div className="training-drill-picker">
            {/* Drill type pills */}
            <div className="training-drill-pills">
                {drills.map(d => (
                    <button
                        key={d.stat}
                        className={`training-drill-pill${selectedDrill === d.stat ? ' active' : ''}`}
                        style={selectedDrill === d.stat ? { borderColor: d.color, color: d.color, background: `${d.color}18` } : {}}
                        onClick={() => setSelectedDrill(d.stat)}
                        title={d.desc}
                    >
                        <span role="img" aria-label={d.label}>{d.emoji}</span> {d.label}
                    </button>
                ))}
            </div>

            {/* Drill description */}
            {drill && (
                <div className="training-drill-desc">{drill.desc}</div>
            )}

            {/* Risk toggle */}
            <div className="training-risk-row">
                <button
                    className={`training-risk-btn${!takeRisk ? ' active' : ''}`}
                    onClick={() => setTakeRisk(false)}
                >
                    <span className="training-risk-icon" role="img" aria-label="shield">🛡</span>
                    <span>
                        <div className="training-risk-mode">Safe</div>
                        <div className="training-risk-detail">{drill?.safeDesc || ''}</div>
                    </span>
                </button>
                <button
                    className={`training-risk-btn risk${takeRisk ? ' active' : ''}`}
                    onClick={() => setTakeRisk(true)}
                >
                    <span className="training-risk-icon" role="img" aria-label="lightning bolt">⚡</span>
                    <span>
                        <div className="training-risk-mode">Push Hard</div>
                        <div className="training-risk-detail">{drill?.riskDesc || ''}</div>
                    </span>
                </button>
            </div>

            {/* Confirm button */}
            <button
                className={`training-confirm-btn${!canAfford ? ' disabled' : ''}`}
                disabled={!canAfford}
                onClick={() => canAfford && onConfirm(selectedDrill, takeRisk)}
            >
                {canAfford ? <span>Begin {drill?.label || 'Drill'} {takeRisk ? '(Push Hard)' : '(Safe)'} (Costs {cost} <span role="img" aria-label="meat">🍖</span>)</span> : <span>Needs {cost} food (Have {currentFood} <span role="img" aria-label="meat">🍖</span>)</span>}
            </button>
        </div>
    );
}

class DungeonPage extends React.Component {
    getCharacterActions = (character) => {
        let actions = [];

        // Show tiered glyph system for the wizard (Minor / Major / Supreme)
        if (character.type === 'wizard') {
            // Count available (ready) glyphs per tier
            const specialActions = character.specialActions || [];
            const minorCount  = specialActions.filter(a => a.type === 'glyph' && a.glyphTier === 'minor'   && a.available).length;
            const majorCount  = specialActions.filter(a => a.type === 'glyph' && a.glyphTier === 'major'   && a.available).length;
            const supremeCount = specialActions.filter(a => a.type === 'glyph' && a.glyphTier === 'supreme' && a.available).length;
            // Legacy magic-missile count (kept for any persisted old-format actions)
            const mmCount = specialActions.filter(a => a.subtype === 'magic missile' && a.available).length;

            actions.push({
                type: 'glyph',
                name: 'Etch Glyph',
                iconUrl: images['glyph_inverted'],
                noMaxCap: true, // multiple glyphs of same tier are allowed
                subTypes: [
                    {
                        type: 'Minor Glyph',
                        glyphTier: 'minor',
                        iconUrl: images['minor_glyph'] || '',
                        available: true,
                        count: minorCount + (mmCount > 0 ? mmCount : 0), // fold legacy mm into minor display
                    },
                    {
                        type: 'Major Glyph',
                        glyphTier: 'major',
                        iconUrl: images['major_glyph'] || '',
                        available: true,
                        count: majorCount,
                    },
                    {
                        type: 'Supreme Glyph',
                        glyphTier: 'supreme',
                        iconUrl: images['supreme_glyph'] || '',
                        available: true,
                        count: supremeCount,
                    },
                ]
            });

            // Prepare Ritual action — always shown for wizards; each subtype reflects a ritual
            // known/unknown is indicated by subtype.available (greyed out if unknown)
            const knownRituals = character.knownRituals || [];
            const ritualSubTypes = Object.values(RITUALS).map(r => {
                const isAvailable = knownRituals.includes(r.key);
                return {
                    type: r.name,
                    ritualKey: r.key,
                    iconUrl: images[r.icon] || '',
                    available: isAvailable,
                    count: 0
                };
            });
            const hasAnyKnownRitual = ritualSubTypes.some(r => r.available);
            actions.push({
                type: 'ritual',
                name: 'Prepare Ritual',
                iconUrl: images['magic_moon_1'] || '',
                disabled: !hasAnyKnownRitual,
                subTypes: ritualSubTypes
            });
        }
        // Sage also gets the Prepare Ritual action (same ritual pool as wizard)
        if (character.type === 'sage') {
            // Mix Potions — Sage-exclusive brewing action
            actions.push({
                type: 'compound',
                name: 'Mix Potions',
                iconUrl: images['potion'] || '',
                noMaxCap: true,
                subTypes: [] // no tier subtypes; builder opens directly
            });
            const knownRituals = character.knownRituals || [];
            const ritualSubTypes = Object.values(RITUALS).map(r => {
                const isAvailable = knownRituals.includes(r.key);
                return {
                    type: r.name,
                    ritualKey: r.key,
                    iconUrl: images[r.icon] || '',
                    available: isAvailable,
                    count: 0
                };
            });
            const hasAnyKnownRitualSage = ritualSubTypes.some(r => r.available);
            actions.push({
                type: 'ritual',
                name: 'Prepare Ritual',
                iconUrl: images['magic_moon_1'] || '',
                disabled: !hasAnyKnownRitualSage,
                subTypes: ritualSubTypes
            });
        }
        if (character.type === 'barbarian') {
            actions.push({
                type: 'brew',
                name: 'Brew',
                iconUrl: images['brew_beer'] || images['potion'] || '',
                noMaxCap: true,
                subTypes: []
            });
            // ── Imprint Tattoo ──
            const tattoos = character.tattoos || [];
            const isImprinting = !!character.tattooImprinting &&
                new Date(character.tattooImprinting.endDate) > new Date();
            actions.push({
                type: 'imprint_tattoo',
                name: 'Tattoos',
                iconUrl: images['tattoo_ink'] || images['tattoo_placeholder'] || '',
                noMaxCap: true,
                disabled: tattoos.length >= 8 || isImprinting,
                tattooCount: tattoos.length,
                isImprinting,
                tattooImprintingEndDate: (character.tattooImprinting && character.tattooImprinting.endDate) || null,
                subTypes: []
            });
        }
        if (character.type === 'soldier') {
            // Check if a tactic is already in-progress or active
            const activeTactic = (character.specialActions || []).find(a => a.type === 'tactics');
            const tacticSubTypes = Object.values(BATTLE_TACTICS).map(t => ({
                type: t.name,
                tacticKey: t.key,
                iconUrl: images['battle_tactics'] || '',
                available: true,
                count: 0,
                prepMins: Math.round(t.prepTime / 60000),
                combatDuration: t.combatDuration,
                xpMultiplier: t.xpMultiplier,
                description: t.description,
                flavorText: t.flavorText,
            }));
            // If there's an already active (ready) tactic, show combatsRemaining
            if (activeTactic && activeTactic.available) {
                tacticSubTypes.forEach(s => {
                    if (s.tacticKey === activeTactic.tacticKey) s.count = activeTactic.combatsRemaining || 0;
                });
            }
            actions.push({
                type: 'tactics',
                name: 'Battle Tactics',
                iconUrl: images['battle_tactics'] || '',
                noMaxCap: true,
                subTypes: tacticSubTypes,
                activeTactic,
            });

            // Sharpen Blades action
            const activeSharpen = (character.specialActions || []).find(a => a.type === 'sharpen_blades' && new Date(a.endDate) > new Date());
            actions.push({
                type: 'sharpen_blades',
                name: 'Sharpen Blades',
                iconUrl: images['shortsword'] || '',
                disabled: !!activeSharpen,
                subTypes: []
            });
        }
        // ── Monk: Inner Discipline ──────────────────────────────────────────
        if (character.type === 'monk') {
            const specialActions = character.specialActions || [];
            const chiCharges = specialActions.filter(a => a.type === 'inner_discipline' && a.category === 'chi' && a.available).length;
            const activeStance = specialActions.find(a => a.type === 'inner_discipline' && a.category === 'stance' && a.available && (a.combatsRemaining || 0) > 0);

            // Build a child subtype for a single discipline definition
            const buildChild = (d) => {
                const cat = d.category;
                let count = 0;
                if (cat === 'chi' && d.key === 'meditative_focus') count = chiCharges;
                if (cat === 'stance' && activeStance && activeStance.disciplineKey === d.key) count = activeStance.combatsRemaining;
                return {
                    type: d.name,
                    disciplineKey: d.key,
                    category: cat,
                    iconUrl: images[d.icon] || '',
                    available: true,
                    count,
                    prepMins: Math.round(d.prepTime / 60000),
                    combatDuration: d.combatDuration || null,
                    revealScope: d.revealScope || null,
                    description: d.description,
                    flavorText: d.flavorText,
                };
            };

            const chiDef = INNER_DISCIPLINES.meditative_focus;
            const stanceKeys = DISCIPLINE_CATEGORIES.stance;
            const spiritKeys = DISCIPLINE_CATEGORIES.spirit;

            const disciplineSubTypes = [
                // Meditative Focus — direct (no submenu)
                {
                    ...buildChild(chiDef),
                    isCategory: false,
                },
                // Body Conditioning — submenu
                {
                    type: 'Body Conditioning',
                    disciplineKey: null,
                    category: 'stance',
                    iconUrl: images['monk_inner_fire'] || '',
                    available: true,
                    count: activeStance ? activeStance.combatsRemaining : 0,
                    isCategory: true,
                    categoryKey: 'stance',
                    children: stanceKeys.map(k => buildChild(INNER_DISCIPLINES[k])),
                },
                // Spirit Walk — submenu
                {
                    type: 'Spirit Walk',
                    disciplineKey: null,
                    category: 'spirit',
                    iconUrl: images['monk_third_eye'] || '',
                    available: true,
                    count: 0,
                    isCategory: true,
                    categoryKey: 'spirit',
                    children: spiritKeys.map(k => buildChild(INNER_DISCIPLINES[k])),
                },
            ];
            actions.push({
                type: 'inner_discipline',
                name: 'Inner Discipline',
                iconUrl: images['monk_meditate'] || '',
                noMaxCap: true,
                subTypes: disciplineSubTypes,
            });
        }
        // ── Ranger: Prepare Poison & Deploy Animal Agent ──────────────────────
        if (character.type === 'ranger') {
            const specialActions = character.specialActions || [];

            // — Prepare Poison —
            const readyBombs   = specialActions.filter(a => a.type === 'acid_bomb' && a.available).length;
            const bombPrepping = specialActions.some(a => a.type === 'acid_bomb' && !a.available && new Date(a.endDate) > new Date());
            actions.push({
                type: 'prepare_poison',
                name: 'Prepare Poison',
                iconUrl: images['ranger_acid_bomb'] || images['wizard_acid_blast'] || '',
                noMaxCap: true,
                subTypes: [
                    {
                        type: 'Acid Bomb',
                        bombType: 'acid_bomb',
                        iconUrl: images['ranger_acid_bomb'] || images['wizard_acid_blast'] || '',
                        available: readyBombs < 2 && !bombPrepping,
                        count: readyBombs,
                    },
                    {
                        type: 'Poison Weapons',
                        bombType: 'poison_weapons',
                        iconUrl: images['ranger_poison_arrow'] || images['poison'] || '',
                        available: false,
                        count: 0,
                    },
                ],
            });

            // — Deploy Animal Agent —
            const hasRatSkill = (character.globalSkills || []).some(s => (typeof s === 'string' ? s : s.key) === 'scrounging_rat');
            const hasCrowSkill = (character.globalSkills || []).some(s => (typeof s === 'string' ? s : s.key) === 'fastidious_crow');
            const deployAnimalDisabled = !hasRatSkill && !hasCrowSkill;

            const ratPrepping = specialActions.some(a => a.type === 'rat_agent' && !a.available && new Date(a.endDate) > new Date());
            actions.push({
                type: 'deploy_animal',
                name: 'Deploy Animal',
                iconUrl: images['scrounging_rat'] || '',
                noMaxCap: true,
                disabled: deployAnimalDisabled,
                subTypes: [
                    {
                        type: 'Scrounging Rat',
                        agentType: 'scrounging_rat',
                        iconUrl: images['scrounging_rat'] || '',
                        available: hasRatSkill && !ratPrepping,
                        count: 0,
                    },
                    {
                        type: 'Scout Crow',
                        agentType: 'scout_crow',
                        iconUrl: images['fastidious_crow'] || '',
                        available: false,
                        count: 0,
                    },
                ],
            });
        }
        // Add other class logic here as needed

        // Compute per-action maximum: only count subtypes belonging to that action type.
        // Glyph actions have no cap (multiple glyphs of same tier are allowed).
        // Rituals cap at 3.
        const getMaxReachedForAction = (action) => {
            if (action.noMaxCap) return false;
            const actionCount = (action.subTypes || []).reduce((sum, s) => sum + (s.count || 0), 0);
            return actionCount >= 3;
        };

        // ── Helper: count reagents in inventory ─────────────────────────────
        const getReagentCount = (reagentId) => {
            const inv = (this.props.inventoryManager && this.props.inventoryManager.inventory) || [];
            return inv.filter(item => item && item.id === reagentId && item.category === 'reagent').length;
        };

        // ── Compound builder: current recipe match ──────────────────────────
        const compoundSlots = this.state.compoundBuilderSlots || [];
        const matchedRecipe = matchRecipe(compoundSlots);
        const matchedPotion = matchedRecipe ? POTIONS[matchedRecipe.potionId] : null;

        return <div className='actions-container'>
            {actions.map((action, i) => {
                const maximumReached = getMaxReachedForAction(action);
                // find the active special action that matches THIS action's type
                // type:'glyph' covers new format; type:'spell' fallback covers legacy magic missile
                // type:'prepare_poison' covers acid_bomb child; type:'deploy_animal' covers rat_agent child
                let activeAction = (character.specialActions || []).find(a => {
                    if (!a || !a.startDate || !a.endDate) return false;
                    const typeMatches =
                        a.type === action.type ||
                        (action.type === 'glyph' && (a.type === 'spell' || a.type === 'glyph')) ||
                        (action.type === 'prepare_poison' && a.type === 'acid_bomb') ||
                        (action.type === 'deploy_animal' && a.type === 'rat_agent');
                    if (!typeMatches) return false;
                    const start = new Date(a.startDate);
                    const end = new Date(a.endDate);
                    const now = new Date();
                    return now >= start && now < end;
                });

                // Support progress overlay for Barbarian's Tattoo Imprinting
                if (action.type === 'imprint_tattoo' && character.tattooImprinting) {
                    const start = new Date(character.tattooImprinting.startDate);
                    const end = new Date(character.tattooImprinting.endDate);
                    const now = new Date();
                    if (now >= start && now < end) {
                        activeAction = {
                            type: 'imprint_tattoo',
                            startDate: character.tattooImprinting.startDate,
                            endDate: character.tattooImprinting.endDate
                        };
                    }
                }
                return (
                <div className={`action-wrapper action-wrapper--${action.type} ${action.disabled ? 'disabled' : ''}`} key={i}>
                    <div className={`action-hover-wrapper ${action.disabled ? 'disabled' : ''}`} onClick={() => this.handleActionClick(action)} style={{
                        border: `${this.getActionCooldownPercentage() && (character.specialActions || []).find(e=>e.type === action.type) ? '1px solid #635b4a' : ''}`
                    }}>
                        {/* placeholder used by canvas to draw high-frequency progress overlays */}
                        {(() => {
                            // Use a stable placeholder id so the DOM node isn't recreated on every render.
                            // Recreating the node caused the canvas overlay to flicker when it tried to
                            // draw into a rapidly-unmounting element. Use the character id/type and
                            // action type to form a stable key.
                            const placeholderId = `po-${character.id || character.type}-${action.type}`;
                            const start = activeAction ? activeAction.startDate : '';
                            const end = activeAction ? activeAction.endDate : '';
                            return (
                                <div
                                    id={placeholderId}
                                    ref={el => this.placeholderRef(el, placeholderId, start, end)}
                                    className="progress-overlay progress-overlay-placeholder"
                                    data-start={start}
                                    data-end={end}
                                ></div>
                            );
                        })()}
                        {(() => {
                            let rawIcon = action.iconUrl;
                            if (rawIcon && typeof rawIcon === 'object') {
                                rawIcon = rawIcon.default || rawIcon;
                            }
                            if (rawIcon && typeof rawIcon === 'object') {
                                rawIcon = rawIcon.default || '';
                            }
                            const resolvedUrl = rawIcon || '';
                            return (
                                <div className='action-icon' style={{
                                    backgroundImage: resolvedUrl ? `url("${encodeURI(String(resolvedUrl))}")` : 'none',
                                    filter: action.type === 'compound' ? 'invert(1)' : undefined
                                }}></div>
                            );
                        })()}
                        <div className="action-text">
                            {action.type === 'imprint_tattoo' && action.isImprinting
                                ? this.getTattooImprintLabel(this.state.selectedCrewMember) || action.name
                                : action.name}
                            {action.type === 'imprint_tattoo' && (
                                <span style={{ fontSize: '0.7rem', color: '#7a6a5a', marginLeft: 6 }}>
                                    {action.tattooCount}/8
                                </span>
                            )}
                        </div>
                    </div>
                    {/* <div className="info-icon" style={{backgroundImage: `url(${images['info']})`}}></div> */}
                    <div className={`action-sub-menu ${!action.disabled && (Array.isArray(this.state.actionMenuTypeExpanded) ? this.state.actionMenuTypeExpanded : []).includes(action.type) ? 'expanded' : ''}`}>
                        {maximumReached && <div className='max-reached'>maximum reached</div>}
                        {action.subTypes && action.subTypes.map((subType, j) => (
                            <React.Fragment key={j}>
                                <div onClick={() => this.handleActionSubtypeClick(action, subType)}
                                    className={`action-subtype ${this.getSubtypeClass(subType, maximumReached)} ${action.type === 'glyph' && this.state.glyphBuilderOpen === subType.glyphTier ? 'active-tier' : ''} ${subType.isCategory && this.state.innerDisciplineCategoryOpen === subType.categoryKey ? 'active-tier' : ''} ${!subType.isCategory && subType.disciplineKey && this.state.innerDisciplineSelected === subType.disciplineKey ? 'active-tier' : ''}`}>
                                    {subType.type} {subType.count !== 0 && this.getSubtypeImageCountElement(subType)}
                                    {subType.isCategory && <span className="category-arrow">{this.state.innerDisciplineCategoryOpen === subType.categoryKey ? ' ▾' : ' ▸'}</span>}
                                </div>
                                {/* Nested children for inner discipline categories */}
                                {subType.isCategory && this.state.innerDisciplineCategoryOpen === subType.categoryKey && subType.children && (
                                    <div className="discipline-children">
                                        {subType.children.map((child, k) => (
                                            <div key={k}
                                                onClick={() => this.handleActionSubtypeClick(action, child)}
                                                className={`action-subtype discipline-child ${this.getSubtypeClass(child, false)} ${this.state.innerDisciplineSelected === child.disciplineKey ? 'active-tier' : ''}`}>
                                                {child.type} {child.count !== 0 && this.getSubtypeImageCountElement(child)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Builder panel renders immediately below the tier that is open */}
                                {action.type === 'glyph' && this.state.glyphBuilderOpen === subType.glyphTier && (() => {
                                    const tier = this.state.glyphBuilderOpen;
                                    const glyphDef = GLYPHS[tier];
                                    if (!glyphDef) return null;
                                    const totalSlots = glyphDef.slots;
                                    const pickedSpells = this.state.glyphBuilderSpells || [];
                                    const slotsUsed = pickedSpells.reduce((s, sp) => s + (GLYPH_SPELL_SLOT_COST[sp.tier] || 1), 0);

                                    // Wizard's eligible combat spells from skills-matrix
                                    const wizardCombatSpellKeys = (this.state.selectedCrewMember?.skills || 
                                        (this.state.selectedCrewMember?.specials || []).concat(this.state.selectedCrewMember?.attacks || []))
                                        .filter(key => {
                                            const def = skillsMatrix[key];
                                            return def && def.class === 'wizard' && def.type !== 'passive';
                                        });

                                    // Compute prep time label
                                    const prepMs = computeGlyphPrepTime(pickedSpells);
                                    const prepMin = Math.round(prepMs / 60000);
                                    const prepLabel = prepMin >= 60
                                        ? `${Math.floor(prepMin / 60)}h ${prepMin % 60 > 0 ? (prepMin % 60) + 'm' : ''}`.trim()
                                        : `${prepMin} min`;

                                    // Build slot row: slot-0 = spell icon, slots 1+ = red X
                                    const slotBlocks = [];
                                    let slotIdx = 0;
                                    pickedSpells.forEach((sp) => {
                                        const cost = GLYPH_SPELL_SLOT_COST[sp.tier] || 1;
                                        const spDef = skillsMatrix[sp.id];
                                        const spIconUrl = spDef?.icon
                                            ? (typeof spDef.icon === 'object' ? (spDef.icon.default || '') : spDef.icon)
                                            : '';
                                        for (let c = 0; c < cost; c++) {
                                            slotBlocks.push(
                                                <div key={`slot-${slotIdx++}`}
                                                     className={`glyph-slot filled tier-${sp.tier} ${c > 0 ? 'slot-overflow' : ''}`}
                                                     title={c === 0 ? `${sp.name} (click to remove)` : `Slot used by ${sp.name}`}
                                                     onClick={() => this.handleGlyphSpellToggle(sp.id)}>
                                                    {c === 0
                                                        ? <div className="glyph-slot-icon" style={{ backgroundImage: spIconUrl ? `url(${spIconUrl})` : 'none' }} />
                                                        : <span className="glyph-slot-x">✕</span>
                                                    }
                                                </div>
                                            );
                                        }
                                    });
                                    for (let e = slotsUsed; e < totalSlots; e++) {
                                        slotBlocks.push(<div key={`slot-empty-${e}`} className="glyph-slot empty" />);
                                    }

                                    return (
                                        <div className="glyph-builder-panel">
                                            {/* TOP: slot squares */}
                                            <div className="glyph-slot-row">{slotBlocks}</div>

                                            {/* BOTTOM: visual spell icon grid */}
                                            <div className="glyph-spell-grid">
                                                {wizardCombatSpellKeys.map(key => {
                                                    const def = skillsMatrix[key];
                                                    if (!def) return null;
                                                    const cost = GLYPH_SPELL_SLOT_COST[def.tier] || 1;
                                                    const isSelected = pickedSpells.some(s => s.id === key);
                                                    const wouldOverflow = !isSelected && slotsUsed + cost > totalSlots;
                                                    const iconUrl = def.icon
                                                        ? (typeof def.icon === 'object' ? (def.icon.default || '') : def.icon)
                                                        : '';
                                                    return (
                                                        <div
                                                            key={key}
                                                            className={`glyph-spell-cell ${isSelected ? 'selected' : ''} ${wouldOverflow ? 'overflow' : ''}`}
                                                            onClick={() => this.handleGlyphSpellToggle(key)}
                                                            title={`${def.name} — T${def.tier} · ${cost} slot${cost > 1 ? 's' : ''}`}
                                                        >
                                                            <div className={`glyph-spell-cell-icon tier-${def.tier}`}
                                                                 style={{ backgroundImage: iconUrl ? `url(${iconUrl})` : 'none' }} />
                                                            <span className="glyph-spell-cell-name">{def.name}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <button
                                                className={`glyph-prepare-btn ${pickedSpells.length === 0 ? 'disabled' : ''}`}
                                                onClick={this.handleGlyphPrepare}
                                                disabled={pickedSpells.length === 0}
                                            >
                                                {pickedSpells.length === 0 ? 'Pick spells above' : `Prepare · ${prepLabel}`}
                                            </button>
                                        </div>
                                    );
                                })()}
                            </React.Fragment>
                        ))}

                        {/* ── Compound Potions builder (Sage) ───────────────────────────── */}
                        {action.type === 'compound' && this.state.compoundBuilderOpen && (() => {
                            const inv = (this.props.inventoryManager && this.props.inventoryManager.inventory) || [];
                            const allSlotsFull = compoundSlots.length >= 3;
                            const isReagentCompatible = (rKey) => {
                                if (compoundSlots.length === 0) return true;
                                if (compoundSlots.includes(rKey)) return true;
                                return POTION_RECIPES.some(recipe => {
                                    const containsSlots = compoundSlots.every(s => recipe.reagents.includes(s));
                                    const containsCandidate = recipe.reagents.includes(rKey);
                                    return containsSlots && containsCandidate;
                                });
                            };
                            return (
                            <div className="compound-builder-panel">
                                {/* TOP: 3 reagent slots */}
                                <div className="compound-slot-row">
                                    {[0, 1, 2].map(i => {
                                        const slotId = compoundSlots[i];
                                        const slotReagent = slotId ? REAGENTS[slotId] : null;
                                        const iconUrl = slotReagent ? images[slotReagent.icon] : null;
                                        return (
                                            <div
                                                key={i}
                                                className={`compound-slot ${slotReagent ? 'filled' : 'empty'}`}
                                                title={slotReagent ? `${slotReagent.name} (click to remove)` : 'Empty slot'}
                                                onClick={() => slotReagent && this.handleCompoundSlotRemove(i)}
                                            >
                                                {slotReagent && (
                                                    <div className="compound-slot-icon"
                                                         style={{ backgroundImage: iconUrl ? `url(${iconUrl})` : 'none' }} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* MIDDLE: available reagents from inventory */}
                                <div className="compound-reagent-grid">
                                    {REAGENT_KEYS.map(rKey => {
                                        const reagent = REAGENTS[rKey];
                                        const count = getReagentCount(rKey);
                                        const isSelected = compoundSlots.includes(rKey);
                                        const isDepleted = count === 0;

                                        const hasSelection = compoundSlots.length > 0;
                                        const isCompatible = !hasSelection || isReagentCompatible(rKey);

                                        const isBlocked = (!isSelected && allSlotsFull) || (!isSelected && hasSelection && !isCompatible);
                                        const isCompatibleHighlight = hasSelection && isCompatible && !isSelected && !isDepleted;
                                        const isIncompatibleDim = hasSelection && !isCompatible && !isSelected;

                                        const iconUrl = images[reagent.icon];
                                        return (
                                            <div
                                                key={rKey}
                                                className={`compound-reagent-cell ${isSelected ? 'selected' : ''} ${isCompatibleHighlight ? 'compatible' : ''} ${isIncompatibleDim ? 'incompatible' : ''} ${(isDepleted || isBlocked) ? 'depleted' : ''}`}
                                                onClick={() => !isDepleted && !isBlocked && this.handleCompoundReagentClick(rKey)}
                                                title={`${reagent.name} (×${count})${isDepleted ? ' — none in inventory' : ''}`}
                                            >
                                                <div className="compound-reagent-icon"
                                                     style={{ backgroundImage: iconUrl ? `url(${iconUrl})` : 'none' }} />
                                                <span className="compound-reagent-name">{reagent.name}</span>
                                                {count > 0 && <span className="compound-reagent-count">×{count}</span>}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* BOTTOM: recipe match + brew button */}
                                {matchedPotion && (
                                    <div className="compound-recipe-label">→ {matchedPotion.name}</div>
                                )}
                                <button
                                    className={`compound-brew-btn ${matchedPotion ? 'ready' : 'disabled'}`}
                                    onClick={this.handleCompoundBrew}
                                    disabled={!matchedPotion}
                                >
                                    {matchedPotion ? `Brew: ${matchedPotion.name}` : (compoundSlots.length === 0 ? 'Select reagents above' : 'No matching recipe')}
                                </button>

                                {/* Potion Combining Section */}
                                <div className="potion-combining-section" style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '15px' }}>
                                    <h4 style={{ color: '#ffb830', fontSize: '14px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Combine Potions</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {[
                                            { source: 'minor_health_potion', target: 'major_health_potion', label: 'Minor → Major', desc: 'Combine 2 Minor to get 1 Major' },
                                            { source: 'major_health_potion', target: 'grand_health_potion', label: 'Major → Grand', desc: 'Combine 2 Major to get 1 Grand' },
                                            { source: 'grand_health_potion', target: 'supreme_health_potion', label: 'Grand → Supreme', desc: 'Combine 2 Grand to get 1 Supreme' }
                                        ].map(combo => {
                                            const sourceCount = inv.filter(item => item && (item._im_key === combo.source || item.id === combo.source)).length;
                                            const canCombine = sourceCount >= 2;
                                            return (
                                                <div 
                                                    key={combo.source}
                                                    style={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'space-between', 
                                                        background: 'rgba(255,255,255,0.02)', 
                                                        border: '1px solid rgba(255,255,255,0.05)', 
                                                        borderRadius: '6px', 
                                                        padding: '8px 12px',
                                                        opacity: canCombine ? 1 : 0.6
                                                    }}
                                                >
                                                    <div style={{ textAlign: 'left' }}>
                                                        <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#fff' }}>{combo.label}</div>
                                                        <div style={{ fontSize: '11px', color: '#888' }}>{combo.desc} (Held: {sourceCount})</div>
                                                    </div>
                                                    <button
                                                        onClick={() => this.handleCombinePotions(combo.source, combo.target)}
                                                        disabled={!canCombine}
                                                        style={{
                                                            background: canCombine ? '#ffb830' : 'rgba(255,255,255,0.05)',
                                                            color: canCombine ? '#121215' : '#666',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            padding: '4px 10px',
                                                            fontSize: '11px',
                                                            fontWeight: 'bold',
                                                            cursor: canCombine ? 'pointer' : 'default',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        Combine
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* ── Brews builder (Barbarian) ───────────────────────────── */}
                    {action.type === 'brew' && this.state.brewBuilderOpen && (() => {
                        const brewSlots = this.state.brewBuilderSlots || [];
                        const matchedBrew = matchBrewRecipe(brewSlots) ? BREWS[matchBrewRecipe(brewSlots).brewId] : null;
                        const allSlotsFull = brewSlots.length >= 2;
                        const getIngredientCount = (ingId) => {
                            const inv = (this.props.inventoryManager && this.props.inventoryManager.inventory) || [];
                            return inv.filter(item => item && item.id === ingId && item.category === 'reagent').length;
                        };
                        const isIngredientCompatible = (rKey) => {
                            if (brewSlots.length === 0) return true;
                            if (brewSlots.includes(rKey)) return true;
                            return BREW_RECIPES.some(recipe => {
                                const containsSlots = brewSlots.every(s => recipe.reagents.includes(s));
                                const containsCandidate = recipe.reagents.includes(rKey);
                                return containsSlots && containsCandidate;
                            });
                        };
                        return (
                        <div className="compound-builder-panel">
                            {/* TOP: 2 ingredient slots */}
                            <div className="compound-slot-row dual-slots" style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                                {[0, 1].map(i => {
                                    const slotId = brewSlots[i];
                                    const slotIngredient = slotId ? BREW_INGREDIENTS[slotId] : null;
                                    const iconUrl = slotIngredient ? images[slotIngredient.icon] : null;
                                    return (
                                        <div
                                            key={i}
                                            className={`compound-slot ${slotIngredient ? 'filled' : 'empty'}`}
                                            style={{ width: '42px', height: '42px' }}
                                            title={slotIngredient ? `${slotIngredient.name} (click to remove)` : 'Empty slot'}
                                            onClick={() => slotIngredient && this.handleBrewSlotRemove(i)}
                                        >
                                            {slotIngredient && (
                                                <div className="compound-slot-icon"
                                                     style={{ backgroundImage: iconUrl ? `url(${iconUrl})` : 'none' }} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* MIDDLE: available ingredients from inventory */}
                            <div className="compound-reagent-grid">
                                {BREW_INGREDIENT_KEYS.map(rKey => {
                                    const ingredient = BREW_INGREDIENTS[rKey];
                                    const count = getIngredientCount(rKey);
                                    const isSelected = brewSlots.includes(rKey);
                                    const isDepleted = count === 0;

                                    const hasSelection = brewSlots.length > 0;
                                    const isCompatible = !hasSelection || isIngredientCompatible(rKey);

                                    const isBlocked = (!isSelected && allSlotsFull) || (!isSelected && hasSelection && !isCompatible);
                                    const isCompatibleHighlight = hasSelection && isCompatible && !isSelected && !isDepleted;
                                    const isIncompatibleDim = hasSelection && !isCompatible && !isSelected;

                                    const iconUrl = images[ingredient.icon];
                                    return (
                                        <div
                                            key={rKey}
                                            className={`compound-reagent-cell ${isSelected ? 'selected' : ''} ${isCompatibleHighlight ? 'compatible' : ''} ${isIncompatibleDim ? 'incompatible' : ''} ${(isDepleted || isBlocked) ? 'depleted' : ''}`}
                                            onClick={() => !isDepleted && !isBlocked && this.handleBrewIngredientClick(rKey)}
                                            title={`${ingredient.name} (×${count})${isDepleted ? ' — none in inventory' : ''}`}
                                        >
                                            <div className="compound-reagent-icon"
                                                 style={{ backgroundImage: iconUrl ? `url(${iconUrl})` : 'none' }} />
                                            <span className="compound-reagent-name">{ingredient.name}</span>
                                            {count > 0 && <span className="compound-reagent-count">×{count}</span>}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* BOTTOM: recipe match + brew button */}
                            {matchedBrew && (
                                <div className="compound-recipe-label">→ {matchedBrew.name}</div>
                            )}
                            <button
                                className={`compound-brew-btn ${matchedBrew ? 'ready' : 'disabled'}`}
                                onClick={this.handleBrewStart}
                                disabled={!matchedBrew}
                            >
                                {matchedBrew ? `Brew: ${matchedBrew.name}` : (brewSlots.length === 0 ? 'Select ingredients above' : 'No matching recipe')}
                            </button>
                        </div>
                        );
                    })()}
                    {/* ── Battle Tactics picker (Soldier) ───────────────────────────── */}
                    {action.type === 'tactics' && this.state.tacticsBuilderOpen && (() => {
                        const selectedTactic = this.state.tacticsBuilderSelected;
                        const tacticDef = selectedTactic ? BATTLE_TACTICS[selectedTactic] : null;
                        const activeTactic = (this.state.selectedCrewMember?.specialActions || []).find(a => a.type === 'tactics');
                        const isBusy = activeTactic && new Date(activeTactic.endDate) > new Date();
                        return (
                            <div className="compound-builder-panel tactics-builder-panel">
                                {/* Tactic details */}
                                {tacticDef && (
                                    <div className="tactics-detail">
                                        <div className="tactics-detail-name">{tacticDef.name}</div>
                                        <div className="tactics-detail-desc">{tacticDef.description}</div>
                                        <div className="tactics-detail-meta">
                                            <span>⏱ {Math.round(tacticDef.prepTime / 60000)} min prep</span>
                                            <span>⚔ {tacticDef.combatDuration} combat{tacticDef.combatDuration !== 1 ? 's' : ''}</span>
                                            <span>✦ +{Math.round((tacticDef.xpMultiplier - 1) * 100)}% XP</span>
                                        </div>
                                        <div className="tactics-detail-flavor">{tacticDef.flavorText}</div>
                                    </div>
                                )}
                                {!tacticDef && (
                                    <div className="tactics-placeholder">Select a tactic above to see details.</div>
                                )}
                                <button
                                    className={`compound-brew-btn ${tacticDef && !isBusy ? 'ready' : 'disabled'}`}
                                    disabled={!tacticDef || isBusy}
                                    onClick={() => this.handleTacticsCommit(selectedTactic)}
                                >
                                    {isBusy
                                        ? `Preparing: ${activeTactic.name}…`
                                        : tacticDef
                                            ? `Commit to ${tacticDef.name}`
                                            : 'Select a tactic first'}
                                </button>
                            </div>
                        );
                    })()}
                    {/* ── Inner Discipline picker (Monk) ─────────────────────────── */}
                    {action.type === 'inner_discipline' && this.state.innerDisciplineBuilderOpen && (() => {
                        const selectedDisc = this.state.innerDisciplineSelected;
                        const discDef = selectedDisc ? INNER_DISCIPLINES[selectedDisc] : null;
                        const activeDisc = (this.state.selectedCrewMember?.specialActions || []).find(a =>
                            a && a.type === 'inner_discipline' && new Date(a.endDate) > new Date()
                        );
                        const isBusy = !!activeDisc;
                        // Chi max check
                        let isMaxChi = false;
                        if (discDef && discDef.category === 'chi') {
                            const charges = (this.state.selectedCrewMember?.specialActions || []).filter(
                                a => a.type === 'inner_discipline' && a.category === 'chi' && a.available
                            ).length;
                            isMaxChi = charges >= (discDef.maxCharges || 3);
                        }
                        const canCommit = discDef && !isBusy && !isMaxChi;
                        return (
                            <div className="compound-builder-panel tactics-builder-panel inner-discipline-builder-panel">
                                {/* Discipline details */}
                                {discDef && (
                                    <div className="tactics-detail">
                                        <div className="tactics-detail-name">{discDef.name}</div>
                                        <div className="tactics-detail-desc">{discDef.description}</div>
                                        <div className="tactics-detail-meta">
                                            <span><span role="img" aria-label="timer">⏱</span> {Math.round(discDef.prepTime / 60000)} min prep</span>
                                            {discDef.combatDuration && (
                                                <span><span role="img" aria-label="crossed swords">⚔</span> {discDef.combatDuration} combat{discDef.combatDuration !== 1 ? 's' : ''}</span>
                                            )}
                                            {discDef.category === 'chi' && (
                                                <span><span role="img" aria-label="meditation">🧘</span> Up to {discDef.maxCharges || 3} charges</span>
                                            )}
                                            {discDef.revealScope && (
                                                <span><span role="img" aria-label="eye">👁</span> {discDef.revealScope === 'current_board' ? 'Current board' : discDef.revealScope === 'adjacent_boards' ? 'Adjacent boards' : 'Entire level'}</span>
                                            )}
                                        </div>
                                        <div className="tactics-detail-flavor">{discDef.flavorText}</div>
                                    </div>
                                )}
                                {!discDef && (
                                    <div className="tactics-placeholder">Select a discipline above to see details.</div>
                                )}
                                <button
                                    className={`compound-brew-btn ${canCommit ? 'ready' : 'disabled'}`}
                                    disabled={!canCommit}
                                    onClick={() => this.handleInnerDisciplineCommit(selectedDisc)}
                                >
                                    {isBusy
                                        ? `Practising: ${activeDisc.name}…`
                                        : isMaxChi
                                            ? 'Maximum chi charges reached'
                                            : discDef
                                                ? `Begin ${discDef.name}`
                                                : 'Select a discipline first'}
                                </button>
                            </div>
                        );
                    })()}
                    </div>
                </div>
                )
            })}
        </div>;
    }
    
    // Scans crew specialActions for finished preparations, marks availability, optionally marks notified,
    // persists meta and returns any collected updates.
    checkAndCollectFinishedSpecialActions = ({ markNotified = true } = {}) => {
        const meta = getMeta() || {};
        const crew = Array.isArray(meta.crew)
            ? meta.crew
            : (Array.isArray(this.props?.crewManager?.crew) ? this.props.crewManager.crew : []);
        let updates = [];
        let modified = false;
        let numeralUpdate = false;
        let hasRitualUpdate = false;

        crew.forEach(member => {
            (member.specialActions || []).forEach(a => {
                if (!a || !a.endDate) return;
                const end = new Date(a.endDate);
                const now = new Date();
                        if (end - now < 0) {
                    if (!a.available) {
                        a.available = true;
                        modified = true;
                        numeralUpdate = true;
                    }
                    if (markNotified) {
                        if (!a.notified) {
                            const isRitual = a.type === 'ritual';
                            if (isRitual) hasRitualUpdate = true;

                            if (a.type === 'compound') {
                                const potion = POTIONS[a.potionId];
                                if (potion) {
                                    this.props.inventoryManager.addItem({ ...potion });
                                    try {
                                        const iconUrl = images[potion.icon] || null;
                                        this.triggerLootRadialArc({ type: 'potion', id: potion.id + '_' + Math.random(), icon: iconUrl, name: potion.name });
                                    } catch (e) {}
                                }
                            }

                            // Rat agent: award food and set fog reveal for current board
                            if (a.type === 'rat_agent') {
                                const rangerLvl = a.rangerLevel || 1;
                                const foodAmt = 10 * rangerLvl;
                                meta.food = (typeof meta.food === 'number' ? meta.food : 0) + foodAmt;
                                try {
                                    // Pick a random 3x3 patch on the current board
                                    const bm = this.props.boardManager;
                                    const levelId   = bm?.currentLevel?.id ?? null;
                                    const boardIdx  = bm?.playerTile?.boardIndex ?? null;
                                    if (levelId !== null && boardIdx !== null) {
                                        const startRow = Math.floor(Math.random() * 9) + 15; // 15-23
                                        const startCol = Math.floor(Math.random() * 9) + 15; // 15-23
                                        const revealUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
                                        meta.ratAgentReveal = { levelId, boardIndex: boardIdx, startRow, startCol, revealUntil };
                                    }
                                } catch (e) {}
                            }

                            if (a.type === 'brew') {
                                const brew = BREWS[a.brewId];
                                if (brew) {
                                    this.props.inventoryManager.addItem({ ...brew });
                                    try {
                                        const iconUrl = images[brew.icon] || null;
                                        this.triggerLootRadialArc({ type: 'potion', id: brew.id + '_' + Math.random(), icon: iconUrl, name: brew.name });
                                    } catch (e) {}
                                }
                            }

                            let updateText = '';
                            if (a.type === 'sharpen_blades') {
                                let cuttingWeapons = [];
                                if (this.props.inventoryManager && Array.isArray(this.props.inventoryManager.inventory)) {
                                    this.props.inventoryManager.inventory.forEach(item => {
                                        if (item && item.type === 'weapon' && item.subtype === 'cutting' && !item.name.includes('(Sharpened)')) {
                                            cuttingWeapons.push(item);
                                        }
                                    });
                                }
                                if (Array.isArray(member.inventory)) {
                                    member.inventory.forEach(item => {
                                        if (item && item.type === 'weapon' && item.subtype === 'cutting' && !item.name.includes('(Sharpened)')) {
                                            cuttingWeapons.push(item);
                                        }
                                    });
                                }

                                if (cuttingWeapons.length === 0) {
                                    updateText = `${member.name} has finished sharpening blades, but no valid cutting weapons were present in the inventory when the process completed.`;
                                } else {
                                    const details = cuttingWeapons.map(item => {
                                        const bonus = Math.round(item.damage * 0.8);
                                        if (markNotified) {
                                            item.damage += bonus;
                                            item.name = `${item.name} (Sharpened)`;
                                        }
                                        return `Applied +${bonus} damage to "${item.name}${markNotified ? '' : ' (Sharpened)'}"`;
                                    }).join(', ');
                                    updateText = `${member.name} finished sharpening blades! ${details}`;
                                }
                            } else {
                                updateText = isRitual
                                    ? `${member.name}'s ritual "${a.name}" is complete and ready to use`
                                    : (a.type === 'compound'
                                        ? `${member.name} has finished mixing ${a.name.replace('Brewing: ', '')}!`
                                        : (a.type === 'brew'
                                            ? `${member.name} has finished brewing ${a.name.replace('Brewing: ', '')}!`
                                            : (a.type === 'inner_discipline'
                                                ? (a.category === 'chi'
                                                    ? `${member.name} has gathered a chi charge through ${a.name}`
                                                    : a.category === 'stance'
                                                        ? `${member.name} has trained ${a.name} stance`
                                                        : `${member.name} has completed ${a.name}`)
                                                : (a.type === 'acid_bomb'
                                        ? `🧪 ${member.name}'s Acid Bomb is ready to use in combat!`
                                        : (a.type === 'rat_agent'
                                            ? `🐀 ${member.name}'s Scrounging Rat has returned with ${10 * (a.rangerLevel || 1)} food! A patch of the dungeon has been revealed for 30 minutes.`
                                            : `${member.name} has finished ${a.name}`)))));
                            }
                            updates.push({
                                text: updateText,
                                owner: `${member.name}`,
                                actionType: a.type,
                                ritualKey: a.ritualKey || null
                            });
                            a.notified = true;
                            modified = true;
                        }
                    } else {
                        if (!a.notified) {
                            const isRitual = a.type === 'ritual';
                            if (isRitual) hasRitualUpdate = true;
                            let updateText = '';
                            if (a.type === 'sharpen_blades') {
                                let cuttingWeapons = [];
                                if (this.props.inventoryManager && Array.isArray(this.props.inventoryManager.inventory)) {
                                    this.props.inventoryManager.inventory.forEach(item => {
                                        if (item && item.type === 'weapon' && item.subtype === 'cutting' && !item.name.includes('(Sharpened)')) {
                                            cuttingWeapons.push(item);
                                        }
                                    });
                                }
                                if (Array.isArray(member.inventory)) {
                                    member.inventory.forEach(item => {
                                        if (item && item.type === 'weapon' && item.subtype === 'cutting' && !item.name.includes('(Sharpened)')) {
                                            cuttingWeapons.push(item);
                                        }
                                    });
                                }

                                if (cuttingWeapons.length === 0) {
                                    updateText = `${member.name} has finished sharpening blades, but no valid cutting weapons were present in the inventory when the process completed.`;
                                } else {
                                    const details = cuttingWeapons.map(item => {
                                        const bonus = Math.round(item.damage * 0.8);
                                        return `Applied +${bonus} damage to "${item.name} (Sharpened)"`;
                                    }).join(', ');
                                    updateText = `${member.name} finished sharpening blades! ${details}`;
                                }
                            } else {
                                updateText = isRitual
                                    ? `${member.name}'s ritual "${a.name}" is complete and ready to use`
                                    : (a.type === 'compound'
                                        ? `${member.name} has finished mixing ${a.name.replace('Brewing: ', '')}!`
                                        : (a.type === 'brew'
                                            ? `${member.name} has finished brewing ${a.name.replace('Brewing: ', '')}!`
                                            : (a.type === 'inner_discipline'
                                                ? (a.category === 'chi'
                                                    ? `${member.name} has gathered a chi charge through ${a.name}`
                                                    : a.category === 'stance'
                                                        ? `${member.name} has trained ${a.name} stance`
                                                        : `${member.name} has completed ${a.name}`)
                                                : (a.type === 'acid_bomb'
                                                    ? `🧪 ${member.name}'s Acid Bomb is ready to use in combat!`
                                                    : (a.type === 'rat_agent'
                                                        ? `🐀 ${member.name}'s Scrounging Rat has returned with ${10 * (a.rangerLevel || 1)} food!`
                                                        : `${member.name} has finished ${a.name}`))))); 
                            }
                            updates.push({
                                text: updateText,
                                owner: `${member.name}`,
                                actionType: a.type,
                                ritualKey: a.ritualKey || null
                            });
                        }
                    }
                }
            });

            // Check active training lock
            if (member.trainingActive) {
                const end = new Date(member.trainingActive.endDate);
                const now = new Date();
                if (end - now <= 0) {
                    const act = member.trainingActive;
                    
                    // Update training progress
                    member.trainingProgress = member.trainingProgress || { str: 0, dex: 0, fort: 0, int: 0 };
                    member.trainingProgress[act.stat] = (member.trainingProgress[act.stat] || 0) + act.delta;

                    let statGained = false;
                    const THRESHOLD = 10;
                    if (member.trainingProgress[act.stat] >= THRESHOLD) {
                        member.trainingProgress[act.stat] -= THRESHOLD;
                        member.stats[act.stat] = (member.stats[act.stat] || 1) + 1;
                        if (this.props.crewManager && typeof this.props.crewManager.computeDerivedStats === 'function') {
                            this.props.crewManager.computeDerivedStats(member);
                        }
                        statGained = true;
                    }

                    // Apply training effect flags if risk was triggered
                    if (act.riskTriggered) {
                        if (act.stat === 'str') member.trainingExhausted = true;
                        if (act.stat === 'dex') member.trainingHalfEndurance = true;
                        if (act.stat === 'fort') member.trainingBleedRisk = true;
                    }

                    // Save lastTrained timestamp so the 1-day cooldown starts from when training FINISHED
                    member.lastTrained = act.endDate;

                    const STAT_LABELS = { str: 'STR', dex: 'DEX', fort: 'FORT', int: 'INT' };
                    let message;
                    if (act.delta === 0) {
                        message = `${member.name} lost focus. No progress gained.`;
                    } else if (statGained) {
                        message = `✨ ${member.name} has finished training and gained +1 ${STAT_LABELS[act.stat]}!`;
                    } else {
                        message = `${member.name} has finished training and gained +${act.delta} ${STAT_LABELS[act.stat]} progress${act.riskTriggered ? ' (risk triggered!)' : ''}.`;
                    }

                    updates.push({
                        text: message,
                        owner: `${member.name}`,
                        actionType: 'training_complete'
                    });

                    // Clear trainingActive
                    delete member.trainingActive;
                    modified = true;
                    numeralUpdate = true;
                }
            }
        });

        // Check Scrounging Rat completion
        if (meta.scroungeActive) {
            const end = new Date(meta.scroungeActive.endDate);
            const now = new Date();
            if (end - now <= 0) {
                const yieldAmt = meta.scroungeActive.foodYield;
                meta.food = (typeof meta.food === 'number' ? meta.food : 0) + yieldAmt;
                updates.push({
                    text: `🐀 Scrounging Rat has retrieved +${yieldAmt} food!`,
                    actionType: 'scrounge_complete'
                });
                delete meta.scroungeActive;
                modified = true;
                numeralUpdate = true;
            }
        }

        // Check Tattoo Imprint completion
        (meta.crew || []).forEach(m => {
            if (!m || !m.tattooImprinting) return;
            const end = new Date(m.tattooImprinting.endDate);
            if (new Date() < end) return;

            m.tattoos = m.tattoos || [];
            m.tattoos.push({
                design: m.tattooImprinting.design,
                slot:   m.tattooImprinting.slot,
                appliedAt: new Date().toISOString(),
            });

            // Apply permanent stat boosts directly to member.stats
            const effect = TATTOO_DESIGNS[m.tattooImprinting.design]?.effect || {};
            if (!m.stats) m.stats = {};
            Object.entries(effect).forEach(([stat, delta]) => {
                if (typeof m.stats[stat] === 'number') {
                    m.stats[stat] += delta;
                } else {
                    m.stats[stat] = delta;
                }
            });
            // Recompute derived stats (atk, def, hp, etc.)
            try { if (this.props.crewManager && typeof this.props.crewManager.computeDerivedStats === 'function') this.props.crewManager.computeDerivedStats(m); } catch (e) {}

            const designName = TATTOO_DESIGNS[m.tattooImprinting.design]?.name || m.tattooImprinting.design;
            updates.push({
                text: `🔥 ${m.name}'s ${designName} tattoo is complete! Stats permanently boosted.`,
                actionType: 'tattoo_complete',
                owner: m.name,
            });

            delete m.tattooImprinting;
            modified = true;
            numeralUpdate = true;
        });

        // Check Fastidious Crow completion
        if (meta.scoutActive && !meta.scoutActive.scoutedArea) {
            const end = new Date(meta.scoutActive.endDate);
            const now = new Date();
            if (end - now <= 0) {
                const level = meta.scoutActive.level || 1;
                const area = this.pickRandomBoardForScout();
                if (area) {
                    const revealUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
                    meta.scoutActive.scoutedArea = {
                        levelId: area.levelId,
                        boardIndex: area.boardIndex,
                        startRow: area.startRow,
                        startCol: area.startCol,
                        revealUntil: revealUntil
                    };
                }
                let goldAmt = 0;
                if (level === 1) {
                    goldAmt = Math.floor(Math.random() * (20 - 5 + 1)) + 5;
                } else if (level === 2) {
                    goldAmt = Math.floor(Math.random() * (80 - 25 + 1)) + 25;
                }
                if (goldAmt > 0 && this.props.inventoryManager) {
                    this.props.inventoryManager.addCurrency({ type: 'gold', amount: goldAmt });
                }
                let shardMsg = "";
                if (level === 2 && Math.random() < 0.30) {
                    const shardPool = ['ruby_shards', 'sapphire_shards', 'amber_shards'];
                    const chosenShard = shardPool[Math.floor(Math.random() * shardPool.length)];
                    const count = Math.floor(Math.random() * 3) + 1;
                    if (this.props.inventoryManager) {
                        for (let i = 0; i < count; i++) {
                            this.props.inventoryManager.addItemsByName([chosenShard]);
                        }
                    }
                    shardMsg = ` and ${count} ${chosenShard.replace('_', ' ')}`;
                }
                const cdHours = level === 1 ? 6 : 3;
                const cooldownUntil = new Date(now.getTime() + cdHours * 60 * 60 * 1000).toISOString();
                meta.scoutActive.cooldownUntil = cooldownUntil;
                const boardNameMsg = area ? `Level ${area.levelId}, Board ${area.boardIndex + 1}` : "a distant board";
                updates.push({
                    text: `🦅 Fastidious Crow has finished scouting ${boardNameMsg}! Retrieved ${goldAmt} gold${shardMsg}.`,
                    actionType: 'scout_complete'
                });
                modified = true;
                numeralUpdate = true;
            }
        }

        if (modified) {
            meta.crew = crew;
            storeMeta(meta);
            if (this.props?.crewManager) {
                this.props.crewManager.crew = crew;
            }
            if (typeof this.props?.saveUserData === 'function') {
                this.props.saveUserData();
            }
        }

        return { updates, modified, numeralUpdate, hasRitualUpdate };
    }
    getRotateDegreesLeft = (percentage) => {
        let deg = Math.floor(percentage / 100 * 360);
        return deg;
    }

    getRotateDegreesRight = (percentage) => {
        let deg = Math.floor(percentage / 100 * 360);
        if (percentage >= 50) deg = 180;
        return deg;
    }
    realTimeSpecialActionCheckInterval = null;
    prepCompleteTimeout = null;
    // Canvas-based cooldown overlay for high-frequency updates
    cooldownCanvas = null;
    cooldownAnimationFrame = null;
    constructor(props){
        super(props)
        this._isMounted = true;
        const origSetState = this.setState;
        this.setState = (state, callback) => {
            if (!this._isMounted) return;
            origSetState.call(this, state, callback);
        };
        this.monsterBattleComponentRef = React.createRef()
        this.devConsoleInputRef = React.createRef()
        this.devConsoleOutputRef = React.createRef()
        this.playerFloatRef = React.createRef()
        // internal registry of active placeholders (id -> { el, start:Date, end:Date })
        this._placeholderRegistry = new Map();
        this._nextPlaceholderId = 1;
        this._lastDrawTimestamp = 0;
        this._fpsLimit = 30; // cap draw loop to 30fps
        this._breadcrumbs = new Map();
        this._breadcrumbSeq = 0;
        this._monsterSightings = new Map();
        this._wasPoiPanelExpanded = !!((getMeta() || {}).camping);
        this.state = {
            tileSize: 0,
            boardSize: 0,
            tiles: [],
            overlayTiles: [],
            spawn: {},
            showMessage: false,
            messageToDisplay: '',
            showSaving: true,
            intervalId: null,
            showDarkMask: false,
            currentBoard: '',
            leftPanelExpanded: false,
            rightPanelExpanded: false,
            poiPanelExpanded: !((getMeta() || {}).camping),

            inventoryHoverMatrix: {},
            crewHoverMatrix: {},
            selectedCrewMember: {},
            showDebugLevelUpScreen: false,
            debugLevelUpQueue: [],
            pending: null,
            showInventoryPopup: false,
            isInventoryExpanded: false,
            activeInventoryItem: null,
            keysLocked: false,
            portalTransitionClass: '',
            inMonsterBattle: false,
            inTowerSiege: false,
            monster: null,
            crewSize: 0,
            paused: false,
            minimap: [],
            minimapZoomedTile: null,
            minimapMarkerTrayOpen: false,
            minimapPlaceMapMarkerStarted: false,
            minimapIndicators: [],
            overlayHoveredTileId: null,
            mapMarkerInput: React.createRef(),
            markerSelectVal: React.createRef(),
            levelTracker: [
                {id: 2, active: false},
                {id: 1, active: false},
                {id: 0, active: true},
                {id: -1, active: false},
                {id: -2, active: false},
            ],
            markerName: '',
            markerType: '',
            descriptionText: '',
            hoveredInventoryItem: null,
            hoveredSlotInfo: null,
            actionsTrayExpanded: false,
            actionMenuExpanded: '',
            modalType: '',
            showModal: false,
            updates: [],
            timeToRespawn: '',
            itemTimeToRespawn: '',
            respawnUpdateInterval: null,
            monsterBattleTileId: null,
            setMemberRitualOptions: null,
            ritualWrecked: false,
            shiftDown: false,
            showFullScreen: false
            , showCardDuelModal: false
            , cardDuelTileId: null
            , showCardForge: false
            , forgeHighlightMonsterType: null
            , toastMessage: null
            , showSaveIndicator: false
            , saveIndicatorText: ''
            , mapZoomedLevelId: null
            , mapUnzoomingLevelId: null
            , mapRevealAfterUnzoom: false
            , mapPendingZoomLevelId: null
            , mapSelectedLevelId: null
            , mapBoardDetailStage: null
            , mapBoardDetailBoardIndex: null
            // floating player animation state
            , playerFloatVisible: false
            , playerFloatStyle: { left: 0, top: 0, transform: 'translate3d(0px, 0px, 0px)' }
            , playerAnimating: false
            , animOriginIndex: null
            , animDestIndex: null
            , devConsoleOpen: false
            , devConsoleInput: ''
            , devConsoleOutput: []
            , showTeleportPopup: false
            , activeChestLoot: []
            , chestLootVisible: false
            , chestLootFadeOut: false
            , chestLootStyle: null
            , showQuestsPopup: false
            , showCampPopup: false
            , campWarningMessage: null
            , showSkillTreePopup: false
            , selectedSkillTreeCrewMember: null
            , showFoodPrepOverlay: false
            , showSpellsOverlay: false
            , showMapOverlay: false
            , showTrainingOverlay: false
            , trainingResults: {} // { memberId: { stat, delta, risk, message } }
            , showCodex: false
            , codexEntry: null  // { tab, search, entryId } — set when opening codex from a POI card
            , noCodexEntry: false // show "no entry" popup
            , activeNarrativeSequence: null
            , showNarrativeOverlay: false
            , showAmbushPopup: false
            , ambushMonster: null
            , showTrapPopup: false
            , trapResults: null
            , showTattooOverlay: false
            , tattooOverlayMemberId: null
            , tattooSelectedSlot: null
            , tattooSelectedDesign: null
            , showShrineOverlay: false
            , shrineData: null
            , inShrineScreen: false
            , contextMenu: { visible: false, x: 0, y: 0, slotName: '' }
        }
    // Native browser tooltip will be used for death-tracker; no custom tooltip state required.
        // Track timers/intervals created by this component so we can clear on unmount
        this._timers = [];
        this._intervals = [];
        this._movementQueue = [];
        this._processingQueuedMove = false;
        this._setTimeout = (fn, t) => { const id = setTimeout(fn, t); try { this._timers.push(id); } catch(e){}; return id };
        
        this._setInterval = (fn, t) => { const id = setInterval(fn, t); try { this._intervals.push(id); } catch(e){}; return id };
    }

    // Reverted to native browser tooltip; no custom tooltip lifecycle is necessary.
    
        componentDidUpdate(prevProps, prevState) {
            // Auto-scroll dev console output to bottom when new output is added
            if (
                this.state.devConsoleOpen &&
                this.devConsoleOutputRef &&
                this.devConsoleOutputRef.current &&
                prevState.devConsoleOutput !== this.state.devConsoleOutput
            ) {
                // Defer scroll to ensure DOM is updated with new output
                setTimeout(() => {
                    const outputDiv = this.devConsoleOutputRef.current;
                    if (outputDiv) {
                        outputDiv.scrollTop = outputDiv.scrollHeight;
                    }
                    if (
                        this.state.devConsoleOpen &&
                        this.devConsoleOutputRef &&
                        this.devConsoleOutputRef.current &&
                        prevState.devConsoleOutput !== this.state.devConsoleOutput
                    ) {
                        // Defer scroll to ensure DOM is updated with new output
                        setTimeout(() => {
                            const outputDiv = this.devConsoleOutputRef.current;
                            if (outputDiv && outputDiv.lastElementChild) {
                                outputDiv.lastElementChild.scrollIntoView({ behavior: 'auto' });
                            }
                        }, 0);
                    }
                }, 0);
            }
            if (this.state.inMonsterBattle && !prevState.inMonsterBattle) {
                this.wireMonsterBattleRefToWizardAI();
            }
    }
    UNSAFE_componentWillMount(){
        let tileSize = this.getTileSize(),
            boardSize = tileSize*15;
        this.initializeListeners();
        // this.startSaveInterval();
        if(this.props.mapMaker) this.props.mapMaker.initializeTiles();
        let arr = []
        for(let i = 0; i < 9; i++){
            arr.push([])
        }
        const meta = getMeta();
        // meta.crew[0].stats.hp = 1000;
        // remove this after debugging ^

        // Restore persisted combat speed for dungeon battles.
        if (meta && this.props.combatManager && INTERVALS.includes(meta.combatSpeed)) {
            if (typeof this.props.combatManager.updateAllFightIntervals === 'function') {
                this.props.combatManager.updateAllFightIntervals(meta.combatSpeed);
            } else {
                this.props.combatManager.FIGHT_INTERVAL = meta.combatSpeed;
            }
        }

        // Initialize crew-level resource stats if not yet set
        if (meta) {
            let metaDirty = false;
            if (typeof meta.food !== 'number') { meta.food = 55; metaDirty = true; }
            if (typeof meta.resolve !== 'number') { meta.resolve = 100; metaDirty = true; }
            // DEV: force deathTracker to 2 on load so the next battle loss triggers final death
            // meta.deathTracker = 2; metaDirty = true;
            if (metaDirty) { try { storeMeta(meta); } catch(e) {} }
        }

        // const meta = null
        this.props.boardManager.establishAvailableItems(this.props.inventoryManager.items);

        // Rehydrate persisted minimap breadcrumb trail for this dungeon session.
        try { this.restoreBreadcrumbsFromMeta(meta); } catch (e) {}

        
        if(!meta || !meta.dungeonId){
            this.props.crewManager.initializeCrew(meta.crew);
            itemCleanup(null, meta.crew);
            if (this.props.inventoryManager && typeof this.props.inventoryManager.refreshWeaponStats === 'function') {
                this.props.crewManager.crew.forEach(m => { if (m && Array.isArray(m.inventory)) m.inventory = this.props.inventoryManager.refreshWeaponStats(m.inventory); });
            }
            this.loadNewDungeon();
        } else {
            this.props.inventoryManager.initializeItems(meta.inventory);

            // this.props.inventoryManager.addItem(this.props.inventoryManager.allItems['minor_key'])

            this.props.crewManager.initializeCrew(meta.crew);
            if (this.props.inventoryManager && typeof this.props.inventoryManager.refreshWeaponStats === 'function') {
                this.props.crewManager.crew.forEach(m => { if (m && Array.isArray(m.inventory)) m.inventory = this.props.inventoryManager.refreshWeaponStats(m.inventory); });
            }
            this.loadExistingDungeon(meta.dungeonId)
        }
        // Set selectedCrewMember synchronously here (crew was just initialized above).
        // loadExistingDungeon is async so its setState races; setting it now ensures the
        // crew panel renders immediately without waiting for the dungeon fetch to resolve.
        const metaObj = getMeta() || {};
        if (this.props.crewManager && Array.isArray(this.props.crewManager.crew) && this.props.crewManager.crew.length > 0) {
            const hasSelected = this.props.crewManager.crew.some(c => c.selected);
            if (!hasSelected) {
                this.props.crewManager.crew[0].selected = true;
                metaObj.crew = this.props.crewManager.crew;
                storeMeta(metaObj);
            }
        }
        const initialSelectedCrewMember = (this.props.crewManager && this.props.crewManager.crew && this.props.crewManager.crew.find(c => c.selected))
            || (this.props.crewManager && this.props.crewManager.crew && this.props.crewManager.crew[0])
            || (metaObj && metaObj.crew && metaObj.crew.find(c => c.selected))
            || (metaObj && metaObj.crew && metaObj.crew[0])
            || {};
        const minimap = [];
        for(let i = 0; i<9; i++){
            minimap.push({active: false})
        }
        
        // Consolidated check: mark finished special actions available and collect updates
        const { updates, modified } = this.checkAndCollectFinishedSpecialActions({ markNotified: false }); // eslint-disable-line no-unused-vars
        const initialExpanded = initialSelectedCrewMember ? (Array.isArray(initialSelectedCrewMember.actionMenuTypeExpanded) ? initialSelectedCrewMember.actionMenuTypeExpanded : (initialSelectedCrewMember.actionMenuTypeExpanded ? [initialSelectedCrewMember.actionMenuTypeExpanded] : [])) : [];
        
        // Build pending level-up queue on load
        const pendingQueue = [];
        try {
            const crew = (this.props.crewManager && Array.isArray(this.props.crewManager.crew)) ? this.props.crewManager.crew : [];
            crew.forEach(member => {
                if (member && Array.isArray(member.pendingLevelUpPicks) && member.pendingLevelUpPicks.length > 0) {
                    member.pendingLevelUpPicks.forEach(lvl => {
                        pendingQueue.push({
                            crewMember: member,
                            fromLevel: lvl - 1,
                            toLevel: lvl
                        });
                    });
                }
            });
        } catch (e) {
            console.warn('DungeonPage: pending level-up check failed', e);
        }

        this.setState((state, props) => {
            return {
                tileSize,
                boardSize,
                leftPanelExpanded: (!meta || !meta.dungeonId) ? false : meta?.leftExpanded,
                rightPanelExpanded: (!meta || !meta.dungeonId) ? false : meta?.rightExpanded,
                // persist/rehydrate crew actions tray expanded state
                crewActionsTrayExpanded: meta?.crewActionsTrayExpanded || false,
                crewSize: meta.crew.length,
                minimap,
                updates,
                selectedCrewMember: initialSelectedCrewMember,
                actionsTrayExpanded: initialSelectedCrewMember ? initialSelectedCrewMember.actionsTrayExpanded : false,
                actionMenuTypeExpanded: initialExpanded,
                // Glyph builder state — which tier is open, and which spells the user has slotted so far
                glyphBuilderOpen: null,
                glyphBuilderSpells: [],
                // Compound Potions builder state — whether the panel is open, and which reagents are in the 3 slots
                compoundBuilderOpen: initialExpanded.includes('compound'),
                compoundBuilderSlots: [], // array of reagent IDs (max 3)
                // Brews builder state — whether the panel is open, and which ingredients are in the 2 slots
                brewBuilderOpen: initialExpanded.includes('brew'),
                brewBuilderSlots: [], // array of ingredient IDs (max 2)
                // Battle tactics builder state
                tacticsBuilderOpen: initialExpanded.includes('tactics'),
                // Inner Discipline (Monk) builder state
                innerDisciplineBuilderOpen: initialExpanded.includes('inner_discipline'),
                innerDisciplineSelected: null, // which disciplineKey is previewed
                innerDisciplineCategoryOpen: null, // which category submenu is expanded: 'stance' | 'spirit' | null
                // Do NOT open the modal at mount time — the CModal 'modal-open' body class
                // from an immediately-visible modal can persist and trap all clicks if a
                // second modal (quests popup) opens before CoreUI finishes the close animation.
                // The interval will show it once the dungeon is loaded.
                modalType: '',
                showModal: false,
                showDebugLevelUpScreen: pendingQueue.length > 0 ? true : false,
                debugLevelUpQueue: pendingQueue
            };
        }, () => {
            this.checkFoodExpiry();
        });
    }

    handleDeathTrackerChanged = (deaths) => {
        try {
            const meta = getMeta() || {};
            meta.deathTracker = deaths;
            storeMeta(meta);
            // trigger a re-render so UI elements that read meta will update
            this.forceUpdate();
        } catch (e) {
            console.warn('handleDeathTrackerChanged failed', e);
        }
    }

    // --- Card Duel modal helpers ---
    openCardDuel = (tileId) => {
        this.setState({ showCardDuelModal: true, cardDuelTileId: tileId, toastMessage: null });
    }

    closeCardDuel = () => {
        this.setState({ showCardDuelModal: false, cardDuelTileId: null });
    }

    handleCardDuelFinish = (result) => {
        try {
            if (this.state.isCardScrimmage) {
                this.setState({ toastMessage: `Scrimmage finished — Outcome: ${result && result.winner === 'player' ? 'Victory!' : 'Defeat'}` });
            } else {
                const isCombatLoss = this.state.cardDuelTileId === 'combat_loss';
                const meta = getMeta() || {};

                if (result && result.winner === 'player') {
                    if (isCombatLoss) {
                        // Player won the duel after losing combat: they avoid the death tracker!
                        this.setState({ toastMessage: 'Victory! You defeated the Reaper and avoided a death marker!' });
                        // Perform the respawn/restore immediately without incrementing deathTracker
                        this.battleOver('respawn');
                    } else {
                        // Player won the duel triggered by clicking an existing skull: remove one death marker
                        let deaths = meta.deathTracker || 0;
                        if (deaths > 0) {
                            deaths = deaths - 1;
                            meta.deathTracker = deaths;
                            storeMeta(meta);
                            this.handleDeathTrackerChanged(deaths);
                            this.setState({ toastMessage: 'Victory! One death marker removed.' });
                        }
                    }
                } else if (result && result.winner === 'reaper') {
                    if (isCombatLoss) {
                        // Player lost the duel after losing combat: they get a death tracker!
                        let deaths = (meta.deathTracker || 0) + 1;
                        meta.deathTracker = deaths;
                        storeMeta(meta);
                        this.handleDeathTrackerChanged(deaths);

                        if (deaths >= 3) {
                            // Trigger final death
                            this.triggerFinalDeath();
                        } else {
                            this.setState({ toastMessage: 'You lost the duel. 25% gold forfeit, and a death marker added.' });
                            this.battleOver('respawn');
                        }
                    } else {
                        // Player lost the duel triggered by clicking an existing skull: just tax gold
                        this.setState({ toastMessage: 'You lost the duel. 25% of your gold is forfeit.' });
                        if (this.props.saveUserData) this.props.saveUserData();
                    }
                }
            }
        } catch (e) {
            console.warn('handleCardDuelFinish failed', e);
        }
        this.setState({ isCardScrimmage: false });
        this.closeCardDuel();
        setTimeout(() => {
            this.setState({ toastMessage: null });
        }, 5000);
    }

    triggerFinalDeath = () => {
        const meta = getMeta() || {};
        try {
            if (meta.dungeonId) {
                deleteDungeonRequest(meta.dungeonId).catch(() => {});
            }
        } catch (e) {}

        if (this.props.boardManager && this.props.boardManager.dungeon) {
            this.props.boardManager.dungeon.id = null;
        }
        if (this.props.inventoryManager) {
            this.props.inventoryManager.inventory = [];
        }

        meta.dungeonId = null;
        meta.location = null;
        meta.inventory = { items: [], gold: 0, shimmering_dust: 0, totems: 0 };
        if (this.props.crewManager && Array.isArray(this.props.crewManager.crew)) {
            this.props.crewManager.crew.forEach(c => {
                if (c) {
                    c.hp = c.starting_hp || (c.stats ? c.stats.hp : 10);
                    c.dead = false;
                }
            });
            meta.crew = this.props.crewManager.crew;
            this.props.crewManager.initializeCrew(meta.crew);
        }
        meta.deathTracker = 0;
        storeMeta(meta);

        try {
            updateUserRequest(getUserId(), meta).catch(() => {});
        } catch (e) {}

        if (this.props.setNarrativeSequence) {
            this.props.setNarrativeSequence('death');
        }
        setTimeout(() => {
            window.location.href = '/death';
        }, 300);
    }

    preloadDungeonTiles() {
        try {
            // getTerrainSetForLevel returns an array of 16 webpack-resolved image URLs.
            // We pre-decode all 48 images (3 sets × 16 variants) so they are already in
            // the browser's decode cache when the board renders them.  The previous
            // implementation filtered Object.keys(images) for 'terrain_*' keys but those
            // are not exported as named keys — only as arrays via getTerrainSetForLevel —
            // so nothing was ever actually preloaded.
            const allSets = [
                images.getTerrainSetForLevel(0),  // base (stone)
                images.getTerrainSetForLevel(1),  // light (upper levels)
                images.getTerrainSetForLevel(-1), // dark (lower levels)
            ];
            allSets.forEach(set => {
                if (!Array.isArray(set)) return;
                set.forEach(src => {
                    if (!src) return;
                    const img = new Image();
                    img.src = typeof src === 'string' ? src : (src.default || '');
                });
            });
        } catch (e) {
            console.warn('Failed to preload dungeon tiles', e);
        }
    }

    // Preloads portrait / icon images for every tile visible on the current board
    // section. Called on plane entry and board transitions so textures are already
    // in the browser decode cache before the player walks close enough to see them,
    // eliminating the per-tile load hitch the user was experiencing.
    preloadBoardImages() {
        try {
            const bm = this.props.boardManager;
            if (!bm || !Array.isArray(bm.tiles)) return;
            const seen = new Set();
            bm.tiles.forEach(tile => {
                if (!tile) return;
                const key = tile.image || tile.icon || null;
                if (!key || seen.has(key)) return;
                seen.add(key);
                const src = images[key] || (typeof key === 'string' && key.includes('/') ? key : null);
                if (src) {
                    const img = new Image();
                    img.src = typeof src === 'string' ? src : (src.default || '');
                }
            });
        } catch (e) {
            // Non-critical — preload failure is intentionally silent
        }
    }

    // Schedules preloadBoardImages on the next idle animation frame so it never
    // blocks the movement animation that fired this turn.
    _schedulePreloadBoardImages() {
        if (this._preloadBoardImagesScheduled) return;
        this._preloadBoardImagesScheduled = true;
        requestAnimationFrame(() => {
            this._preloadBoardImagesScheduled = false;
            this.preloadBoardImages();
        });
    }

    triggerDebugLevelUp = () => {
        const selectedId = this.state.selectedCrewMember?.id;
        const member = (this.props.crewManager?.crew || []).find(c => c && (c.id === selectedId || c.selected));
        if (!member) {
            console.warn('[Console Command] No selected crew member found. Select one first.');
            return;
        }

        const fromLevel = typeof member.level === 'number' ? member.level : 0;
        
        try {
            this.props.crewManager.levelUp(member);
        } catch (e) {
            console.error('[Console Command] Failed to levelUp crew member', e);
            return;
        }

        const toLevel = member.level;
        this.setState({
            selectedCrewMember: { ...member },
            showDebugLevelUpScreen: true,
            debugLevelUpQueue: [{ crewMember: member, fromLevel, toLevel }]
        });
    }

    triggerNarrativeReset = () => {
        if (!this.props.boardManager) return;
        const bm = this.props.boardManager;
        
        let resetCount = 0;
        
        // 1. Reset tiles in bm.tiles
        if (bm.tiles) {
            Object.values(bm.tiles).forEach(tile => {
                if (tile && tile.contains && tile.contains.type === 'narrative_visited') {
                    tile.contains.type = 'narrative';
                    tile.image = 'narrative';
                    resetCount++;
                }
            });
        }
        
        // 2. Reset tiles in bm.currentBoard
        if (bm.currentBoard && bm.currentBoard.tiles) {
            Object.values(bm.currentBoard.tiles).forEach(tile => {
                if (tile && tile.contains && tile.contains.type === 'narrative_visited') {
                    tile.contains.type = 'narrative';
                    tile.image = 'narrative';
                }
            });
        }
        
        // 3. Reset tiles in bm.dungeon levels (persistent structure)
        if (bm.dungeon && bm.dungeon.levels) {
            bm.dungeon.levels.forEach(level => {
                ['front', 'back'].forEach(side => {
                    if (level[side] && level[side].miniboards) {
                        level[side].miniboards.forEach(b => {
                            if (b && b.tiles) {
                                Object.values(b.tiles).forEach(tile => {
                                    if (tile && tile.contains && tile.contains.type === 'narrative_visited') {
                                        tile.contains.type = 'narrative';
                                        tile.image = 'narrative';
                                    }
                                });
                            }
                        });
                    }
                });
            });
        }
        
        // 4. Update the save and redraw
        if (bm.updateDungeon) bm.updateDungeon(bm.dungeon);
        if (bm.refreshTiles) bm.refreshTiles();
        
        // Re-force update on DungeonPage to refresh UI components
        this.forceUpdate();
        
        console.log(`[Narrative Reset] Reset ${resetCount} narrative tiles to active.`);
    }

    // ── Tower Siege ──────────────────────────────────────────────────────────────
    triggerTowerSiege = () => {
        console.log('[TowerSiege] Initiating siege event...');
        if (!this.reduxCombatManager) {
            this.reduxCombatManager = new CombatManagerRedux();
        }
        this.setState({ inTowerSiege: true, keysLocked: true });
    }

    onSiegeComplete = () => {
        this.reduxCombatManager = null;
        this.setState({ inTowerSiege: false, keysLocked: false });
    }

    handleDebugLevelUpComplete = () => {
        const queue = this.state.debugLevelUpQueue || [];
        queue.forEach(entry => {
            try {
                if (entry && entry.crewMember) {
                    this.props.crewManager.clearLevelFlags(entry.crewMember);
                }
            } catch (e) {}
        });

        const selectedId = this.state.selectedCrewMember?.id;
        const updatedMember = (this.props.crewManager?.crew || []).find(c => c && c.id === selectedId);

        this.setState({
            showDebugLevelUpScreen: false,
            debugLevelUpQueue: [],
            selectedCrewMember: updatedMember ? { ...updatedMember } : this.state.selectedCrewMember
        });

        if (this.props.saveUserData) {
            try { this.props.saveUserData(); } catch (e) {}
        }
    }

    componentDidMount(){
        this.preloadDungeonTiles();
        // Migration: normalize legacy equippedSlot keys to 'pet'
        try {
            const metaForMigration = getMeta() || {};
            let migrated = false;
            (metaForMigration.crew || []).forEach(member => {
                (member.inventory || []).forEach(item => {
                    try {
                        if (item && item.equippedSlot === 'bottom-left') {
                            item.equippedSlot = 'pet';
                            migrated = true;
                        }
                        if (item && item.equippedBy === member.id && !['chest', 'head', 'boots', 'pet', 'right', 'left', 'ancillary-left', 'ancillary-right'].includes(item.equippedSlot)) {
                            let newSlot = null;
                            if (['helm', 'mask'].includes(item.subtype)) { newSlot = 'head'; }
                            else if (item.subtype === 'boots') { newSlot = 'boots'; }
                            else if (['armor', 'tabard'].includes(item.subtype)) { newSlot = 'chest'; }
                            else if (['charm', 'amulet', 'ring'].includes(item.subtype)) { newSlot = 'ancillary-left'; }
                            else if (['wand', 'staff', 'shield'].includes(item.subtype) || item.type === 'weapon') { newSlot = 'right'; }
                            
                            if (newSlot) {
                                item.equippedSlot = newSlot;
                                migrated = true;
                            }
                        }
                    } catch (e) {}
                });
            });
            // Also migrate the live crew state in memory so the UI updates immediately
            if (this.props.crewManager && Array.isArray(this.props.crewManager.crew)) {
                this.props.crewManager.crew.forEach(member => {
                    (member.inventory || []).forEach(item => {
                        try {
                            if (item && item.equippedSlot === 'bottom-left') {
                                item.equippedSlot = 'pet';
                            }
                            if (item && item.equippedBy === member.id && !['chest', 'head', 'boots', 'pet', 'right', 'left', 'ancillary-left', 'ancillary-right'].includes(item.equippedSlot)) {
                                let newSlot = null;
                                if (['helm', 'mask'].includes(item.subtype)) { newSlot = 'head'; }
                                else if (item.subtype === 'boots') { newSlot = 'boots'; }
                                else if (['armor', 'tabard'].includes(item.subtype)) { newSlot = 'chest'; }
                                else if (['charm', 'amulet', 'ring'].includes(item.subtype)) { newSlot = 'ancillary-left'; }
                                else if (['wand', 'staff', 'shield'].includes(item.subtype) || item.type === 'weapon') { newSlot = 'right'; }
                                
                                if (newSlot) {
                                    item.equippedSlot = newSlot;
                                }
                            }
                        } catch (e) {}
                    });
                });
                if (migrated) {
                    this.forceUpdate();
                }
            }
            if (migrated) {
                try { storeMeta(metaForMigration); } catch (e) {}
                try { updateUserRequest(getUserId(), metaForMigration).catch(()=>{}); } catch (e) {}
            }
        } catch (e) {}
        
        // One-time debug initializer removed
        // Real-time check for completed special actions
    this.realTimeSpecialActionCheckInterval = this._setInterval(() => {
        try {
            const nowSec = Math.floor(Date.now() / 1000);
            if (nowSec !== this._lastSecRender) {
                this._lastSecRender = nowSec;
                const meta = getMeta() || {};
                const crew = (this.props.crewManager && Array.isArray(this.props.crewManager.crew)) ? this.props.crewManager.crew : (meta.crew || []);
                const hasActiveTattoo = crew.some(m => m && m.tattooImprinting);
                if (this.state.showCampPopup || this.state.showMapOverlay || hasActiveTattoo) {
                    this.forceUpdate();
                }
                this.checkFoodExpiry();
            }
        } catch(e) {}
        // If quests popup is visible, or another modal is already open, suppress
        // additional modals so they don't stack (two CModal backdrops trap all clicks).
        try { if (this.state.showQuestsPopup || this.state.showModal) return; } catch(e) {}
            // Use centralized helper to find finished actions and optionally mark them notified
            const { updates, modified, numeralUpdate, hasRitualUpdate } = this.checkAndCollectFinishedSpecialActions({ markNotified: true });

            const meta = getMeta();

            if (updates.length > 0) {
                // Also update selectedCrewMember reference so numerals/counts update immediately
                let selectedCrewMember = this.state.selectedCrewMember;
                if (selectedCrewMember && selectedCrewMember.id) {
                    const updated = meta.crew.find(c => c.id === selectedCrewMember.id);
                    if (updated) selectedCrewMember = { ...updated };
                }
                // Use RitualComplete modal if the finished action was a ritual; otherwise PrepComplete
                const completionModalType = hasRitualUpdate ? 'RitualComplete' : 'PrepComplete';
                    this.setState({
                        updates,
                        modalType: completionModalType,
                        showModal: true,
                        selectedCrewMember,
                        numeralUpdate: (this.state.numeralUpdate || false) ? false : true // toggle dummy state
                    }, () => {
                        this.forceUpdate();
                    });
            } else if (modified || numeralUpdate) {
                // If no popup, still force update for numeral/count UI
                this.setState(prevState => {
                    let selectedCrewMember = prevState.selectedCrewMember;
                    if (selectedCrewMember && selectedCrewMember.id) {
                        const updated = meta.crew.find(c => c.id === selectedCrewMember.id);
                        if (updated) selectedCrewMember = { ...updated };
                    }
                    return { selectedCrewMember, numeralUpdate: (prevState.numeralUpdate || false) ? false : true };
                }, () => {
                    this.forceUpdate();
                });
            } else {
                // No updates/modified flags — but the cooldown visuals rely on frequent re-renders
                // (getActionCooldownPercentage uses current time). Only trigger a lightweight
                // re-render if any special action is currently in-progress to avoid needless work.
                const isCookingActive = meta.campCooking && (() => {
                    const start = new Date(meta.campCooking.startDate);
                    const end = new Date(meta.campCooking.endDate);
                    const now = new Date();
                    return now >= start && now < end;
                })();
                const anyActive = isCookingActive || (meta.crew && meta.crew.some(member => {
                    if (member.tattooImprinting && member.tattooImprinting.startDate && member.tattooImprinting.endDate) {
                        const start = new Date(member.tattooImprinting.startDate);
                        const end = new Date(member.tattooImprinting.endDate);
                        const now = new Date();
                        if (now >= start && now < end) return true;
                    }
                    return (member.specialActions || []).some(a => {
                        if (!a || !a.startDate || !a.endDate) return false;
                        const start = new Date(a.startDate);
                        const end = new Date(a.endDate);
                        const now = new Date();
                        return now >= start && now < end;
                    });
                }));
                if (anyActive) {
                    // ensure canvas draw loop is running — no setState needed, the rAF
                    // loop draws independently of React renders so triggering a re-render
                    // here only caused the placeholder refs to unmount/remount and flicker.
                        try {
                            if (!this.cooldownAnimationFrame) {
                                this.cooldownAnimationFrame = requestAnimationFrame(this.drawCooldowns);
                            }
                        } catch (e) {}
                } else {
                    // stop canvas loop if running and clear canvas
                    try {
                        if (this.cooldownAnimationFrame) {
                            cancelAnimationFrame(this.cooldownAnimationFrame);
                            this.cooldownAnimationFrame = null;
                        }
                        if (this.cooldownCanvas) {
                            const ctx = this.cooldownCanvas.getContext && this.cooldownCanvas.getContext('2d');
                            if (ctx) ctx.clearRect(0, 0, this.cooldownCanvas.width, this.cooldownCanvas.height);
                        }
                    } catch (e) {}
                }
            }

            // Check meta.campCooking for completion
            try {
                const cookMeta = getMeta() || {};
                if (cookMeta.campCooking && !cookMeta.campCooking.notified) {
                    const cookEnd = new Date(cookMeta.campCooking.endDate);
                    if (new Date() >= cookEnd) {
                        const { recipeName, foodYield } = cookMeta.campCooking;
                        cookMeta.food = (typeof cookMeta.food === 'number' ? cookMeta.food : 0) + foodYield;
                        cookMeta.campCooking.notified = true;
                        try { storeMeta(cookMeta); } catch(e) {}
                        try { updateUserRequest(getUserId(), cookMeta).catch(() => {}); } catch(e) {}
                        try { if (this.props.saveUserData) this.props.saveUserData(); } catch(e) {}
                        if (!this.state.showModal && !this.state.showQuestsPopup) {
                            this.setState({
                                updates: [{ text: `${recipeName} is ready! +${foodYield} food` }],
                                modalType: 'FoodComplete',
                                showModal: true,
                            });
                        }
                    }
                }
            } catch(e) {}
    }, 100);
        // Create a full-page canvas used to draw cooldown overlays at high frequency
        try {
            if (!this.cooldownCanvas) {
                this.cooldownCanvas = document.createElement('canvas');
                this.cooldownCanvas.id = 'cooldownCanvas';
                Object.assign(this.cooldownCanvas.style, {
                    position: 'fixed',
                    left: '0',
                    top: '0',
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: '9999'
                });
                document.body.appendChild(this.cooldownCanvas);
            }
        } catch (e) {
            console.warn('Could not create cooldown canvas', e);
        }
        // start the draw loop only if there are active cooldowns
        try {
            if (this.hasActiveCooldowns()) {
                this.cooldownAnimationFrame = requestAnimationFrame(this.drawCooldowns);
            }
        } catch (e) {}

        // If a camp was active before a reload, rehydrate the camping state so the
        // progress continues from the stored start/end times and the endCamp is scheduled.
        try {
            const meta = getMeta() || {};
            if (meta.camping && meta.campingEnd) {
                const now = new Date();
                const end = new Date(meta.campingEnd);
                const remaining = end - now;
                if (remaining > 0) {
                    // ensure continuous draw loop while camping
                    this._forcedDraw = true;
                    if (!this.cooldownAnimationFrame) this.cooldownAnimationFrame = requestAnimationFrame(this.drawCooldowns);
                    // lock movement hotkeys while rehydrated camping is active
                    try { this.setState({ keysLocked: true }); } catch(e) {}
                    // schedule endCamp after the remaining time
                    try { this.campTimeout = this._setTimeout(() => { try { this.endCamp(); } catch(e){ console.warn('endCamp timeout failed during rehydrate', e); } }, remaining + 200); } catch(e){}
                    // refresh player visuals and overlay tiles
                    try{ if (this.props.boardManager && typeof this.props.boardManager.placePlayer === 'function') this.props.boardManager.placePlayer(this.props.boardManager.playerTile.location); } catch(e){}
                    try{ this.setState({ overlayTiles: this.props.boardManager.overlayTiles }); } catch(e){}
                    try {
                        CampManager.startCampInterval(this);
                    } catch(e) { console.warn('failed to resume camp interval on mount', e); }
                } else {
                    // expired while offline / between reloads: end immediately
                    // Clear the stale camping flags from meta now so the player is not
                    // left locked on reload if endCamp throws (boardManager not ready yet).
                    try {
                        const staleMeta = getMeta() || {};
                        staleMeta.camping = false;
                        delete staleMeta.campingStart;
                        delete staleMeta.campingEnd;
                        storeMeta(staleMeta);
                    } catch(e) {}
                    // Unlock keys synchronously — endCamp may throw if boardManager isn't
                    // initialized yet (loadExistingDungeon is still in flight at this point).
                    try { this.setState({ keysLocked: false }); } catch(e) {}
                    try { this._setTimeout(() => { try { this.endCamp(); } catch(e){} }, 50); } catch(e){}
                }
            }
        } catch(e) {}
        
        this.props.boardManager.establishAddItemToInventoryCallback(this.addItemToInventory)
        this.props.boardManager.establishAddTreasureToInventoryCallback(this.addTreasureToInventory)
        this.props.boardManager.establishAddCurrencyToInventoryCallback(this.addCurrencyToInventory)
        this.props.boardManager.establishAddFoodToSuppliesCallback(this.addFoodToSupplies)
        this.props.boardManager.establishGetCrewCallback(() => this.props.crewManager?.crew || [])
        this.props.boardManager.establishSaveCrewCallback(() => {
            const meta = getMeta();
            meta.crew = this.props.crewManager.crew;
            storeMeta(meta);
            this.props.saveUserData();
            this.setState({ crew: [...this.props.crewManager.crew] });
        })
        this.props.boardManager.establishUpdateDungeonCallback(this.updateDungeon)
        this.props.boardManager.establishPendingCallback(this.setPending)
        this.props.boardManager.establishMessagingCallback(this.messaging)
        this.props.boardManager.establishRefreshCallback(this.refreshTiles)
        this.props.boardManager.establishTriggerMonsterBattleCallback(this.triggerMonsterBattle)
        this.props.boardManager.establishSetMonsterCallback(this.setMonster)
        this.props.boardManager.establishGetCurrentInventoryCallback(this.getCurrentInventory)
        this.props.boardManager.establishRitualEncounterCallback(this.triggerRitualEncounter)
        this.props.boardManager.establishNarrativeEncounterCallback(this.triggerNarrativeEncounter)
        this.props.boardManager.establishVendorEncounterCallback(this.triggerVendorEncounter)
        this.props.boardManager.establishShrineEncounterCallback(this.triggerShrineEncounter)
        this.props.boardManager.establishLoreTabletEncounterCallback(this.triggerLoreTabletEncounter)

        this.props.boardManager.establishBoardTransitionCallback(this.boardTransition)
        this.props.boardManager.establishLevelChangeCallback(this.handleLevelChange)

        this.props.boardManager.establishUseConsumableFromInventoryCallback(this.useConsumableFromInventory)
        // this.props.inventoryManager.establishUseConsumableFromInventoryCallback(this.useConsumableFromInventory)

        window.addEventListener('beforeunload', this.componentCleanup);
        // Ensure initial layout calculations run once on mount so the board renders
        // correctly without requiring a manual window resize.
        try {
            this.handleResize();
        } catch (e) {}
        
        // Initialize floating player avatar at current location
        try {
            const bm = this.props.boardManager;
            if (bm && bm.playerTile && bm.playerTile.location) {
                this.updateFloatingPlayerPosition(bm.playerTile.location);
            }
        } catch (e) {
            console.warn('Failed to initialize floating player on mount', e);
        }
        
    let respawnInterval = this._setInterval(()=>{
            // let meta = getMeta();
            // let respawn = new Date(meta.respawnDate);
            // if()
            // if()
            this.handleRespawnTime();
        }, 1000)
        this.setState({
            respawnUpdateInterval: respawnInterval
        })

        
        this.checkDungeon();

        if (typeof this.props.registerMessaging === 'function') {
            this.props.registerMessaging(this.displayMessage);
        }

        // Breadcrumb decay: prune stale trail entries every 60 seconds and re-render.
        this._breadcrumbDecayInterval = this._setInterval(this._pruneBreadcrumbs, 60 * 1000);

        // ── Console / keyboard commands for Level Up testing ─────────────────
        try {
            window.levelUp = this.triggerDebugLevelUp;
            window.lvlUp = this.triggerDebugLevelUp;

            // Tower Siege debug command — type 'siege' in the browser console
            window.siege = () => this.triggerTowerSiege();
            Object.defineProperty(window, 'tower_siege', {
                get: () => { this.triggerTowerSiege(); return 'Initiating Tower Siege...'; },
                configurable: true
            });
            
            Object.defineProperty(window, 'level_up', {
                get: () => { this.triggerDebugLevelUp(); return 'Leveling up selected crew member...'; },
                configurable: true
            });
            Object.defineProperty(window, 'lvl_up', {
                get: () => { this.triggerDebugLevelUp(); return 'Leveling up selected crew member...'; },
                configurable: true
            });
            Object.defineProperty(window, 'lvl up', {
                get: () => { this.triggerDebugLevelUp(); return 'Leveling up selected crew member...'; },
                configurable: true
            });
            Object.defineProperty(window, 'level up', {
                get: () => { this.triggerDebugLevelUp(); return 'Leveling up selected crew member...'; },
                configurable: true
            });

            // Narrative reset commands
            window.narrativeReset = this.triggerNarrativeReset;
            window.narrative_reset = this.triggerNarrativeReset;
            Object.defineProperty(window, 'narrative reset', {
                get: () => { this.triggerNarrativeReset(); return 'Resetting narrative encounter tiles...'; },
                configurable: true
            });
            Object.defineProperty(window, 'narrativeReset', {
                get: () => { this.triggerNarrativeReset(); return 'Resetting narrative encounter tiles...'; },
                configurable: true
            });
            Object.defineProperty(window, 'narrative_reset', {
                get: () => { this.triggerNarrativeReset(); return 'Resetting narrative encounter tiles...'; },
                configurable: true
            });

            this._typedKeys = '';
            this._debugKeydownListener = (e) => {
                if (!e || !e.key) return;
                if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                    return;
                }
                this._typedKeys += e.key.toLowerCase();
                if (this._typedKeys.endsWith('level up') || this._typedKeys.endsWith('lvl up') || this._typedKeys.endsWith('levelup') || this._typedKeys.endsWith('lvlup')) {
                    this.triggerDebugLevelUp();
                    this._typedKeys = '';
                } else if (this._typedKeys.endsWith('narrative reset') || this._typedKeys.endsWith('narrativereset') || this._typedKeys.endsWith('narrative_reset')) {
                    this.triggerNarrativeReset();
                    this._typedKeys = '';
                }
                if (this._typedKeys.length > 50) {
                    this._typedKeys = this._typedKeys.slice(-20);
                }
            };
            window.addEventListener('keydown', this._debugKeydownListener);
        } catch (e) {}
    }

    getScroungingRatLevel = () => {
        const meta = getMeta() || {};
        const crew = meta.crew || [];
        let maxLvl = 0;
        crew.forEach(m => {
            if (m && !m.dead && ((m.type || '').toLowerCase() === 'ranger' || (m.image || '').toLowerCase() === 'ranger') && m.globalSkills) {
                const skill = m.globalSkills.find(s => (typeof s === 'string' ? s : s.key) === 'scrounging_rat');
                if (skill) {
                    const lvl = typeof skill === 'string' ? 1 : (skill.level || 1);
                    if (lvl > maxLvl) maxLvl = lvl;
                }
            }
        });
        return maxLvl;
    }

    getFastidiousCrowLevel = () => {
        const meta = getMeta() || {};
        const crew = meta.crew || [];
        let maxLvl = 0;
        crew.forEach(m => {
            if (m && !m.dead && ((m.type || '').toLowerCase() === 'ranger' || (m.image || '').toLowerCase() === 'ranger') && m.globalSkills) {
                const skill = m.globalSkills.find(s => (typeof s === 'string' ? s : s.key) === 'fastidious_crow');
                if (skill) {
                    const lvl = typeof skill === 'string' ? 1 : (skill.level || 1);
                    if (lvl > maxLvl) maxLvl = lvl;
                }
            }
        });
        return maxLvl;
    }

    getKeenEyeLevel = () => {
        const meta = getMeta() || {};
        const crew = meta.crew || [];
        let maxLvl = 0;
        crew.forEach(m => {
            if (m && !m.dead && ((m.type || '').toLowerCase() === 'ranger' || (m.image || '').toLowerCase() === 'ranger') && m.globalSkills) {
                const skill = m.globalSkills.find(s => (typeof s === 'string' ? s : s.key) === 'keen_eye');
                if (skill) {
                    const lvl = typeof skill === 'string' ? 1 : (skill.level || 1);
                    if (lvl > maxLvl) maxLvl = lvl;
                }
            }
        });
        return maxLvl;
    }

    isScroungeActive = () => {
        const meta = getMeta() || {};
        if (meta.scroungeActive) {
            const now = new Date();
            const end = new Date(meta.scroungeActive.endDate);
            return now < end;
        }
        return false;
    }

    getScroungeButtonLabel = () => {
        const meta = getMeta() || {};
        if (meta.scroungeActive) {
            const now = new Date();
            const end = new Date(meta.scroungeActive.endDate);
            const diff = end - now;
            if (diff > 0) {
                const hrs = Math.floor(diff / 3600000);
                const mins = Math.floor((diff % 3600000) / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                const pad = (n) => String(n).padStart(2, '0');
                return `Scrounging... (${pad(hrs)}:${pad(mins)}:${pad(secs)})`;
            }
        }
        return "Scrounge for food";
    }

    handleScroungeForFood = () => {
        const level = this.getScroungingRatLevel();
        if (level <= 0 || this.isScroungeActive()) return;
        
        let minFood = 15, maxFood = 30, durationHrs = 3;
        if (level === 2) {
            minFood = 30; maxFood = 50; durationHrs = 2;
        } else if (level === 3) {
            minFood = 50; maxFood = 80; durationHrs = 1;
        }
        
        const foodYield = Math.floor(Math.random() * (maxFood - minFood + 1)) + minFood;
        
        const now = new Date();
        const endDate = new Date(now.getTime() + durationHrs * 60 * 60 * 1000);
        
        const meta = getMeta() || {};
        meta.scroungeActive = {
            startDate: now.toISOString(),
            endDate: endDate.toISOString(),
            foodYield,
            level
        };
        storeMeta(meta);
        
        this.displayMessage("🐀 You send the Scrounging Rat to forage for food...");
        this.setState({ numeralUpdate: !this.state.numeralUpdate });
        if (typeof this.props.saveUserData === 'function') {
            this.props.saveUserData();
        }
    }

    handleImprintTattoo = () => {
        const { tattooOverlayMemberId, tattooSelectedSlot, tattooSelectedDesign } = this.state;
        if (!tattooSelectedSlot || !tattooSelectedDesign) return;

        const member = (this.props.crewManager && Array.isArray(this.props.crewManager.crew))
            ? this.props.crewManager.crew.find(m => m && m.id === tattooOverlayMemberId)
            : null;
        if (!member) return;

        const tattoos = member.tattoos || [];
        const tattooIndex = tattoos.length; // 0-based → duration table
        if (tattooIndex >= 8) return;

        // Check slot not already occupied
        if (tattoos.some(t => t.slot === tattooSelectedSlot)) {
            this.displayMessage('That body location already has a tattoo!');
            return;
        }

        const durationMs = TATTOO_IMPRINT_DURATIONS_MS[tattooIndex] || TATTOO_IMPRINT_DURATIONS_MS[0];
        const now = new Date();

        member.tattooImprinting = {
            design: tattooSelectedDesign,
            slot: tattooSelectedSlot,
            index: tattooIndex,
            startDate: now.toISOString(),
            endDate: new Date(now.getTime() + durationMs).toISOString(),
        };

        const meta = getMeta() || {};
        meta.crew = this.props.crewManager.crew;
        storeMeta(meta);
        if (typeof this.props.saveUserData === 'function') this.props.saveUserData();

        const designName = TATTOO_DESIGNS[tattooSelectedDesign]?.name || tattooSelectedDesign;
        const slotName = TATTOO_SLOT_LABELS[tattooSelectedSlot] || tattooSelectedSlot;
        this.displayMessage(`🫡 ${member.name} begins imprinting ${designName} on their ${slotName}...`);

        this.setState({
            showTattooOverlay: false,
            tattooOverlayMemberId: null,
            tattooSelectedSlot: null,
            tattooSelectedDesign: null,
            selectedCrewMember: { ...member },
            numeralUpdate: !this.state.numeralUpdate,
        });
    }

    getTattooImprintLabel = (member) => {
        if (!member || !member.tattooImprinting) return null;
        const end = new Date(member.tattooImprinting.endDate);
        const diff = end - new Date();
        if (diff <= 0) return 'Finishing...';
        return 'Imprinting...';
    }

    pickRandomBoardForScout = () => {
        try {
            const dungeon = this.props?.boardManager?.dungeon;
            if (!dungeon || !Array.isArray(dungeon.levels)) return null;
            
            const candidateBoards = [];
            dungeon.levels.forEach(level => {
                if (level && level.front && Array.isArray(level.front.miniboards)) {
                    level.front.miniboards.forEach((board, idx) => {
                        candidateBoards.push({ levelId: level.id, boardIndex: idx });
                    });
                }
            });
            
            if (candidateBoards.length === 0) return null;
            const chosen = candidateBoards[Math.floor(Math.random() * candidateBoards.length)];
            
            const startRow = Math.floor(Math.random() * 6) + 15; // 15 to 20
            const startCol = Math.floor(Math.random() * 6) + 15; // 15 to 20
            
            return {
                levelId: chosen.levelId,
                boardIndex: chosen.boardIndex,
                startRow,
                startCol
            };
        } catch (e) {
            console.warn('Failed to pick random board for scout', e);
            return null;
        }
    }

    handleSendScoutCrow = () => {
        const level = this.getFastidiousCrowLevel();
        if (level <= 0) return;
        
        const now = new Date();
        const durationMin = 20; // 20 minutes
        const endDate = new Date(now.getTime() + durationMin * 60 * 1000);
        
        const meta = getMeta() || {};
        meta.scoutActive = {
            startDate: now.toISOString(),
            endDate: endDate.toISOString(),
            level,
            scoutedArea: null,
            cooldownUntil: null
        };
        storeMeta(meta);
        
        this.displayMessage("🦅 You send the Fastidious Crow to scout the dungeon...");
        this.setState({ numeralUpdate: !this.state.numeralUpdate });
        if (typeof this.props.saveUserData === 'function') {
            this.props.saveUserData();
        }
    }

    // Compute pixel position (left, top) for a tile index within the board
    getPixelForIndex = (index) => {
        const tileSize = this.state.tileSize || 0;
        const col = index % 15;
        const row = Math.floor(index / 15);
        return { left: col * tileSize, top: row * tileSize };
    }

    // Position the floating player avatar at the given coordinates without animation
    updateFloatingPlayerPosition = (coords, retryCount = 0) => {
        try {
            if (!coords) return;
            if ((this.state.tileSize || 0) <= 0) {
                if (retryCount < 8) {
                    this._setTimeout(() => this.updateFloatingPlayerPosition(coords, retryCount + 1), 16);
                }
                return;
            }

            const bm = this.props.boardManager;
            const index = bm.getIndexFromCoordinates(coords);
            const pixel = this.getPixelForIndex(index);

            // Get appropriate player image (camp or avatar)
            let meta = {};
            try { meta = getMeta() || {}; } catch (e) { meta = {}; }
            const playerImgKey = (meta && meta.camping) ? 'camp' : 'avatar';

            // Position absolutely within the board wrapper (no need for viewport rect calculation)
            this.setState({
                playerFloatVisible: true,
                playerFloatStyle: {
                    left: pixel.left,
                    top: pixel.top,
                    transform: 'translate3d(0px, 0px, 0px)',
                    backgroundImage: `url(${images[playerImgKey]})`
                }
            });
        } catch (e) {
            console.warn('updateFloatingPlayerPosition failed', e);
        }
    }

    enqueueDirectionalMove = (direction) => {
        if (!direction) return;
        if (this.state.keysLocked || this.state.inMonsterBattle) return;
        if (!Array.isArray(this._movementQueue)) this._movementQueue = [];
        // Cap pending buffered input to 3 queued moves.
        if (this._movementQueue.length >= 3) return;
        this._movementQueue.push(direction);
        if (!this.state.playerAnimating && !this._processingQueuedMove) {
            this.processMovementQueue();
        }
    }

    processMovementQueue = () => {
        if (this._processingQueuedMove) return;
        if (this.state.playerAnimating || this.state.keysLocked || this.state.inMonsterBattle) return;
        const nextDirection = this._movementQueue.shift();
        if (!nextDirection) return;
        this._processingQueuedMove = true;
        this.handleDirectionalMove(nextDirection, { fromQueue: true });
    }

    resolveQueuedMovement = (didMove) => {
        this._processingQueuedMove = false;
        if (!didMove || this.state.keysLocked || this.state.inMonsterBattle) {
            // Stop queue processing if the queued step was blocked/invalid or control is locked.
            this._movementQueue = [];
            return;
        }
        if (this._movementQueue.length > 0) {
            this.processMovementQueue();
        }
    }

    // High-level move handler that performs a smooth single-stage tween for within-board moves.
    handleDirectionalMove = (direction, options = {}) => {
    const { fromQueue = false } = options;
    const TOTAL_MOVE_MS = 35;
    const BUFFER_MS = 2;
        try {
            // Ignore fresh movement input while a tween is still settling.
            // Overlapping tweens can make the avatar appear to overshoot then snap back.
            if (this.state.playerAnimating) {
                if (fromQueue) this._processingQueuedMove = false;
                return;
            }

            const bm = this.props.boardManager;
            const curCoords = bm.playerTile.location;
            // detect board-edge moves and fall back to immediate boardManager methods
            if (direction === 'up' && curCoords[0] === 15) {
                const before = [...bm.playerTile.location];
                bm.moveUp();
                const moved = bm.playerTile.location[0] !== before[0] || bm.playerTile.location[1] !== before[1];
                this.setState({ tiles: bm.tiles, overlayTiles: bm.overlayTiles }, () => {
                    try { this.updateFloatingPlayerPosition(bm.playerTile.location); } catch (e) {}
                    if (moved) this.recordBreadcrumb();
                    const playerIdx = bm.getIndexFromCoordinates(bm.playerTile.location);
                    const currentTile = bm.tiles[playerIdx];
                    const ctype = currentTile && currentTile.contains && (currentTile.contains.type || currentTile.contains);
                    if (ctype === 'dungeon_portal' || ctype === 'dungeon portal') {
                        this.executePortalTeleport(currentTile);
                    } else {
                        this.resolveQueuedMovement(moved);
                    }
                });
                return;
            }
            if (direction === 'down' && curCoords[0] === 29) {
                const before = [...bm.playerTile.location];
                bm.moveDown();
                const moved = bm.playerTile.location[0] !== before[0] || bm.playerTile.location[1] !== before[1];
                this.setState({ tiles: bm.tiles, overlayTiles: bm.overlayTiles }, () => {
                    try { this.updateFloatingPlayerPosition(bm.playerTile.location); } catch (e) {}
                    if (moved) this.recordBreadcrumb();
                    const playerIdx = bm.getIndexFromCoordinates(bm.playerTile.location);
                    const currentTile = bm.tiles[playerIdx];
                    const ctype = currentTile && currentTile.contains && (currentTile.contains.type || currentTile.contains);
                    if (ctype === 'dungeon_portal' || ctype === 'dungeon portal') {
                        this.executePortalTeleport(currentTile);
                    } else {
                        this.resolveQueuedMovement(moved);
                    }
                });
                return;
            }
            if (direction === 'left' && curCoords[1] === 15) {
                const before = [...bm.playerTile.location];
                bm.moveLeft();
                const moved = bm.playerTile.location[0] !== before[0] || bm.playerTile.location[1] !== before[1];
                this.setState({ tiles: bm.tiles, overlayTiles: bm.overlayTiles }, () => {
                    try { this.updateFloatingPlayerPosition(bm.playerTile.location); } catch (e) {}
                    if (moved) this.recordBreadcrumb();
                    const playerIdx = bm.getIndexFromCoordinates(bm.playerTile.location);
                    const currentTile = bm.tiles[playerIdx];
                    const ctype = currentTile && currentTile.contains && (currentTile.contains.type || currentTile.contains);
                    if (ctype === 'dungeon_portal' || ctype === 'dungeon portal') {
                        this.executePortalTeleport(currentTile);
                    } else {
                        this.resolveQueuedMovement(moved);
                    }
                });
                return;
            }
            if (direction === 'right' && curCoords[1] === 29) {
                const before = [...bm.playerTile.location];
                bm.moveRight();
                const moved = bm.playerTile.location[0] !== before[0] || bm.playerTile.location[1] !== before[1];
                this.setState({ tiles: bm.tiles, overlayTiles: bm.overlayTiles }, () => {
                    try { this.updateFloatingPlayerPosition(bm.playerTile.location); } catch (e) {}
                    if (moved) this.recordBreadcrumb();
                    const playerIdx = bm.getIndexFromCoordinates(bm.playerTile.location);
                    const currentTile = bm.tiles[playerIdx];
                    const ctype = currentTile && currentTile.contains && (currentTile.contains.type || currentTile.contains);
                    if (ctype === 'dungeon_portal' || ctype === 'dungeon portal') {
                        this.executePortalTeleport(currentTile);
                    } else {
                        this.resolveQueuedMovement(moved);
                    }
                });
                return;
            }

            // compute destination coordinates (mirror of BoardManager.move switch)
            let destCoords = [curCoords[0], curCoords[1]];
            switch (direction) {
                case 'up': destCoords = [curCoords[0] - 1, curCoords[1]]; break;
                case 'down': destCoords = [curCoords[0] + 1, curCoords[1]]; break;
                case 'left': destCoords = [curCoords[0], curCoords[1] - 1]; break;
                case 'right': destCoords = [curCoords[0], curCoords[1] + 1]; break;
                default: break;
            }

            const originCoords = [curCoords[0], curCoords[1]];
            const originIndex = bm.getIndexFromCoordinates(curCoords);
            const destIndex = bm.getIndexFromCoordinates(destCoords);
            const originPixel = this.getPixelForIndex(originIndex);
            const destPixel = this.getPixelForIndex(destIndex);

            // Choose image for floating player (camp or avatar)
            try { getMeta(); } catch (e) { /* ignore */ }

            // Apply logical move first, then animate overlay from old world position to new one.
            // Set _batchingWithAnimation so refreshTiles (called synchronously inside
            // bm.move* via checkAdjacency) skips its own setState — we'll include tiles
            // in the animation setState below, merging both into a single render cycle.
            this._batchingWithAnimation = true;
            switch (direction) {
                case 'up': bm.moveUp(); break;
                case 'down': bm.moveDown(); break;
                case 'left': bm.moveLeft(); break;
                case 'right': bm.moveRight(); break;
                default: break;
            }
            this._batchingWithAnimation = false;

            const playerMoved = bm.playerTile.location[0] !== originCoords[0] || bm.playerTile.location[1] !== originCoords[1];
            
            let ambushTriggered = false;
            let ambushMonster = null;
            if (playerMoved) {
                let destTileObj = bm.tiles[destIndex];
                if (destTileObj && destTileObj.contains && destTileObj.contains.type === 'obscured_space') {
                    // Check if an ambush was triggered within the last 2 minutes (120,000 ms)
                    let baseAmbushChance = 0.3;
                    try {
                        const lastAmbushTime = sessionStorage.getItem('lastObscuredAmbushTime');
                        if (lastAmbushTime) {
                            const elapsed = Date.now() - parseInt(lastAmbushTime, 10);
                            if (elapsed < 120000) {
                                baseAmbushChance = 0.15;
                            }
                        }
                    } catch (e) {
                        console.warn("Failed to check lastObscuredAmbushTime from sessionStorage:", e);
                    }

                    if (Math.random() < baseAmbushChance) {
                        ambushTriggered = true;
                        try {
                            sessionStorage.setItem('lastObscuredAmbushTime', String(Date.now()));
                        } catch (e) {
                            console.warn("Failed to save lastObscuredAmbushTime to sessionStorage:", e);
                        }
                        let ambushMonsterTier = 1;
                        const tracker = this.state.levelTracker || [];
                        const activeLevel = tracker.find((entry) => entry && entry.active);
                        const currentLevelId = activeLevel ? Number(activeLevel.id) : Number((getMeta() || {}).location?.levelId || 0);
                        const absLevel = Math.abs(currentLevelId);
                        
                        if (absLevel === 0) ambushMonsterTier = 1;
                        else if (absLevel === 1) ambushMonsterTier = Math.random() < 0.5 ? 1 : 2;
                        else if (absLevel === 2) ambushMonsterTier = Math.random() < 0.5 ? 2 : 3;
                        else if (absLevel === 3) ambushMonsterTier = Math.random() < 0.5 ? 3 : 4;
                        else ambushMonsterTier = 4;
                        
                        ambushMonster = this.props.monsterManager.getRandomMonsterByTier(ambushMonsterTier);
                        if (ambushMonster) {
                            const typeName = String(ambushMonster.type || 'monster').replace(/_/g, ' ');
                            ambushMonster.name = typeName.charAt(0).toUpperCase() + typeName.slice(1);
                        }
                    }
                }
            }

            // --- Trap check (only if no ambush was triggered) ---
            let trapTriggered = false;
            let trapResults = null;
            if (playerMoved && !ambushTriggered) {
                let destTileObj = bm.tiles[destIndex];
                if (destTileObj && destTileObj.hasTrap) {
                    trapTriggered = true;
                    bm.disarmTrap(destTileObj.id);
                    trapResults = this.calculateTrapDamage();
                }
            }

            if (!playerMoved) {
                // Tiles unchanged on a blocked move — refreshTiles was not invoked by
                // board-manager (move() returns early when blocked). Just reset UI state.
                this.setState({
                    playerFloatVisible: true,
                    playerAnimating: false,
                    animOriginIndex: null,
                    animDestIndex: null
                }, () => {
                    this.updateFloatingPlayerPosition(originCoords);
                    this.resolveQueuedMovement(false);
                });
                return;
            }

            // Include tiles and overlayTiles here using the stable bm.tiles reference.
            // Spreading [...bm.tiles] would create a new array, break React.memo's
            // boardTiles comparison, and force all 225 Tile components to re-render.
            // Combined setState: tiles (which refreshTiles held back via the
            // _batchingWithAnimation flag) + animation state = one render cycle
            // instead of two in React 16's un-batched native event context.
            this.setState({
                tiles: bm.tiles,
                overlayTiles: bm.overlayTiles,
                playerFloatVisible: true,
                playerAnimating: true,
                animOriginIndex: originIndex,
                animDestIndex: destIndex,
                keysLocked: (ambushTriggered || trapTriggered) ? true : this.state.keysLocked,
                showAmbushPopup: ambushTriggered ? true : this.state.showAmbushPopup,
                ambushMonster: ambushTriggered ? ambushMonster : this.state.ambushMonster,
                showTrapPopup: trapTriggered ? true : this.state.showTrapPopup,
                trapResults: trapTriggered ? trapResults : this.state.trapResults,
                // Refresh selected crew member HP if trap damage was applied to them
                ...(trapTriggered && this.state.selectedCrewMember?.id ? (() => {
                    try {
                        const meta = getMeta() || {};
                        const updated = (meta.crew || []).find(c => c && c.id === this.state.selectedCrewMember.id);
                        return updated ? { selectedCrewMember: { ...updated } } : {};
                    } catch (e) { return {}; }
                })() : {})
            }, () => {
                if (ambushTriggered) {
                    this.ambushTimeout = setTimeout(() => {
                        this.startAmbushCombat();
                    }, 3000);
                }
                requestAnimationFrame(() => {
                    try {
                        const el = this.playerFloatRef.current;
                        if (!el) return;

                        // Calculate transform delta: from origin to destination within the board
                        const fullX = destPixel.left - originPixel.left;
                        const fullY = destPixel.top - originPixel.top;

                        el.style.willChange = 'transform';
                        el.style.transition = `transform ${TOTAL_MOVE_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)`;
                        el.style.transform = `translate3d(${fullX.toFixed(2)}px, ${fullY.toFixed(2)}px, 0px)`;

                        if (this._playerMoveSettleTimeout) {
                            clearTimeout(this._playerMoveSettleTimeout);
                            this._playerMoveSettleTimeout = null;
                        }
                        this._playerMoveSettleTimeout = this._setTimeout(() => {
                            // Snap the floating player to the destination and instantly
                            // reset the CSS transform (before the paint) so the avatar
                            // lands cleanly.  DOM manipulation first, setState after so
                            // there is only one React render at the end of each step.
                            this.updateFloatingPlayerPosition(bm.playerTile.location);
                            this.recordBreadcrumb();
                            const el2 = this.playerFloatRef.current;
                            if (el2) {
                                el2.style.transition = '';
                                el2.style.transform = 'translate3d(0px, 0px, 0px)';
                                el2.style.willChange = 'auto';
                            }
                            // Single setState clears animation lock, then chains the next
                            // queued move.  Portal check is in the callback so keysLocked
                            // is cleared before executePortalTeleport runs.
                            const playerIdx = bm.getIndexFromCoordinates(bm.playerTile.location);
                            const currentTile = bm.tiles[playerIdx];
                            const ctype = currentTile && currentTile.contains && (currentTile.contains.type || currentTile.contains);
                            this.setState({
                                playerAnimating: false,
                                animOriginIndex: null,
                                animDestIndex: null,
                            }, () => {
                                if (ctype === 'dungeon_portal' || ctype === 'dungeon portal') {
                                    this.executePortalTeleport(currentTile);
                                } else {
                                    this.resolveQueuedMovement(true);
                                }
                            });
                        }, TOTAL_MOVE_MS + BUFFER_MS);
                    } catch (e) {
                        console.warn('post-move tween failed', e);
                        // Reposition float on error instead of hiding
                        this.updateFloatingPlayerPosition(bm.playerTile.location);
                        this.setState({
                            playerAnimating: false,
                            animOriginIndex: null,
                            animDestIndex: null
                        }, () => {
                            this.resolveQueuedMovement(false);
                        });
                    }
                });
            });

        } catch (e) {
            console.warn('handleDirectionalMove failed', e);
            // Fallback: perform immediate move
            try {
                const bm = this.props.boardManager;
                const before = [...bm.playerTile.location];
                switch (direction) {
                    case 'up': bm.moveUp(); break;
                    case 'down': bm.moveDown(); break;
                    case 'left': bm.moveLeft(); break;
                    case 'right': bm.moveRight(); break;
                    default: break;
                }
                const moved = bm.playerTile.location[0] !== before[0] || bm.playerTile.location[1] !== before[1];
                this.setState({ tiles: [...bm.tiles], overlayTiles: bm.overlayTiles }, () => {
                    if (moved) this.recordBreadcrumb();
                    const playerIdx = bm.getIndexFromCoordinates(bm.playerTile.location);
                    const currentTile = bm.tiles[playerIdx];
                    const ctype = currentTile && currentTile.contains && (currentTile.contains.type || currentTile.contains);
                    if (ctype === 'dungeon_portal' || ctype === 'dungeon portal') {
                        this.executePortalTeleport(currentTile);
                    } else {
                        this.resolveQueuedMovement(moved);
                    }
                });
            } catch (err) {}
        }
    }

    parseCoordinates = (str) => {
        const levelMatch = str.match(/level[:=]\s*(-?\d+)/i);
        const orientMatch = str.match(/orient(?:ation)?[:=]\s*(\w+)/i);
        const boardMatch = str.match(/board[:=]\s*(\d+)/i);
        const xMatch = str.match(/x[:=]\s*(\d+)/i);
        const yMatch = str.match(/y[:=]\s*(\d+)/i);

        if (levelMatch && orientMatch && boardMatch && xMatch && yMatch) {
            return {
                levelId: parseInt(levelMatch[1]),
                orientation: orientMatch[1].toLowerCase(),
                boardIndex: parseInt(boardMatch[1]),
                x: parseInt(xMatch[1]),
                y: parseInt(yMatch[1])
            };
        }

        const parts = str.split(',').map(p => p.trim());
        if (parts.length >= 5) {
            const lvl = parseInt(parts[0]);
            const orient = parts[1].toLowerCase();
            const brd = parseInt(parts[2]);
            const px = parseInt(parts[3]);
            const py = parseInt(parts[4]);
            if (!isNaN(lvl) && (orient === 'front' || orient === 'back' || orient === 'f' || orient === 'b') && !isNaN(brd) && !isNaN(px) && !isNaN(py)) {
                return {
                    levelId: lvl,
                    orientation: orient,
                    boardIndex: brd,
                    x: px,
                    y: py
                };
            }
        }
        return null;
    }

    teleportCrew = (coords) => {
        const bm = this.props.boardManager;
        if (!bm) return;

        const targetLevelId = Number(coords.levelId);
        const targetMiniboardIndex = Number(coords.boardIndex);
        const mappedOrientation = (coords.orientation === 'front' || coords.orientation === 'F' || coords.orientation === 'f') ? 'F' : 'B';
        const targetCoordinates = [coords.x, coords.y];

        if (bm.dungeon && Array.isArray(bm.dungeon.levels)) {
            const incomingLevel = bm.dungeon.levels.find(l => Number(l.id) === targetLevelId);
            if (incomingLevel) {
                bm.currentLevel = incomingLevel;
            }
        }

        bm.currentOrientation = mappedOrientation;
        bm.tiles = [];
        const targetIdx = bm.getIndexFromCoordinates([targetCoordinates[1], targetCoordinates[0]]);
        
        try {
            bm.initializeTilesFromMap(targetMiniboardIndex, targetIdx);
        } catch (err) {
            console.error("initializeTilesFromMap failed during teleport:", err);
        }

        const levelTracker = [...this.state.levelTracker];
        levelTracker.forEach(e => { if (e) e.active = false; });
        const lvl = levelTracker.find(e => e && Number(e.id) === targetLevelId);
        if (lvl) lvl.active = true;

        const meta = getMeta() || {};
        if (meta.location) {
            meta.location.levelId = targetLevelId;
            meta.location.orientation = mappedOrientation;
            meta.location.boardIndex = targetMiniboardIndex;
            meta.location.tileIndex = targetIdx;
        }
        storeMeta(meta);

        const minimap = [...this.state.minimap];
        minimap.forEach(e => { if (e) e.active = false; });
        if (minimap[targetMiniboardIndex]) {
            minimap[targetMiniboardIndex].active = true;
        }

        let indicatorsGroup = meta.minimapIndicators.find(e => Number(e.level) === targetLevelId && e.orientation === mappedOrientation);
        if (!indicatorsGroup) {
            let newIndicators = [];
            for (let i = 0; i < 9; i++) {
                newIndicators.push({ enemies: [], gates: [], merchant: [], stairs: [], misc: [], custom: [] });
            }
            indicatorsGroup = { level: targetLevelId, orientation: mappedOrientation, indicators: newIndicators };
            meta.minimapIndicators.push(indicatorsGroup);
            storeMeta(meta);
        }

        this.setState({
            levelTracker,
            minimap,
            minimapZoomedTile: null,
            minimapIndicators: indicatorsGroup.indicators,
            tiles: [...bm.tiles],
            overlayTiles: bm.overlayTiles
        }, () => {
            this.updateFloatingPlayerPosition(bm.playerTile.location);
            this.recordBreadcrumb();
            this.refreshTiles(targetLevelId);
        });
    }

    executePortalTeleport = (tile) => {
        const portal = tile.contains;
        if (!portal || !portal.targetCoordinates) {
            this.resolveQueuedMovement(true);
            return;
        }

        this.setState({ keysLocked: true, portalTransitionClass: 'portal-transition-out' });
        this.messaging('🌀 Teleporting through portal...');

        this._setTimeout(() => {
            const bm = this.props.boardManager;
            let targetLevelIdVal = portal.targetLevelId;
            let targetOrientation = portal.targetOrientation;
            let targetMiniboardIndex = portal.targetMiniboardIndex;
            let targetCoordinates = portal.targetCoordinates;

            // Bulletproof dynamic resolution if any target property is missing or incomplete
            if (portal.targetPortalId && (targetLevelIdVal === null || targetLevelIdVal === undefined || targetOrientation === null || targetOrientation === undefined || targetMiniboardIndex === null || targetMiniboardIndex === undefined || !targetCoordinates)) {
                try {
                    const allLevels = bm.dungeon?.levels || [];
                    let foundTarget = null;
                    for (const level of allLevels) {
                        for (const orientation of ['front', 'back']) {
                            const plane = level[orientation];
                            if (plane && Array.isArray(plane.miniboards)) {
                                for (let mbIndex = 0; mbIndex < plane.miniboards.length; mbIndex++) {
                                    const mb = plane.miniboards[mbIndex];
                                    if (mb && Array.isArray(mb.tiles)) {
                                        const tile = mb.tiles.find(t => t.contains && t.contains.portalId === portal.targetPortalId);
                                        if (tile) {
                                            foundTarget = {
                                                levelId: level.id,
                                                orientation: orientation,
                                                miniboardIndex: mbIndex,
                                                coordinates: tile.coordinates
                                            };
                                            break;
                                        }
                                    }
                                }
                            }
                            if (foundTarget) break;
                        }
                        if (foundTarget) break;
                    }
                    if (foundTarget) {
                        targetLevelIdVal = foundTarget.levelId;
                        targetOrientation = foundTarget.orientation;
                        targetMiniboardIndex = foundTarget.miniboardIndex;
                        targetCoordinates = foundTarget.coordinates;
                    }
                } catch (e) {
                    console.warn("Failed to dynamically resolve target portal properties", e);
                }
            }

            const canTransition = targetLevelIdVal !== null && targetLevelIdVal !== undefined && targetMiniboardIndex !== null && targetMiniboardIndex !== undefined && targetCoordinates;

            if (canTransition) {
                const targetLevelId = Number(targetLevelIdVal);
                if (targetLevelId !== Number(bm.currentLevel?.id)) {
                    const incomingLevel = bm.dungeon.levels.find(l => Number(l.id) === targetLevelId);
                    if (incomingLevel) {
                        bm.currentLevel = incomingLevel;
                    }
                }
                
                const mappedOrientation = (targetOrientation === 'front' || targetOrientation === 'F') ? 'F' : 'B';
                if (targetOrientation) {
                    if (mappedOrientation !== bm.currentOrientation) {
                        bm.currentOrientation = mappedOrientation;
                    }
                }
                
                bm.tiles = [];
                const targetIdx = bm.getIndexFromCoordinates([targetCoordinates[1], targetCoordinates[0]]);
                
                try {
                    bm.initializeTilesFromMap(targetMiniboardIndex, targetIdx);
                } catch (err) {
                    console.error("initializeTilesFromMap crashed inside executePortalTeleport:", err);
                }
                
                const levelTracker = this.state.levelTracker;
                levelTracker.forEach(e => e.active = false);
                const lvl = levelTracker.find(e => Number(e.id) === targetLevelId);
                if (lvl) lvl.active = true;
                
                const meta = getMeta() || {};
                let indicatorsGroup = meta.minimapIndicators.find(e => Number(e.level) === targetLevelId && e.orientation === mappedOrientation);
                if (!indicatorsGroup) {
                    let newIndicators = [];
                    for (let i = 0; i < 9; i++) {
                        newIndicators.push({ enemies: [], gates: [], merchant: [], stairs: [], misc: [], custom: [] });
                    }
                    indicatorsGroup = { level: targetLevelId, orientation: mappedOrientation, indicators: newIndicators };
                    meta.minimapIndicators.push(indicatorsGroup);
                }
                if (meta.location) {
                    meta.location.levelId = targetLevelId;
                    meta.location.orientation = mappedOrientation;
                    meta.location.boardIndex = targetMiniboardIndex;
                    meta.location.tileIndex = targetIdx;
                }
                storeMeta(meta);
                
                const minimap = this.state.minimap;
                minimap.forEach(e => e.active = false);
                if (minimap[targetMiniboardIndex]) {
                    minimap[targetMiniboardIndex].active = true;
                }
                
                this.setState({
                    levelTracker,
                    minimap,
                    minimapZoomedTile: null,
                    minimapIndicators: indicatorsGroup.indicators,
                    tiles: [...bm.tiles],
                    overlayTiles: bm.overlayTiles,
                    portalTransitionClass: 'portal-transition-in'
                }, () => {
                    this.updateFloatingPlayerPosition(bm.playerTile.location);
                    this.recordBreadcrumb();
                    this.refreshTiles(targetLevelId);
                    
                    this._setTimeout(() => {
                        this.setState({ portalTransitionClass: '', keysLocked: false }, () => {
                            this.resolveQueuedMovement(true);
                        });
                    }, 800);
                });
            } else {
                const targetIdx = bm.getIndexFromCoordinates([targetCoordinates[1], targetCoordinates[0]]);
                const correctedCoordinates = [15 + targetCoordinates[1], 15 + targetCoordinates[0]];
                bm.placePlayer(correctedCoordinates);
                bm.playerTile.location = [...correctedCoordinates];
                bm.tiles.forEach(t => t.playerTile = false);
                bm.tiles[targetIdx].playerTile = true;
                bm.handleFogOfWar(bm.tiles[targetIdx]);
                try { bm.checkAdjacency(); } catch (e) {}
                
                this.setState({
                    tiles: [...bm.tiles],
                    overlayTiles: bm.overlayTiles,
                    portalTransitionClass: 'portal-transition-in'
                }, () => {
                    this.updateFloatingPlayerPosition(bm.playerTile.location);
                    this.recordBreadcrumb();
                    
                    this._setTimeout(() => {
                        this.setState({ portalTransitionClass: '', keysLocked: false }, () => {
                            this.resolveQueuedMovement(true);
                        });
                    }, 800);
                });
            }
        }, 800);
    }
    checkDungeon = async () => {
        const allDungeons = await loadAllDungeonsRequest();
        
        let dungeons = [];
            
        allDungeons.data.forEach((e, i) => {
            let d = JSON.parse(e.content)
            d.id = e._id
            dungeons.push(d)
        })
        // const selectedDungeon = dungeons.find(e=>e.name === 'Primari');
    }
    handleRespawnTime = () => {
        const meta = getMeta() || {};
        // Ensure both monster and item respawn dates exist
        if (!meta.respawnDate) this.setNewRespawnDate();
        if (!meta.itemRespawnDate) this.setNewItemRespawnDate();

        // Monster respawn timer
        try {
            let respawn = new Date(meta.respawnDate);
            let now = new Date();
            let diffInMinutes = diff_minutes(respawn, now)
            let diffInSeconds = diff_seconds(respawn, now)
            let respawnString = ''
            if(diffInMinutes > 1){
                respawnString = `${diffInMinutes} m`
            } else if(diffInMinutes < 2 && diffInSeconds > 1){
                respawnString = `${diffInSeconds} s`
            } else {
                this.respawnMonsters();
                respawnString = ''
                this.setNewRespawnDate();
            }
            this.setState({ timeToRespawn: respawnString });
        } catch (e) {}

        // Item respawn timer (3x monster)
        try {
            let irespawn = new Date(meta.itemRespawnDate);
            let now2 = new Date();
            let idiffInMinutes = diff_minutes(irespawn, now2)
            let idiffInSeconds = diff_seconds(irespawn, now2)
            let itemRespawnString = ''
            if(idiffInMinutes > 1){
                itemRespawnString = `${idiffInMinutes} m`
            } else if(idiffInMinutes < 2 && idiffInSeconds > 1){
                itemRespawnString = `${idiffInSeconds} s`
            } else {
                this.respawnItems();
                itemRespawnString = ''
                this.setNewItemRespawnDate();
            }
            this.setState({ itemTimeToRespawn: itemRespawnString });
        } catch (e) {}
    }

    setNewItemRespawnDate = () => {
        // Item respawn interval: 20 minutes
        let soon = new Date().addMinutes(ITEM_RESPAWN_MINUTES)
        let meta = getMeta() || {};
        meta.itemRespawnDate = soon;
        try { storeMeta(meta); } catch (e) {}

        let respawn = new Date(soon);
        let now = new Date();
        let diffInMinutes = diff_minutes(respawn, now);
        let respawnString = `${diffInMinutes} m`
        this.setState({ itemTimeToRespawn: respawnString });
    }
    respawnMonsters = async () => {
        let dungeons = [],
        selectedDungeon;
        let meta = getMeta() || {};
        const activeDungeon = (this.props && this.props.boardManager && this.props.boardManager.dungeon) || this.dungeon || null;
        const activeDungeonId = meta.dungeonId
            || (activeDungeon && activeDungeon.id)
            || null;
        const activeDungeonName = (activeDungeon && activeDungeon.name) || null;
        const selectedTemplateId = meta.selectedDungeonTemplateId || null;
        const selectedTemplateName = meta.selectedDungeonTemplateName || null;
        
        const allDungeons = await loadAllDungeonsRequest();

        allDungeons.data.forEach((e, i) => {
            let d = JSON.parse(e.content)
            d.id = e._id
            dungeons.push(d)
        })

        const candidateTemplates = dungeons.filter((d) => String(d.id) !== String(activeDungeonId));

        if (selectedTemplateId) {
            selectedDungeon = candidateTemplates.find((d) => String(d.id) === String(selectedTemplateId)) || null;
        }

        if (!selectedDungeon && selectedTemplateName) {
            selectedDungeon = candidateTemplates.find((d) => d && d.name === selectedTemplateName) || null;
        }

        if (!selectedDungeon && activeDungeonName) {
            const prefixMatches = candidateTemplates
                .filter((d) => d && d.name && activeDungeonName.startsWith(`${d.name}_`))
                .sort((a, b) => b.name.length - a.name.length);
            selectedDungeon = prefixMatches[0] || null;
        }

        // Fallback: if no parent template can be resolved, use the current in-memory dungeon.
        if (!selectedDungeon) {
            try {
                selectedDungeon = activeDungeon;
            } catch (e) { selectedDungeon = null }
        }
        if (!selectedDungeon) {
            selectedDungeon = dungeons[0] || null;
        }
        try {
            if (this.props.boardManager && typeof this.props.boardManager.respawnMonsters === 'function') {
                const respawnedCount = this.props.boardManager.respawnMonsters(selectedDungeon)
                return typeof respawnedCount === 'number' ? respawnedCount : 0;
            } else {
                console.warn('respawnMonsters: boardManager.respawnMonsters not available');
            }
            // Persist meta after a respawn event so UI/session state is saved
            try {
                const meta = getMeta();
                storeMeta(meta);
            } catch (e) {
                // ignore storeMeta failures
            }
            if (this.props.saveUserData) {
                try {
                    this.props.saveUserData();
                } catch (e) {
                    // ignore save failures
                }
            }
        } catch (e) {
            console.warn('Error triggering respawnMonsters', e);
        }
        return 0;
    }
    respawnItems = async () => {
        let dungeons = [],
        selectedDungeon;
        const allDungeons = await loadAllDungeonsRequest();

        allDungeons.data.forEach((e, i) => {
            let d = JSON.parse(e.content)
            d.id = e._id
            dungeons.push(d)
        })
        selectedDungeon = dungeons[0];
        try {
            if (this.props.boardManager && typeof this.props.boardManager.respawnItems === 'function') {
                this.props.boardManager.respawnItems(selectedDungeon)
            }
            // Persist meta after an item respawn event so UI/session state is saved
            try {
                const meta = getMeta();
                storeMeta(meta);
            } catch (e) {}
            if (this.props.saveUserData) {
                try {
                    this.props.saveUserData();
                } catch (e) {}
            }
        } catch (e) {
            console.warn('Error triggering respawnItems', e);
        }
    }
    componentWillUnmount(){
        this._isMounted = false;
        if (typeof this.props.registerMessaging === 'function') {
            try { this.props.registerMessaging(null); } catch (e) {}
        }
        // Clear any timers/intervals created via helpers
        try { if (Array.isArray(this._timers)) { this._timers.forEach(t => clearTimeout(t)); this._timers = []; } } catch(e){}
        try { if (Array.isArray(this._intervals)) { this._intervals.forEach(i => clearInterval(i)); this._intervals = []; } } catch(e){}
        // Backwards compat: clear any direct references as well
        try { if (this.realTimeSpecialActionCheckInterval) { clearInterval(this.realTimeSpecialActionCheckInterval); } } catch(e){}
        try { if (this.prepCompleteTimeout) { clearTimeout(this.prepCompleteTimeout); this.prepCompleteTimeout = null; } } catch(e){}
        try { if (this.campTimeout) { clearTimeout(this.campTimeout); this.campTimeout = null; } } catch(e){}
        try { if (this.state && this.state.respawnUpdateInterval) { clearInterval(this.state.respawnUpdateInterval); } } catch(e){}
        // stop canvas animation and remove canvas
        try {
            if (this.cooldownAnimationFrame) {
                cancelAnimationFrame(this.cooldownAnimationFrame);
                this.cooldownAnimationFrame = null;
            }
            if (this.cooldownCanvas) {
                if (this.cooldownCanvas.parentNode) this.cooldownCanvas.parentNode.removeChild(this.cooldownCanvas);
                this.cooldownCanvas = null;
            }
        } catch (e) {
            console.warn('Error cleaning up cooldown canvas', e);
        }
        // Cleanup debug commands
        try {
            if (this._debugKeydownListener) {
                window.removeEventListener('keydown', this._debugKeydownListener);
            }
            delete window.levelUp;
            delete window.lvlUp;
            delete window['lvl up'];
            delete window['level up'];
            delete window.lvl_up;
            delete window.level_up;
            delete window.narrativeReset;
            delete window.narrative_reset;
            delete window['narrative reset'];
        } catch (e) {}

        this.componentCleanup();
        window.removeEventListener('beforeunload', this.componentCleanup); 
    }
    
    componentCleanup = () => {
        window.removeEventListener('keydown', this.keyDownHandler)
        window.removeEventListener('resize', this.handleResize.bind(this));
        clearInterval(this.state.intervalId)
    }

    // Dev console handlers
    handleDevConsoleInputChange = (e) => {
        this.setState({ devConsoleInput: e.target.value });
    }

    handleDevConsoleKeyDown = async (e) => {
        if (e.key === 'Enter') {
            const raw = (this.state.devConsoleInput || '').trim();
            const cmd = raw.toLowerCase();
            // built-in commands
            const monsterCommands = ['monster-spawn','monsterspawn','mspawn'];
            const itemCommands = ['item-spawn','itemspawn','ispawn'];

            // Allow commands with optional args, e.g. "mspawn 1" or "mspawn:1"
            const monsterCommandMatch = monsterCommands.find(c => cmd.startsWith(c));
            const itemCommandMatch = itemCommands.find(c => cmd.startsWith(c));

            if (cmd.startsWith('tele ') || cmd.startsWith('teleport ')) {
                const coordStr = raw.substring(cmd.startsWith('teleport ') ? 9 : 5).trim();
                const parsed = this.parseCoordinates(coordStr);
                if (parsed) {
                    this.teleportCrew(parsed);
                    this.setState(prev => ({
                        devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Teleported to Level ${parsed.levelId}, Orientation ${parsed.orientation}, Board ${parsed.boardIndex} @ (${parsed.x}, ${parsed.y})`],
                        devConsoleInput: '',
                        devConsoleOpen: false,
                        keysLocked: false
                    }));
                } else {
                    this.setState(prev => ({
                        devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: Invalid coordinates format. Expected: level:X,orientation:Y,board:Z,x:A,y:B`],
                        devConsoleInput: ''
                    }));
                }
                e.preventDefault();
                return;
            }

            if (cmd === 'tele...' || cmd === 'teleport...' || cmd === 'tele' || cmd === 'teleport') {
                this.setState({
                    showTeleportPopup: true,
                    devConsoleOpen: false,
                    devConsoleInput: '',
                    keysLocked: true
                });
                e.preventDefault();
                return;
            }

            if (cmd === 'lvl up' || cmd === 'lvlup' || cmd === 'level up' || cmd === 'levelup') {
                try {
                    const selectedId = this.state.selectedCrewMember?.id;
                    const member = (this.props.crewManager?.crew || []).find(c => c && (c.id === selectedId || c.selected));
                    if (!member) {
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, 'Error: No selected crew member found. Select one first.'], devConsoleInput: '' }));
                    } else {
                        const fromLevel = typeof member.level === 'number' ? member.level : 0;
                        this.props.crewManager.levelUp(member);
                        const toLevel = member.level;
                        
                        this.setState(prev => ({ 
                            selectedCrewMember: { ...member },
                            showDebugLevelUpScreen: true,
                            debugLevelUpQueue: [{ crewMember: member, fromLevel, toLevel }],
                            devConsoleOpen: false,
                            devConsoleInput: '',
                            devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Leveling up ${member.name || member.type} (${fromLevel} → ${toLevel})`]
                        }));
                    }
                } catch (err) {
                    this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                }
                try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                e.preventDefault();
                return;
            } else if (monsterCommandMatch) {
                // trigger monster spawn without touching timers
                try {
                    const respawned = await this.respawnMonsters();
                    this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Triggered monster spawn (dev console): ${respawned} spawned`], devConsoleInput: '' }));
                } catch (err) {
                    this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                }
            } else if (itemCommandMatch) {
                try {
                    this.respawnItems();
                    this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, 'Triggered item spawn (dev console)'], devConsoleInput: '' }));
                } catch (err) {
                    this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                }
            } else if (cmd === 'shrine reset' || cmd === 'shrinereset' || cmd === 'reset shrines' || cmd === 'resetshrines') {
                try {
                    const meta = getMeta() || {};
                    meta.shrinesUsed = [];
                    storeMeta(meta);
                    try { updateUserRequest(getUserId(), meta).catch(()=>{}); } catch (e) {}

                    const allDungeons = await loadAllDungeonsRequest();
                    let dungeons = [];
                    allDungeons.data.forEach((e) => {
                        let d = JSON.parse(e.content);
                        d.id = e._id;
                        dungeons.push(d);
                    });

                    const activeDungeon = this.props.boardManager?.dungeon;
                    let selectedDungeon = null;
                    if (activeDungeon) {
                        const templateId = meta.selectedDungeonTemplateId;
                        if (templateId) {
                            selectedDungeon = dungeons.find(d => d.id === templateId);
                        }
                    }
                    if (!selectedDungeon) {
                        selectedDungeon = dungeons[0] || null;
                    }

                    let respawned = 0;
                    if (selectedDungeon && this.props.boardManager && typeof this.props.boardManager.respawnShrines === 'function') {
                        respawned = this.props.boardManager.respawnShrines(selectedDungeon);
                    }

                    try { if (typeof this.props.saveUserData === 'function') this.props.saveUserData(); } catch (e) {}

                    this.setState(prev => ({
                        devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `All shrines reset successfully. Respawned ${respawned} shrine(s) on current board from template. You can commune with them again.`],
                        devConsoleInput: ''
                    }));
                } catch (err) {
                    this.setState(prev => ({
                        devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`],
                        devConsoleInput: ''
                    }));
                }
                try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                e.preventDefault();
                return;
            } else if (cmd === 'shrine respawn' || cmd === 'shrinerespawn') {
                try {
                    const meta = getMeta() || {};
                    meta.shrinesUsed = [];
                    storeMeta(meta);

                    const allDungeons = await loadAllDungeonsRequest();
                    let dungeons = [];
                    allDungeons.data.forEach((e) => {
                        let d = JSON.parse(e.content);
                        d.id = e._id;
                        dungeons.push(d);
                    });

                    const activeDungeon = this.props.boardManager?.dungeon;
                    let selectedDungeon = null;
                    if (activeDungeon) {
                        const templateId = meta.selectedDungeonTemplateId;
                        if (templateId) {
                            selectedDungeon = dungeons.find(d => d.id === templateId);
                        }
                    }
                    if (!selectedDungeon) {
                        selectedDungeon = dungeons[0] || null;
                    }

                    if (selectedDungeon && this.props.boardManager && typeof this.props.boardManager.respawnShrines === 'function') {
                        const respawned = this.props.boardManager.respawnShrines(selectedDungeon);
                        try {
                            if (typeof this.props.saveUserData === 'function') this.props.saveUserData();
                        } catch (e) {}

                        this.setState(prev => ({
                            devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Cleared visited shrines. Respawned ${respawned} shrine(s) on current board from template.`],
                            devConsoleInput: ''
                        }));
                    } else {
                        this.setState(prev => ({
                            devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Cleared visited shrines list in metadata. (No template found or boardManager.respawnShrines not available)`],
                            devConsoleInput: ''
                        }));
                    }
                } catch (err) {
                    this.setState(prev => ({
                        devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`],
                        devConsoleInput: ''
                    }));
                }
            } else {
                // Developer: restore full health to all crew
                if (cmd === 'fullhealth' || cmd === 'full-health' || cmd === 'revive') {
                    try {
                        const cm = this.props.crewManager;
                        if (cm && Array.isArray(cm.crew)) {
                            cm.crew.forEach(m => {
                                try {
                                    // Prefer derived max hp from stats.hp or starting_hp
                                    const maxHp = (m && m.stats && typeof m.stats.hp === 'number') ? m.stats.hp : (typeof m.starting_hp === 'number' ? m.starting_hp : 1);
                                    m.hp = maxHp;
                                    m.dead = false;
                                } catch (inner) {}
                            });
                            // Spread members into new objects so React.memo on Tile detects the change
                            cm.crew = cm.crew.map(m => ({ ...m }));
                        }
                        const meta = getMeta() || {};
                        if (Array.isArray(meta.crew) && this.props.crewManager && Array.isArray(this.props.crewManager.crew)) {
                            meta.crew = this.props.crewManager.crew.map(m => {
                                try {
                                    const maxHp = (m && m.stats && typeof m.stats.hp === 'number') ? m.stats.hp : (typeof m.starting_hp === 'number' ? m.starting_hp : 1);
                                    m.hp = maxHp;
                                    m.dead = false;
                                } catch (inner) {}
                                return m;
                            });
                        }
                        try { storeMeta(meta); } catch(e){}
                        try { updateUserRequest(getUserId(), meta).catch(()=>{}); } catch(e){}
                        try { if (typeof this.props.saveUserData === 'function') this.props.saveUserData(); } catch(e){}
                        // Refresh selectedCrewMember and UI
                        try {
                            if (this.state.selectedCrewMember && this.state.selectedCrewMember.id) {
                                const updated = (this.props.crewManager && Array.isArray(this.props.crewManager.crew)) ? this.props.crewManager.crew.find(c => c && c.id === this.state.selectedCrewMember.id) : null;
                                if (updated) this.setState({ selectedCrewMember: { ...updated } });
                            }
                            this.forceUpdate();
                        } catch(e){}
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, 'All crew restored to full health'], devConsoleInput: '' }));
                    } catch (err) {
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                    }
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                if (cmd === 'resolve') {
                    try {
                        const meta = getMeta() || {};
                        meta.resolve = 100;
                        storeMeta(meta);
                        try { updateUserRequest(getUserId(), meta).catch(()=>{}); } catch(e){}
                        try { this.forceUpdate(); } catch(e){}
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, 'Resolve set to 100'], devConsoleInput: '' }));
                    } catch (err) {
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                    }
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                // list available commands
                if (cmd === 'list' || cmd === 'help') {
                    const commands = [
                        'monster-spawn / monsterspawn / mspawn',
                        'item-spawn / itemspawn / ispawn',
                        'shrine respawn / shrinerespawn',
                        'shrine reset / reset shrines — reset all used shrines so they can be accessed again',
                        'resolve — set the crew\'s resolve to 100',
                        'fullhealth / full-health / revive',
                        'food — fill food count to 55',
                        'key — add 1 master key to inventory',
                        'kill reset — reset death tracker to 0',
                        'remove rituals — clear all learned rituals from every crew member',
                        'weapons t1 / weapons1 / weaponst1 — add 2 random tier-1 weapons',
                        'weapons t2 / weapons2 / weaponst2 — add 2 random tier-2 weapons',
                        'weapons t3 / weapons3 / weaponst3 — add 2 random tier-3 weapons',
                        'armor t1 / armor1 / armort1 — add 2 random tier-1 armor items',
                        'armor t2 / armor2 / armort2 — add 2 random tier-2 armor items',
                        'armor t3 / armor3 / armort3 — add 2 random tier-3 armor items',
                        'magical t1 / magical1 / magicalt1 — add 2 random tier-1 magical items',
                        'magical t2 / magical2 / magicalt2 — add 2 random tier-2 magical items',
                        'magical t3 / magical3 / magicalt3 — add 2 random tier-3 magical items',
                        'open board — jump to mapmaker board view for current board',
                        'launch cardgame — start a card duel battle',
                        'reagents — add 1 of each reagent type to inventory',
                        'lvl up / level up — level up the currently selected crew member',
                        'tele <coordinates> — teleport to coordinates (copied from mapmaker)',
                        'tele / teleport / tele... / teleport... — open stored coordinates teleport modal',
                        'list / help'
                    ];
                    this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, ...commands], devConsoleInput: '' }));
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                // key - spawn a single master key
                if (cmd === 'key') {
                    try {
                        const im = this.props.inventoryManager;
                        if (im && im.allItems && im.allItems['master_key']) {
                            const masterKeyItem = { ...im.allItems['master_key'] };
                            im.addItem(masterKeyItem);
                            try {
                                const meta = getMeta() || {};
                                meta.inventory = {
                                    items: im.inventory,
                                    gold: im.gold,
                                    shimmering_dust: im.shimmering_dust,
                                    totems: im.totems,
                                };
                                storeMeta(meta);
                                if (typeof this.props.saveUserData === 'function') this.props.saveUserData();
                            } catch(e){}
                            this.forceUpdate();
                            this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, 'Spawned a Master Key in your inventory.'], devConsoleInput: '' }));
                        } else {
                            this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, 'Error: master_key definition not found'], devConsoleInput: '' }));
                        }
                    } catch (err) {
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                    }
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                // kill reset — reset death tracker to 0
                if (cmd === 'kill reset') {
                    try {
                        this.handleDeathTrackerChanged(0);
                        try { updateUserRequest(getUserId(), getMeta()).catch(()=>{}); } catch(e){}
                        try { if (typeof this.props.saveUserData === 'function') this.props.saveUserData(); } catch(e){}
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, 'Death tracker reset to 0'], devConsoleInput: '' }));
                    } catch (err) {
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                    }
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                // ingredients — add 1 of each brew ingredient to inventory
                if (cmd === 'ingredients') {
                    try {
                        BREW_INGREDIENT_KEYS.forEach(rKey => {
                            this.props.inventoryManager.addItem({ ...BREW_INGREDIENTS[rKey] });
                        });
                        try {
                            const meta = getMeta();
                            meta.inventory = {
                                items: this.props.inventoryManager.inventory,
                                gold: this.props.inventoryManager.gold,
                                shimmering_dust: this.props.inventoryManager.shimmering_dust,
                                totems: this.props.inventoryManager.totems,
                            };
                            storeMeta(meta);
                            if (typeof this.props.saveUserData === 'function') this.props.saveUserData();
                        } catch(e){}
                        this.forceUpdate();
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Added 1 of each brew ingredient (${BREW_INGREDIENT_KEYS.length} total) to inventory`], devConsoleInput: '' }));
                    } catch (err) {
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                    }
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                // reagents — add 1 of each reagent type to inventory
                if (cmd === 'reagents') {
                    try {
                        REAGENT_KEYS.forEach(rKey => {
                            this.props.inventoryManager.addItem({ ...REAGENTS[rKey] });
                        });
                        BREW_INGREDIENT_KEYS.forEach(rKey => {
                            this.props.inventoryManager.addItem({ ...BREW_INGREDIENTS[rKey] });
                        });
                        try {
                            const meta = getMeta();
                            meta.inventory = {
                                items: this.props.inventoryManager.inventory,
                                gold: this.props.inventoryManager.gold,
                                shimmering_dust: this.props.inventoryManager.shimmering_dust,
                                totems: this.props.inventoryManager.totems,
                            };
                            storeMeta(meta);
                            if (typeof this.props.saveUserData === 'function') this.props.saveUserData();
                        } catch(e){}
                        this.forceUpdate();
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Added 1 of each reagent & brew ingredient (${REAGENT_KEYS.length + BREW_INGREDIENT_KEYS.length} total) to inventory`], devConsoleInput: '' }));
                    } catch (err) {
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                    }
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                // food — fill food count to 55 and save
                if (cmd === 'food') {
                    try {
                        const meta = getMeta() || {};
                        meta.food = 55;
                        try { storeMeta(meta); } catch(e){}
                        try { updateUserRequest(getUserId(), meta).catch(()=>{}); } catch(e){}
                        try { if (typeof this.props.saveUserData === 'function') this.props.saveUserData(); } catch(e){}
                        try { this.forceUpdate(); } catch(e){}
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, 'Food set to 55'], devConsoleInput: '' }));
                    } catch (err) {
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                    }
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                // weapons tier commands: weapons t1 / weapons1 / weaponst1 (and t2/t3)
                const weaponTierAlias = {
                    1: ['weapons t1', 'weapons1', 'weaponst1'],
                    2: ['weapons t2', 'weapons2', 'weaponst2'],
                    3: ['weapons t3', 'weapons3', 'weaponst3'],
                };
                const weaponTier = [1, 2, 3].find(t => weaponTierAlias[t].includes(cmd));
                if (weaponTier !== undefined) {
                    try {
                        const im = this.props.inventoryManager;
                        const allKeys = (im && Array.isArray(im.weapons_names)) ? im.weapons_names : [];
                        const tierKeys = allKeys.filter(k => im.allItems && im.allItems[k] && im.allItems[k].tier === weaponTier);
                        if (tierKeys.length === 0) {
                            this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `No tier-${weaponTier} weapons found`], devConsoleInput: '' }));
                        } else {
                            // shuffle and take 2
                            const shuffled = tierKeys.slice().sort(() => Math.random() - 0.5).slice(0, 2);
                            im.addItemsByName(shuffled);
                            const names = shuffled.map(k => (im.allItems[k] && im.allItems[k].name) ? im.allItems[k].name : k);
                            this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Added ${names.length} tier-${weaponTier} weapon(s): ${names.join(', ')}`], devConsoleInput: '' }));
                        }
                    } catch (err) {
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                    }
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }

                const armorTierAlias = {
                    1: ['armor t1', 'armor1', 'armort1'],
                    2: ['armor t2', 'armor2', 'armort2'],
                    3: ['armor t3', 'armor3', 'armort3'],
                };
                const armorTier = [1, 2, 3].find(t => armorTierAlias[t].includes(cmd));
                if (armorTier !== undefined) {
                    try {
                        const im = this.props.inventoryManager;
                        const allKeys = Object.keys((im && im.allItems) || {});
                        const tierKeys = allKeys.filter(k => im.allItems && im.allItems[k] && im.allItems[k].type === 'armor' && im.allItems[k].tier === armorTier);
                        if (tierKeys.length === 0) {
                            this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `No tier-${armorTier} armor items found`], devConsoleInput: '' }));
                        } else {
                            const shuffled = tierKeys.slice().sort(() => Math.random() - 0.5).slice(0, 2);
                            im.addItemsByName(shuffled);
                            const names = shuffled.map(k => (im.allItems[k] && im.allItems[k].name) ? im.allItems[k].name : k);
                            this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Added ${names.length} tier-${armorTier} armor item(s): ${names.join(', ')}`], devConsoleInput: '' }));
                        }
                    } catch (err) {
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                    }
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }

                const magicalTierAlias = {
                    1: ['magical t1', 'magical1', 'magicalt1'],
                    2: ['magical t2', 'magical2', 'magicalt2'],
                    3: ['magical t3', 'magical3', 'magicalt3'],
                };
                const magicalTier = [1, 2, 3].find(t => magicalTierAlias[t].includes(cmd));
                if (magicalTier !== undefined) {
                    try {
                        const im = this.props.inventoryManager;
                        const allKeys = Object.keys((im && im.allItems) || {});
                        const tierKeys = allKeys.filter(k => im.allItems && im.allItems[k] && im.allItems[k].type === 'magical' && im.allItems[k].tier === magicalTier);
                        if (tierKeys.length === 0) {
                            this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `No tier-${magicalTier} magical items found`], devConsoleInput: '' }));
                        } else {
                            const shuffled = tierKeys.slice().sort(() => Math.random() - 0.5).slice(0, 2);
                            im.addItemsByName(shuffled);
                            const names = shuffled.map(k => (im.allItems[k] && im.allItems[k].name) ? im.allItems[k].name : k);
                            this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Added ${names.length} tier-${magicalTier} magical item(s): ${names.join(', ')}`], devConsoleInput: '' }));
                        }
                    } catch (err) {
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                    }
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                // launch cardgame — instantiate a card duel for testing
                if (cmd === 'launch cardgame' || cmd === 'launchcardgame' || cmd === 'card game') {
                    this.setState(prev => ({ 
                        showCardDuelModal: true, 
                        devConsoleInput: '',
                        devConsoleOpen: false,
                        devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, 'Launching Card Duel...'] 
                    }));
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                // open board — navigate to mapmaker board view for the current board
                if (cmd === 'open board') {
                    try {
                        const board = this.props.boardManager && this.props.boardManager.currentBoard;
                        if (!board || !board.id) {
                            this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, 'Error: no current board loaded'], devConsoleInput: '' }));
                        } else {
                            // Persist handoff data so MapmakerPage picks it up on mount
                            sessionStorage.setItem('devConsoleHandoff', JSON.stringify({
                                boardId: board.id,
                                returnTo: 'dungeon',
                                consoleOpen: true
                            }));
                            this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Opening board "${board.name}" in mapmaker...`], devConsoleInput: '' }));
                            // Short delay so the output is visible before navigating
                            setTimeout(() => { window.location.href = '/mapmaker'; }, 400);
                        }
                    } catch (err) {
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                    }
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                // remove rituals — clear all learned rituals and in-progress ritual actions from every crew member
                if (cmd === 'remove rituals' || cmd === 'removerituals' || cmd === 'clear rituals' || cmd === 'clearrituals') {
                    try {
                        const cm = this.props.crewManager;
                        const ritualTypes = ['wizard', 'sage']; // eslint-disable-line no-unused-vars
                        const affectedNames = [];
                        if (cm && Array.isArray(cm.crew)) {
                            cm.crew.forEach(member => {
                                if (!member) return;
                                let changed = false;
                                if (Array.isArray(member.knownRituals) && member.knownRituals.length > 0) {
                                    member.knownRituals = [];
                                    changed = true;
                                }
                                // Also clear any in-progress ritual special actions
                                if (Array.isArray(member.specialActions)) {
                                    const before = member.specialActions.length;
                                    member.specialActions = member.specialActions.filter(a => a && a.type !== 'ritual');
                                    if (member.specialActions.length !== before) changed = true;
                                }
                                if (changed) affectedNames.push(member.name || member.type || member.id);
                            });
                        }
                        const meta = getMeta() || {};
                        meta.crew = cm.crew;
                        try { storeMeta(meta); } catch(e){}
                        try { updateUserRequest(getUserId(), meta).catch(()=>{}); } catch(e){}
                        try { if (typeof this.props.saveUserData === 'function') this.props.saveUserData(); } catch(e){}
                        // Refresh selectedCrewMember if affected
                        try {
                            if (this.state.selectedCrewMember && this.state.selectedCrewMember.id) {
                                const updated = cm.crew.find(c => c && c.id === this.state.selectedCrewMember.id);
                                if (updated) this.setState({ selectedCrewMember: { ...updated } });
                            }
                            this.forceUpdate();
                        } catch(e){}
                        const msg = affectedNames.length > 0
                            ? `Rituals cleared for: ${affectedNames.join(', ')}`
                            : 'No rituals found to clear';
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, msg], devConsoleInput: '' }));
                    } catch (err) {
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                    }
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                // siege — start Tower Siege event with default armies
                if (cmd === 'siege' || cmd === 'tower siege') {
                    try {
                        this.triggerTowerSiege();
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, 'Initiating Tower Siege...'], devConsoleInput: '' }));
                    } catch (err) {
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                    }
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                // narrative reset — reset narrative tiles
                if (cmd === 'narrative reset' || cmd === 'narrativereset' || cmd === 'narrative_reset') {
                    try {
                        this.triggerNarrativeReset();
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, 'Resetting all narrative encounter tiles...'], devConsoleInput: '' }));
                    } catch (err) {
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                    }
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                // unknown command: echo
                this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Unknown command: ${raw}`], devConsoleInput: '' }));
            }
            // keep focus
            try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
            e.preventDefault();
        } else if (e.key === 'Escape') {
            // close console
            this.setState({ devConsoleOpen: false });
        }
    }

    // Draw cooldown overlays onto the full-page canvas. This runs on requestAnimationFrame
    drawCooldowns = (timestamp) => {
        // throttle to _fpsLimit
        try {
            if (this._lastDrawTimestamp && timestamp && (timestamp - this._lastDrawTimestamp) < (1000 / this._fpsLimit)) {
                // still need to schedule next frame if active
                if (this.hasActiveCooldowns()) {
                    this.cooldownAnimationFrame = requestAnimationFrame(this.drawCooldowns);
                } else {
                    this.cooldownAnimationFrame = null;
                }
                return;
            }
            this._lastDrawTimestamp = timestamp || performance.now();
        } catch (e) {}
        try {
            const canvas = this.cooldownCanvas;
            if (!canvas) return;
            const dpr = window.devicePixelRatio || 1;
            const rect = document.documentElement.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            const cw = Math.floor(width * dpr);
            const ch = Math.floor(height * dpr);
            if (canvas.width !== cw || canvas.height !== ch) {
                canvas.width = cw;
                canvas.height = ch;
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;
            }
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            // reset transform/clear
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.scale(dpr, dpr);
            const now = new Date();
            try { if (!this._lastDebugLogTime) this._lastDebugLogTime = 0; } catch(e) { this._lastDebugLogTime = 0; }
            for (const [id, entry] of this._placeholderRegistry) {
                try {
                    const { el, start, end } = entry;
                    // debug: occasional log (disabled to avoid console spam)
                    if (!el || !start || !end) continue;
                    // Skip canvas drawing for the camp CSS-driven placeholder so we don't double-draw
                    try {
                        if (id === 'camp-progress-placeholder' || (el.classList && el.classList.contains && el.classList.contains('camp-anim'))) {
                            continue;
                        }
                    } catch (e) {}
                    if (now < start || now >= end) continue;
                    const pct = Math.min(1, (now - start) / (end - start));
                    const r = el.getBoundingClientRect();
                    const x = r.left;
                    const y = r.top;
                    const w = r.width;
                    const h = r.height;
                    // Skip if the element itself has zero size
                    if (w <= 0 || h <= 0) continue;
                    // Skip if any ancestor clips this element to zero height
                    // (e.g. the actions-tray collapses to height:0 with overflow:hidden —
                    // getBoundingClientRect on the child still reports its own full size,
                    // so we must check the ancestor chain ourselves)
                    let hidden = false;
                    try {
                        let ancestor = el.parentElement;
                        while (ancestor && ancestor !== document.body) {
                            const cs = window.getComputedStyle(ancestor);
                            if (cs.overflow === 'hidden' || cs.overflowY === 'hidden') {
                                const ar = ancestor.getBoundingClientRect();
                                if (ar.height <= 0 || ar.width <= 0) { hidden = true; break; }
                                // also skip if the element's top edge is below the ancestor's bottom
                                if (r.top >= ar.bottom || r.bottom <= ar.top) { hidden = true; break; }
                            }
                            ancestor = ancestor.parentElement;
                        }
                    } catch(e) {}
                    if (hidden) continue;
                    // draw a semi-opaque overlay matching the original style
                    ctx.fillStyle = 'rgba(249,177,21,0.6)';
                    ctx.fillRect(x, y, w * pct, h);
                    // debug: draw logging disabled to avoid frequent console output
                } catch (inner) {
                    // skip problematic element
                }
            }

            // restore transform before next frame
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        } catch (e) {
            console.warn('Error drawing cooldowns', e);
        }

        // Schedule next frame while there are active cooldowns or forced draw is enabled
        try {
            if (this.hasActiveCooldowns() || this._forcedDraw) {
                this.cooldownAnimationFrame = requestAnimationFrame(this.drawCooldowns);
            } else {
                this.cooldownAnimationFrame = null;
            }
        } catch (e) {
            this.cooldownAnimationFrame = null;
        }
    }

    // Returns true when any placeholder indicates an in-progress cooldown
    hasActiveCooldowns = () => {
        try {
            const now = new Date();
            for (const [, entry] of this._placeholderRegistry) {
                const { start, end } = entry;
                if (!start || !end) continue;
                if (now >= start && now < end) return true;
            }
        } catch (e) {
            return false;
        }
        return false;
    }
    
    // ref callback used to register/unregister placeholders
    placeholderRef = (el, id, start, end) => {
        try {
            this._cleanupTimeouts = this._cleanupTimeouts || {};
            if (el) {
                if (this._cleanupTimeouts[id]) {
                    clearTimeout(this._cleanupTimeouts[id]);
                    delete this._cleanupTimeouts[id];
                }
                // normalize start/end to Date
                const s = start ? new Date(start) : null;
                const e = end ? new Date(end) : null;
                this._placeholderRegistry.set(id, { el, start: s, end: e });
                // For CSS-animated elements (camp-anim), set animationDuration and animationDelay
                // imperatively on first mount so React re-renders never touch those properties.
                // Changing animationDelay on an already-running element restarts the animation,
                // causing the visible jumps. We only set it if not already applied.
                try {
                    if (el.classList && el.classList.contains('camp-anim') && el._campAnimApplied !== `${start}-${end}`) {
                        const now = new Date();
                        const totalSeconds = (s && e) ? Math.max(0, (e - s) / 1000) : 0;
                        const elapsedSeconds = s ? Math.max(0, (now - s) / 1000) : 0;
                        el.style.animationDuration = `${totalSeconds}s`;
                        el.style.animationDelay = `-${elapsedSeconds}s`;
                        el._campAnimApplied = `${start}-${end}`;
                    }
                } catch (e) {}
                // ensure the draw loop is running when a new active placeholder is registered
                try {
                    if (!this.cooldownAnimationFrame && (this.hasActiveCooldowns() || this._forcedDraw)) {
                        this.cooldownAnimationFrame = requestAnimationFrame(this.drawCooldowns);
                    }
                } catch (e) {}
            } else {
                const existing = this._placeholderRegistry.get(id);
                if (existing) {
                    existing.pending = true;
                }
                // Only fully remove the entry (and possibly stop the loop) if this id was
                // never re-registered within the same microtask — schedule cleanup deferred.
                this._schedulePlaceholderCleanup(id);
            }
        } catch (e) {
            // ignore
        }
    }

    // Deferred cleanup: if a placeholder id has pending===true after a short delay it has
    // truly unmounted (component removed), so stop the loop if no more active entries.
    _schedulePlaceholderCleanup = (id) => {
        try {
            setTimeout(() => {
                try {
                    const entry = this._placeholderRegistry.get(id);
                    if (!entry || !entry.pending) return; // re-mounted, skip
                    this._placeholderRegistry.delete(id);
                    if (!this.hasActiveCooldowns() && !this._forcedDraw && this.cooldownAnimationFrame) {
                        cancelAnimationFrame(this.cooldownAnimationFrame);
                        this.cooldownAnimationFrame = null;
                        if (this.cooldownCanvas) {
                            const ctx = this.cooldownCanvas.getContext && this.cooldownCanvas.getContext('2d');
                            if (ctx) ctx.clearRect(0, 0, this.cooldownCanvas.width, this.cooldownCanvas.height);
                        }
                    }
                } catch(e) {}
            }, 100);
        } catch(e) {}
    }
    logMeta = () => {
        const meta = getMeta(); // eslint-disable-line no-unused-vars
    }
    setNewRespawnDate = () => {
        let soon = new Date().addMinutes(MONSTER_RESPAWN_MINUTES)
        let meta = getMeta();
        meta.respawnDate = soon;
        storeMeta(meta)


        let respawn = new Date(soon);
        let now = new Date();
        let diffInMinutes = diff_minutes(respawn, now);


        let respawnString = `${diffInMinutes} m`

        this.setState({
            timeToRespawn: respawnString,
        })
    }
    pickRandom = (array) => {
        let index = Math.floor(Math.random() * array.length)
        return array[index]
    }
    triggerLootRadialArc = (lootInput, tile = null) => {
        const rawItems = Array.isArray(lootInput) ? lootInput : [lootInput];
        const newItems = rawItems.map(item => {
            let resolvedIcon = item.icon;
            if (typeof resolvedIcon === 'string' && images[resolvedIcon]) {
                resolvedIcon = images[resolvedIcon];
            }
            if (resolvedIcon && typeof resolvedIcon === 'object') {
                resolvedIcon = resolvedIcon.default || resolvedIcon;
            }
            if (resolvedIcon && typeof resolvedIcon === 'object') {
                resolvedIcon = resolvedIcon.default || resolvedIcon;
            }
            return {
                ...item,
                icon: typeof resolvedIcon === 'string' ? resolvedIcon : resolvedIcon
            };
        });
        
        if (this._chestLootTimer) {
            clearTimeout(this._chestLootTimer);
            this._chestLootTimer = null;
        }
        if (this._chestLootCleanupTimer) {
            clearTimeout(this._chestLootCleanupTimer);
            this._chestLootCleanupTimer = null;
        }

        let chestLootStyle = null;
        if (tile && tile.id !== undefined && tile.id !== null) {
            const index = Number(tile.id);
            if (!isNaN(index)) {
                const pixel = this.getPixelForIndex(index);
                if (pixel) {
                    chestLootStyle = {
                        left: pixel.left,
                        top: pixel.top,
                        transform: 'translate3d(0px, 0px, 0px)'
                    };
                }
            }
        }

        this.setState(prevState => {
            const baseList = prevState.chestLootFadeOut ? [] : prevState.activeChestLoot;
            return {
                activeChestLoot: [...baseList, ...newItems],
                chestLootVisible: true,
                chestLootFadeOut: false,
                chestLootStyle: chestLootStyle
            };
        }, () => {
            this._chestLootTimer = this._setTimeout(() => {
                this.setState({ chestLootFadeOut: true });
                
                this._chestLootCleanupTimer = this._setTimeout(() => {
                    this.setState({
                        activeChestLoot: [],
                        chestLootVisible: false,
                        chestLootFadeOut: false,
                        chestLootStyle: null
                    });
                }, 300);
            }, 3500);
        });
    }
    addCurrencyToInventory = (data, tile = null) => {
        let type;
        switch(data.type){
            case 'gold':
                type = 'gold';
            break;
            case 'shimmering_dust':
                type = 'shimmering dust'
            break;
            case 'totems':
                type = data.amount > 1 ? 'totems' : 'totem'
            break;
            default:
            break;
        }
        this.displayMessage(`You found ${data.amount} ${type}!`)
        this.props.inventoryManager.addCurrency(data)

        if (this.props.boardManager && (this.props.boardManager.chestPickupInProgress || this.props.boardManager.treasurePickupInProgress)) {
            let iconKey = 'gold';
            if (data.type === 'shimmering_dust' || data.type === 'shimmering dust') {
                iconKey = 'magic_moon_1';
            } else if (data.type === 'totems' || data.type === 'totem') {
                iconKey = 'eclipse';
            }
            this.triggerLootRadialArc({
                type: 'currency',
                id: data.type + '_' + Math.random(),
                icon: iconKey === 'gold' ? images.getRandomGoldIcon() : (images[iconKey] || images['gold'] || null),
                name: `${data.amount} ${type}`
            }, tile);
        }
    }
    getFoodLimit = () => {
        const crew = (this.props.crewManager && Array.isArray(this.props.crewManager.crew))
            ? this.props.crewManager.crew
            : [];
        const collectiveLevel = crew.reduce((sum, member) => {
            const level = Number(member && member.level);
            return sum + (Number.isFinite(level) ? level : 0);
        }, 0);

        // Base limit: 100 + collective level * 50
        let limit = 100 + collectiveLevel * 50;

        // Apply passives and class expertise
        crew.forEach(member => {
            if (!member) return;
            const type = String(member.type || '').toLowerCase();
            if (type === 'ranger' || type === 'sage') {
                limit += 50;
            }

            const globalSkills = Array.isArray(member.globalSkills) ? member.globalSkills : [];
            const skills = Array.isArray(member.skills) ? member.skills : [];
            const allMemberSkills = [...globalSkills, ...skills].map(s => typeof s === 'string' ? s : (s && s.key)).filter(Boolean);
            
            if (allMemberSkills.includes('hunters_quarry')) {
                limit += 100;
            }
            if (allMemberSkills.includes('scrounging_rat')) {
                limit += 150;
            }
        });

        return limit;
    }

    checkFoodExpiry = () => {
        const meta = getMeta();
        if (!meta) return;

        const now = Date.now();
        
        // Initialize last check timestamp if not present
        if (!meta.lastFoodExpiryCheck) {
            meta.lastFoodExpiryCheck = now;
            storeMeta(meta);
            try { updateUserRequest(getUserId(), meta).catch(() => {}); } catch (e) {}
            return;
        }

        const elapsed = now - meta.lastFoodExpiryCheck;
        const ONE_HOUR = 3600000; // 1 hour in ms

        if (elapsed >= ONE_HOUR) {
            const hoursPassed = Math.floor(elapsed / ONE_HOUR);
            const foodLimit = this.getFoodLimit();
            const currentFood = typeof meta.food === 'number' ? meta.food : 55;

            // Advance the last check timestamp by the integer hours that passed
            meta.lastFoodExpiryCheck = meta.lastFoodExpiryCheck + hoursPassed * ONE_HOUR;

            if (currentFood > foodLimit) {
                const goneBadAmount = currentFood - foodLimit;
                meta.food = foodLimit;

                // Trigger the popup
                this.setState({
                    showFoodGoneBadPopup: true,
                    foodGoneBadAmount: goneBadAmount,
                    foodGoneBadLimit: foodLimit
                });

                // Display message
                this.displayMessage(`⚠️ ${goneBadAmount} food has gone bad!`);
            }

            storeMeta(meta);
            try { updateUserRequest(getUserId(), meta).catch(() => {}); } catch (e) {}
            this.forceUpdate();
        }
    }

    addFoodToSupplies = () => {
        const crew = (this.props.crewManager && Array.isArray(this.props.crewManager.crew))
            ? this.props.crewManager.crew
            : [];
        const collectiveLevel = crew.reduce((sum, member) => {
            const level = Number(member && member.level);
            return sum + (Number.isFinite(level) ? level : 0);
        }, 0);

        let foodAmount = 30;
        if (collectiveLevel >= 20) {
            foodAmount = 90;
        } else if (collectiveLevel >= 11) {
            foodAmount = 60;
        }

        const meta = getMeta() || {};
        meta.food = (typeof meta.food === 'number' ? meta.food : 0) + foodAmount;
        storeMeta(meta);
        try { updateUserRequest(getUserId(), meta).catch(() => {}); } catch (e) {}

        this.displayMessage(`You found food! +${foodAmount} supplies`);
        this.forceUpdate();
    }
    establishAnimationCallback = () => {
        this.props.animationManager.establishAnimationCallback(this.renderAnimation)
    }
    checkItemRetrievalQuests = (itemDisplayName) => {
        if (this.props.questManager) {
            // Collector's run progress
            this.props.questManager.updateProgressByType('item_retrieval', 1);

            // Specific item retrieval check
            const activeQuests = this.props.questManager.getActiveQuests() || [];
            const retrievalQuests = activeQuests.filter(q => q.key === 'recover_the_artifact');
            retrievalQuests.forEach(q => {
                if (q.context && q.context.item && itemDisplayName && itemDisplayName.toLowerCase().includes(q.context.item.toLowerCase())) {
                    this.props.questManager.updateProgress(q.id, 1);
                }
            });
        }
    }
    addItemToInventory = (tile) => {
        //this is coming from a board tile
        const tileContains = tile.contains;
        const itemDefinition = this.props.inventoryManager.allItems[tileContains];
        const itemDisplayName = itemDefinition?.name || (typeof tileContains === 'string' ? tileContains.replaceAll('_', ' ') : tileContains);
        if (itemDefinition) {
            this.props.inventoryManager.addItem(itemDefinition)
        }
        
        // Progress item retrieval quests
        this.checkItemRetrievalQuests(itemDisplayName);

        const matrix = this.state.inventoryHoverMatrix;
        this.getCombinedInventory().forEach((e,i)=>{
            matrix[i] = '';
        })
        this.displayMessage(`You found a ${itemDisplayName}!`)
        this.setState({
            inventoryHoverMatrix: matrix
        })

        if (this.props.boardManager && (this.props.boardManager.chestPickupInProgress || this.props.boardManager.treasurePickupInProgress)) {
            const iconKey = itemDefinition?.icon || tileContains;
            this.triggerLootRadialArc({
                type: 'item',
                id: tileContains + '_' + Math.random(),
                icon: images[iconKey] || images[tileContains] || images['treasure'] || null,
                name: itemDisplayName
            }, tile);
        }
    }
    addTreasureToInventory = (treasure, tile = null) => {
        let item = treasure.item
        const message = `You open the treasure chest and find a ${item.replaceAll('_',' ')} and ${treasure.currency.amount} ${treasure.currency.type.replace('_',' ')}!`
        this.displayMessage(message);
        this.props.inventoryManager.addItem(this.props.inventoryManager.allItems[treasure.item])
        this.props.inventoryManager.addCurrency(treasure.currency);

        const itemDefinition = this.props.inventoryManager.allItems[treasure.item];
        const itemDisplayName = itemDefinition?.name || item.replaceAll('_', ' ');
        const itemIconName = itemDefinition?.icon || treasure.item;
        
        // Progress item retrieval quests
        this.checkItemRetrievalQuests(itemDisplayName);
        
        let currencyType = treasure.currency.type;
        let currencyIconKey = 'gold';
        if (currencyType === 'shimmering_dust' || currencyType === 'shimmering dust') {
            currencyIconKey = 'magic_moon_1';
        } else if (currencyType === 'totems' || currencyType === 'totem') {
            currencyIconKey = 'eclipse';
        }

        this.triggerLootRadialArc([
            {
                type: 'item',
                id: treasure.item + '_' + Math.random(),
                icon: images[itemIconName] || images[treasure.item] || images['treasure'] || null,
                name: itemDisplayName
            },
            {
                type: 'currency',
                id: treasure.currency.type + '_' + Math.random(),
                icon: currencyIconKey === 'gold' ? images.getRandomGoldIcon() : (images[currencyIconKey] || images['gold'] || null),
                name: `${treasure.currency.amount} ${treasure.currency.type}`
            }
        ], tile);
    }
    useConsumableFromInventory = (item) => {
        let foundItem = this.props.inventoryManager.inventory.find(e=> e.name === item.name),
        foundIndex = this.props.inventoryManager.inventory.findIndex(e=> e.name === item.name);
        if (foundItem) {
            foundItem.animation = 'consumed';
            this.forceUpdate();
            this._setTimeout(()=>{
                foundItem.animation = '';
                this.props.inventoryManager.removeItemByIndex(foundIndex)
                this.forceUpdate();
                this.props.saveUserData();
            }, 500)
        }
    }
    updateDungeon = async (dungeon) => {
        await updateDungeonRequest(dungeon.id, dungeon);
    }
    messaging = (message) => {
        this.displayMessage(message)
        if (typeof message === 'string') {
            if (message.startsWith('✍') || message.startsWith('📝') || message.includes('inscription')) {
                try {
                    if (this.props.questManager) {
                        this.props.questManager.updateProgressByType('inscription', 1);
                    }
                } catch (e) {}
            }
        }
    }
    setPending = (pendingState) => {
        this.setState({pending: pendingState})
    }
    syncVisibleVendorIndicators = (tilesForBoard) => {
        if (!Array.isArray(tilesForBoard) || !Array.isArray(this.state.minimapIndicators)) return null;
        const activeMinimapIndex = this.state.minimap.findIndex(e => e.active);
        if (activeMinimapIndex < 0 || !this.state.minimapIndicators[activeMinimapIndex]) return null;

        const nextIndicators = this.state.minimapIndicators.map((group) => ({
            ...(group || {}),
            enemies: Array.isArray(group?.enemies) ? [...group.enemies] : [],
            gates: Array.isArray(group?.gates) ? [...group.gates] : [],
            merchant: Array.isArray(group?.merchant) ? [...group.merchant] : [],
            stairs: Array.isArray(group?.stairs) ? [...group.stairs] : [],
            misc: Array.isArray(group?.misc) ? [...group.misc] : [],
            custom: Array.isArray(group?.custom) ? [...group.custom] : []
        }));

        const seenVendorGroups = new Set();
        const merchantMarkers = [];

        tilesForBoard.forEach((tile) => {
            if (!tile || tile.color === 'black') return;
            const contains = tile.contains;
            if (!contains || typeof contains !== 'object' || contains.type !== 'vendor') return;

            const vendorGroupId = contains.vendorGroupId || `${contains.subtype || 'vendor'}_${tile.id}`;
            if (seenVendorGroups.has(vendorGroupId)) return;
            seenVendorGroups.add(vendorGroupId);

            merchantMarkers.push({
                type: contains.subtype || 'merchant',
                tileId: tile.id,
                vendorGroupId
            });
        });

        // Persist discovered merchants: once a vendor group has been seen on the minimap,
        // keep its marker even if it is no longer currently visible.
        const existingMerchantMarkers = Array.isArray(nextIndicators[activeMinimapIndex].merchant)
            ? nextIndicators[activeMinimapIndex].merchant
            : [];
        const mergedByKey = new Map();
        existingMerchantMarkers.forEach((marker) => {
            if (!marker) return;
            const key = marker.vendorGroupId || `legacy_${marker.tileId}`;
            mergedByKey.set(key, marker);
        });
        merchantMarkers.forEach((marker) => {
            if (!marker) return;
            const key = marker.vendorGroupId || `legacy_${marker.tileId}`;
            if (!mergedByKey.has(key)) mergedByKey.set(key, marker);
        });

        nextIndicators[activeMinimapIndex].merchant = Array.from(mergedByKey.values());
        return nextIndicators;
    }
    refreshTiles = (levelIdOverride) => {
        const bm = this.props.boardManager;
        // Use the board-manager's array references directly — never spread them.
        // Keeping a stable reference means React.memo can skip re-rendering Tile
        // components that pass boardTiles={state.tiles} when the array hasn't changed.
        const newTiles = bm.tiles;
        const newOverlayTiles = bm.overlayTiles;

        // ── Terrain assignment ─────────────────────────────────────────────────────
        // Runs BEFORE the try/catch so any error in board-context detection cannot
        // accidentally skip texture assignment (which was the root cause of intermittent
        // white tiles).  Only touches tiles that don't yet have terrain assigned.
        //
        //   • Board transition: initializeTilesFromMap creates new tile objects with no
        //     `terrain` property → ALL non-void visible tiles get terrain here.
        //   • Interior step: handleFogOfWar runs first, coloring newly-revealed tiles.
        //     Those tiles still have terrain===undefined → assigned here.  Already-
        //     revealed tiles keep their terrain (fast-path guard).
        //
        // Cost: O(225) guard checks (single property read).  Actual assignments are
        //       O(N_revealed) — typically 0-5 per interior step.
        try {
            if (Array.isArray(newTiles) && typeof bm.getContainsType === 'function') {
                const meta2 = getMeta() || {};
                const activeLevel2 = this.state.levelTracker ? this.state.levelTracker.find(e => e.active) : null;
                const terrainLevelId = levelIdOverride !== undefined
                    ? Number(levelIdOverride)
                    : (activeLevel2 != null ? Number(activeLevel2.id) : Number(meta2.location?.levelId ?? 0));
                const terrainSet = images.getTerrainSetForLevel(terrainLevelId);
                for (let i = 0; i < newTiles.length; i++) {
                    const t = newTiles[i];
                    if (!t || t.terrain) continue;  // already assigned — fast path
                    const containsType = bm.getContainsType(t.contains);
                    if (containsType === 'void') continue;
                    // Pre-assign terrain to ALL non-void tiles, including currently-hidden
                    // (black) ones.  This eliminates the one-frame gap where a newly-revealed
                    // tile has no texture: by the time fog-of-war reveals it, terrain is
                    // already set.  The Tile component only renders the terrain-bg overlay
                    // when props.color !== 'black', so hidden tiles incur no visual cost.
                    const variantIndex = Math.abs(t.id * 2654435761 >>> 0) % 16;
                    t.terrain = terrainSet[variantIndex];
                }
            }
        } catch (terrainErr) {
            console.warn('refreshTiles: terrain assignment failed:', terrainErr);
        }

        try {
            // Build a key that uniquely identifies the current board section + level.
            const meta = getMeta() || {};
            const activeLevel = this.state.levelTracker ? this.state.levelTracker.find(e => e.active) : null;
            const currentLevelId = levelIdOverride !== undefined
                ? Number(levelIdOverride)
                : (activeLevel != null ? Number(activeLevel.id) : Number(meta.location?.levelId ?? 0));
            const currentBoardIndex = bm.playerTile ? bm.playerTile.boardIndex : null;
            const boardContextKey = `${currentBoardIndex}:${currentLevelId}`;
            const boardChanged = this._lastRefreshBoardKey !== boardContextKey;

            if (boardChanged) {
                this._lastRefreshBoardKey = boardContextKey;
            }

            if (boardChanged) {
                // ── Board transition or level change ─────────────────────────────
                // Sync minimap vendor indicators and schedule image preloading.
                const syncedIndicators = this.syncVisibleVendorIndicators(newTiles);
                const hasNewMonsterSightings = this.recordAdjacentMonsterSightings(newTiles, false);
                this.setState({
                    tiles: newTiles,
                    overlayTiles: newOverlayTiles,
                    minimapIndicators: syncedIndicators || this.state.minimapIndicators
                });
                if (hasNewMonsterSightings) this.persistBreadcrumbsToMeta();
                // Preload portrait images for the new board on the next idle frame.
                this._schedulePreloadBoardImages();
            } else {
                // ── Interior move — same board section ───────────────────────────
                // Pass the stable bm.tiles reference so React.memo can skip re-rendering
                // Tile components whose individual props haven't changed.
                const hasNewMonsterSightings = this.recordAdjacentMonsterSightings(newTiles, false);
                // If handleDirectionalMove set _batchingWithAnimation, it will include
                // tiles in its own combined animation setState — skip the standalone
                // setState here to avoid a redundant render cycle in React 16
                // (which doesn't auto-batch setStates in native event handlers).
                if (!this._batchingWithAnimation) {
                    this.setState({ tiles: newTiles, overlayTiles: newOverlayTiles });
                }
                if (hasNewMonsterSightings) this.persistBreadcrumbsToMeta();
            }
        } catch (e) {
            // Defensive fallback — if board-context detection fails run a full refresh.
            console.warn('refreshTiles: board-context check failed, running full refresh:', e);
            try {
                const syncedIndicators = this.syncVisibleVendorIndicators(newTiles);
                const hasNewMonsterSightings = this.recordAdjacentMonsterSightings(newTiles, false);
                this.setState({
                    tiles: newTiles,
                    overlayTiles: newOverlayTiles,
                    minimapIndicators: syncedIndicators || this.state.minimapIndicators
                });
                if (hasNewMonsterSightings) this.persistBreadcrumbsToMeta();
            } catch (e2) {
                console.warn('refreshTiles: fallback also failed:', e2);
            }
        }
    }
    triggerMonsterBattle = (bool, tileId) => {
        if (bool) {
            this.reduxCombatManager = new CombatManagerRedux();
        } else {
            this.reduxCombatManager = null;
        }
        // When entering combat: remember current side-panel state and
        // collapse both panels. On exit, restore the saved state.
        try {
            if (bool) {
                // entering combat - save previous panel expand/collapse state
                this._preCombatPanels = {
                    left: !!this.state.leftPanelExpanded,
                    right: !!this.state.rightPanelExpanded
                };
                this.setState({
                    keysLocked: bool,
                    inMonsterBattle: bool,
                    monsterBattleTileId: tileId,
                    leftPanelExpanded: false,
                    rightPanelExpanded: false
                });
            } else {
                // exiting combat - restore previous panel state if we saved it
                const prev = this._preCombatPanels || { left: false, right: false };
                this.setState({
                    keysLocked: bool,
                    inMonsterBattle: bool,
                    monsterBattleTileId: tileId,
                    leftPanelExpanded: !!prev.left,
                    rightPanelExpanded: !!prev.right
                });
                this._preCombatPanels = null;
            }
        } catch (e) {
            // Fallback to original behavior if anything goes wrong
            this.setState({
                keysLocked: bool,
                inMonsterBattle: bool,
                monsterBattleTileId: tileId
            })
        }
    }
    wireMonsterBattleRefToWizardAI = () => {
        const cm = this.reduxCombatManager || this.props.combatManager;
        if (cm && cm.fighterAI && cm.fighterAI.roster && cm.fighterAI.roster.wizard) {
            this.monsterBattleComponentRef.current &&
            (cm.fighterAI.roster.wizard.monsterBattleRef = this.monsterBattleComponentRef.current);
        }
    };
    setMonster = (monsterString) => {
        // monsterString = 'beholder'
        let monster = this.props.monsterManager.getMonster(monsterString), 
        minions = null;
        if(monster && monster.minions){
            minions = [];
            monster.minions.forEach((e,i)=>{
                const minion = this.props.monsterManager.getMonster(e)
                minion.id = minion.id + (i * 10) + 700;
                let minionName = this.pickRandom(minion.monster_names) || (minion.type ? minion.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Unknown');
                minion.name = minionName
                minion.inventory = [];

                minions.push(minion)
            })
        }


        if(!monster) monster = this.props.monsterManager.getRandomMonster();
        let monsterName = this.pickRandom(monster.monster_names) || (monster.type ? monster.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Unknown');
        monster.name = monsterName
        monster.inventory = [];
        this.setState({
            monster,
            minions
        })
    }
    startAmbushCombat = () => {
        if (this.ambushTimeout) {
            clearTimeout(this.ambushTimeout);
            this.ambushTimeout = null;
        }
        const monster = this.state.ambushMonster;
        if (!monster) return;

        let minions = null;
        if (monster.minions) {
            minions = [];
            monster.minions.forEach((e, i) => {
                const minion = this.props.monsterManager.getMonster(e);
                if (minion) {
                    minion.id = minion.id + (i * 10) + 700;
                    let minionName = this.pickRandom(minion.monster_names) || (minion.type ? minion.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Unknown');
                    minion.name = minionName;
                    minion.inventory = [];
                    minions.push(minion);
                }
            });
        }

        if (!monster.name) {
            monster.name = this.pickRandom(monster.monster_names) || (monster.type ? monster.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Unknown');
        }
        monster.inventory = [];

        this.setState({
            showAmbushPopup: false,
            monster,
            minions
        }, () => {
            const playerIdx = this.props.boardManager ? this.props.boardManager.getIndexFromCoordinates(this.props.boardManager.playerTile.location) : null;
            this.triggerMonsterBattle(true, playerIdx);
        });
    }

    calculateTrapDamage = () => {
        const meta = getMeta() || {};
        const crew = meta.crew || [];

        // Calculate collective crew level
        const collectiveLevel = crew.reduce((sum, m) => sum + ((m && !m.dead && typeof m.level === 'number') ? m.level : 0), 0);

        // Determine damage range based on collective level
        let minDmg, maxDmg;
        if (collectiveLevel <= 8) { minDmg = 5; maxDmg = 15; }
        else if (collectiveLevel <= 14) { minDmg = 15; maxDmg = 30; }
        else { minDmg = 30; maxDmg = 50; }

        // Get Keen Eye level for DEX save bonus
        const keenEyeLevel = this.getKeenEyeLevel();
        const keenEyeDexBonus = keenEyeLevel >= 3 ? 3 : 0;

        const DC = 12; // Difficulty class for DEX save
        const crewResults = [];

        crew.forEach((m, idx) => {
            if (!m || m.dead) return;

            const dex = (m.stats && typeof m.stats.dex === 'number') ? m.stats.dex : 1;
            const d20Roll = Math.floor(Math.random() * 20) + 1; // 1-20
            const totalRoll = d20Roll + dex + keenEyeDexBonus;
            const saved = totalRoll >= DC;

            let damageTaken = 0;
            if (!saved) {
                damageTaken = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
                const maxHp = (m.stats && typeof m.stats.hp === 'number') ? m.stats.hp : 1;
                const currentHp = (typeof m.hp !== 'undefined') ? m.hp : maxHp;
                const newHp = Math.max(0, currentHp - damageTaken);
                m.hp = newHp;
                // Mark dead if HP reaches 0
                if (newHp <= 0) {
                    m.dead = true;
                }

                // Sync damage/death changes directly to live crewManager.crew references
                if (this.props.crewManager && Array.isArray(this.props.crewManager.crew)) {
                    const liveMember = this.props.crewManager.crew.find(c => c && c.id === m.id);
                    if (liveMember) {
                        liveMember.hp = newHp;
                        if (newHp <= 0) {
                            liveMember.dead = true;
                        }
                    }
                }
            }

            crewResults.push({
                name: m.name || 'Unknown',
                type: (m.type || '').toLowerCase(),
                dexStat: dex,
                d20Roll,
                keenEyeBonus: keenEyeDexBonus,
                totalRoll,
                saved,
                damageTaken
            });
        });

        if (this.props.crewManager && Array.isArray(this.props.crewManager.crew)) {
            this.props.crewManager.crew = [...this.props.crewManager.crew];
        }

        // Persist HP/dead changes
        try { storeMeta(meta); } catch (e) {}
        try { if (this.props.saveUserData) this.props.saveUserData(); } catch (e) {}
        this.forceUpdate();

        return {
            collectiveLevel,
            damageRange: `${minDmg}-${maxDmg}`,
            keenEyeLevel,
            crewResults
        };
    }

    dismissTrapPopup = () => {
        this.setState({
            showTrapPopup: false,
            trapResults: null,
            keysLocked: false
        });
    }

    getCurrentInventory = () => {
        return this.props.inventoryManager.inventory;
    }
    
    getCombinedInventory = () => {
        const inv = [...((this.props.inventoryManager && this.props.inventoryManager.inventory) || [])];
        const meta = getMeta() || {};
        const soulShards = meta.soulShards || {};
        Object.keys(soulShards).forEach((monsterType) => {
            const count = soulShards[monsterType];
            if (count > 0) {
                for (let i = 0; i < count; i++) {
                    inv.push({
                        id: `soul_shard_${monsterType}_${i}`,
                        name: `${monsterType.charAt(0).toUpperCase() + monsterType.slice(1)} Shard`,
                        type: 'soul_shard',
                        monsterType: monsterType,
                        count: count,
                        icon: images['sould_shards'] || 'sould_shards',
                        description: `A soul shard of a ${monsterType}. Collect 3 to forge an Echo Card at the Pyre & Echo camp station.`
                    });
                }
            }
        });
        return inv;
    }
    
    handleLevelChange = (newLevelId) => {
        const levelTracker = this.state.levelTracker;
        levelTracker.forEach(e=>e.active = false)
        const level = levelTracker.find(e=>e.id === newLevelId);
        if(!level){
            // level missing -- initialize better
            debugger
        }
        level.active = true;


        const meta = getMeta();
        let orientation = this.props.boardManager.currentOrientation;
        let indicatorsGroup = meta.minimapIndicators.find(e=>e.level === level.id && e.orientation === orientation)
        

        

        if(!indicatorsGroup){
            let newIndicators = []
            for(let i = 0; i < 9; i++){
                newIndicators.push({
                    enemies: [],
                    gates: [],
                    merchant: [],
                    stairs: [],
                    misc: [],
                    custom: []
                })
            }
            indicatorsGroup = {
                level: level.id,
                orientation,
                indicators: newIndicators
            }
            meta.minimapIndicators.push(indicatorsGroup)
            storeMeta(meta)
        }
        // Keep meta.location.levelId in sync so other code reading meta gets the right level
        if (meta.location) {
            meta.location.levelId = newLevelId;
            storeMeta(meta);
        }

        // Progress travel quests
        if (this.props.questManager) {
            const activeQuests = this.props.questManager.getActiveQuests() || [];
            const travelQuests = activeQuests.filter(q => q.type === 'travel');
            travelQuests.forEach(q => {
                const targetLvl = parseInt(q.context?.level, 10);
                const currentLvl = parseInt(newLevelId, 10);
                if (!isNaN(targetLvl) && !isNaN(currentLvl) && currentLvl >= targetLvl) {
                    this.props.questManager.updateProgress(q.id, 1);
                } else if (q.context?.level === newLevelId) {
                    this.props.questManager.updateProgress(q.id, 1);
                }
            });
        }

        this.setState({
            levelTracker,
            minimapZoomedTile: null,
            minimapIndicators: indicatorsGroup.indicators
        })
        // Re-assign terrain now that the level is confirmed, bypassing the stale meta.
        this.refreshTiles(newLevelId);
    }
    boardTransition = (direction) => {
        const minimap = this.state.minimap;
        const currentIndex = minimap.findIndex(e=>e.active === true);
        let newIndex;
        minimap.forEach(e=>e.active = false)
        switch(direction){
            case 'left': 
                newIndex = currentIndex-1;
            break;
            case 'right':
                newIndex = currentIndex+1;
            break;
            case 'up':
                newIndex = currentIndex-3;
            break;
            case 'down':
                newIndex = currentIndex+3;
            break;
            default:
                break;
        }
        let zoomed = null;
        if(this.state.minimapZoomedTile !== null){
            zoomed = newIndex;
        }
        minimap[newIndex].active = true;
        this.setState({
            minimap,
            minimapZoomedTile: zoomed
        })
    }
    getTileSize(){
        const h = Math.floor((window.innerHeight/17));
        const w = Math.floor((window.innerWidth/17));
        let tsize = 0;
        if(h < w){
            tsize = h;
          } else {
            tsize = w;
        }
        return tsize;
    }

    handleResize() {
        let tileSize = this.getTileSize(),
            boardSize = tileSize*15;

        this.setState((state, props) => {
            return {
                tileSize,
                boardSize
            }
        }, () => {
            try {
                const bm = this.props.boardManager;
                if (bm && bm.playerTile && bm.playerTile.location && !this.state.playerAnimating) {
                    this.updateFloatingPlayerPosition(bm.playerTile.location);
                }
            } catch (e) {}
        })
    }

    initializeListeners = () => {
        window.addEventListener('keydown', this.keyDownHandler);
        // window.addEventListener('mouseup', this.mouseUpHandler);
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    startSaveInterval = () => {
        let intervalId = this._setInterval( async () => {
            this.setState(()=>{
                return {
                    showMessage : true
                }
            })
            this.props.saveUserData()
            this.displayMessage('saving...')
        }, 45000); 
        this.setState({intervalId: intervalId})
    }
    displayMessage = (message) => {
        if (!message) return;

        const msgStr = typeof message === 'string' ? message.toLowerCase() : '';
        if (msgStr === 'saving-start' || msgStr === 'saving...') {
            this.setState({ showSaveIndicator: true, saveIndicatorText: 'Saving...' });
            return;
        }
        if (msgStr === 'progress saved') {
            this.setState({ showSaveIndicator: true, saveIndicatorText: 'Saved' });
            this._setTimeout(() => {
                this.setState({ showSaveIndicator: false });
            }, 1000);
            return;
        }
        if (msgStr === 'saving-error') {
            this.setState({ showSaveIndicator: true, saveIndicatorText: 'Save Failed' });
            this._setTimeout(() => {
                this.setState({ showSaveIndicator: false });
            }, 1500);
            return;
        }

        // Determine if this is a high-priority / pickup message
        const isPickup = typeof message === 'string' && (
            message.toLowerCase().includes('you found') || 
            message.toLowerCase().includes('soul shard:')
        );

        const now = Date.now();

        // If there is an active lock and the incoming message is NOT a pickup message, ignore it
        if (this._messageLockUntil && now < this._messageLockUntil && !isPickup) {
            return;
        }

        // Duration: 5 seconds for pickup messages, 2.5 seconds for standard ones
        const duration = isPickup ? 5000 : 2500;

        // Set or clear priority lock
        if (isPickup) {
            this._messageLockUntil = now + duration;
        } else {
            this._messageLockUntil = 0;
        }

        // Unique token for debouncing overlapping setTimeout calls
        const msgToken = Math.random().toString(36).substring(2);
        this._currentMessageToken = msgToken;

        this.setState({
            showMessage: true,
            messageToDisplay: message
        });

        this._setTimeout(() => {
            if (this._currentMessageToken === msgToken) {
                this.setState({
                    showMessage: false
                });
                this._messageLockUntil = 0;
            }
        }, duration);
    }
    displayMessageAndHold = (message) => {
        this._messageLockUntil = 0;
        this._currentMessageToken = 'hold';
        this.setState({
            showMessage: true,
            messageToDisplay: message
        });
    }
    toggleFullscreen = () => {
        const currentState = this.state.showFullScreen;
        this.toggleLeftSidePanel({expanded: !currentState});
        this.toggleRightSidePanel({expanded: !currentState});
        this.setState(()=>{
            return {
                showFullScreen: !currentState
            }
        })
    }

    keyDownHandler = (event) => {
        // Toggle dev console with Shift+Space
        try {
            if ((event.code === 'Space' || event.key === ' ') && event.shiftKey) {
                event.preventDefault();
                this.setState(prev => ({ devConsoleOpen: !prev.devConsoleOpen }), () => {
                    if (this.state.devConsoleOpen) {
                        // focus input after open
                        try { setTimeout(() => { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); }, 0); } catch (e) {}
                    }
                });
                return;
            }
        } catch (e) {}
        // Global save shortcut on dungeon screen (Cmd/Ctrl+S)
        try {
            const maybeKey = typeof event.key === 'string' ? event.key.toLowerCase() : '';
            if ((event.metaKey || event.ctrlKey) && !event.altKey && maybeKey === 's') {
                event.preventDefault();
                if (typeof this.props.saveUserData === 'function') {
                    this.props.saveUserData();
                    this.displayMessage('saving...');
                }
                return;
            }
        } catch (e) {}
        // Allow global 'i' to toggle MonsterBattle inventory when a battle is active
        // If the developer console is open, disable all hotkeys here (except Shift+Space
        // which is handled above). This prevents typed commands like 'revive' from
        // being intercepted by global shortcuts (e.g. 'i' toggling inventory).
        try {
            if (this.state.devConsoleOpen) {
                // Let the focused input handle its own key events (handleDevConsoleKeyDown)
                return;
            }
            const maybeKey = event.key;
            // Enter/Return should start combat if ambush popup is visible
            if ((maybeKey === 'Enter' || maybeKey === 'Return') && this.state.showAmbushPopup) {
                event.preventDefault();
                this.startAmbushCombat();
                return;
            }
            // Enter/Return should dismiss trap popup if visible
            if ((maybeKey === 'Enter' || maybeKey === 'Return') && this.state.showTrapPopup) {
                event.preventDefault();
                this.dismissTrapPopup();
                return;
            }
            // Enter should confirm summary panel when visible inside MonsterBattle
            if ((maybeKey === 'Enter' || maybeKey === 'Return') && this.state.inMonsterBattle && this.monsterBattleComponentRef && this.monsterBattleComponentRef.current) {
                try {
                    const mb = this.monsterBattleComponentRef.current;
                    if (mb.state && mb.state.showSummaryPanel) {
                        event.preventDefault();
                        if (typeof mb.confirmClicked === 'function') mb.confirmClicked();
                        return;
                    }
                } catch (err) {
                    console.warn('failed to invoke MonsterBattle.confirmClicked via ref', err);
                }
            }
            if ((maybeKey === 'i' || maybeKey === 'I') && this.state.inMonsterBattle && this.monsterBattleComponentRef && this.monsterBattleComponentRef.current) {
                event.preventDefault();
                try {
                    const mb = this.monsterBattleComponentRef.current;
                    if (mb && typeof mb.toggleInventory === 'function') {
                        mb.toggleInventory();
                    } else if (mb) {
                        // fallback
                        mb.setState((prev) => ({ showInventoryPopup: !prev.showInventoryPopup }));
                    }
                } catch (err) {
                    console.warn('failed to toggle MonsterBattle inventory via ref', err);
                }
                return;
            }
            // Toggle dungeon-level inventory when not in a monster battle
            if ((maybeKey === 'i' || maybeKey === 'I') && !this.state.inMonsterBattle) {
                event.preventDefault();
                    this.setState((prev) => ({ showInventoryPopup: !prev.showInventoryPopup }));
                return;
            }
            // 'c' — toggle Camp popup (works regardless of keysLocked; blocked during battle)
            if ((maybeKey === 'c' || maybeKey === 'C') && !this.state.inMonsterBattle) {
                event.preventDefault();
                this.setState((prev) => ({ showCampPopup: !prev.showCampPopup }));
                return;
            }
            // 'q' — toggle Quests popup (blocked during battle)
            if ((maybeKey === 'q' || maybeKey === 'Q') && !this.state.inMonsterBattle) {
                event.preventDefault();
                this.setState((prev) => ({ showQuestsPopup: !prev.showQuestsPopup }));
                return;
            }
            // 'm' — open Camp Map overlay directly from dungeon (blocked during battle)
            if ((maybeKey === 'm' || maybeKey === 'M') && !this.state.inMonsterBattle) {
                event.preventDefault();
                this.setState({
                    showCampPopup: true,
                    showFoodPrepOverlay: false,
                    showSpellsOverlay: false
                }, this.handleOpenMapOverlay);
                return;
            }
            // 'r' — Immediately begin recuperating (setUpCamp)
            if ((maybeKey === 'r' || maybeKey === 'R') && !this.state.inMonsterBattle && !event.metaKey && !event.ctrlKey) {
                const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
                if (activeTag !== 'input' && activeTag !== 'textarea') {
                    event.preventDefault();
                    this.setUpCamp();
                    return;
                }
            }
            // 's' — Play a practice card duel
            if ((maybeKey === 's' || maybeKey === 'S') && !this.state.inMonsterBattle && !event.metaKey && !event.ctrlKey) {
                const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
                if (activeTag !== 'input' && activeTag !== 'textarea') {
                    event.preventDefault();
                    this.setState({ isCardScrimmage: true }, () => {
                        this.openCardDuel(null);
                    });
                    return;
                }
            }
            // 'x' — Open Codex
            if ((maybeKey === 'x' || maybeKey === 'X') && !this.state.inMonsterBattle && !event.metaKey && !event.ctrlKey) {
                const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
                if (activeTag !== 'input' && activeTag !== 'textarea') {
                    event.preventDefault();
                    this.setState({ showCodex: true });
                    return;
                }
            }
        } catch (err) {
            // ignore key handling errors
        }

        // Ensure Tab navigation still works while keys are locked (camping).
        // Use event.shiftKey / event.ctrlKey so held-modifier state is respected
        // even when key state (this.state.shiftDown) may not be updated while keys are locked.
        if (event.key === 'Tab') {
            // debug: ensure Tab is being received while camping
            try { console.debug('[DungeonPage] Tab pressed, keysLocked=', this.state.keysLocked, 'inMonsterBattle=', this.state.inMonsterBattle, 'shiftKey=', event.shiftKey); } catch(e) {}
            event.preventDefault();
            if (this.state.inMonsterBattle) {
                if (event.shiftKey) {
                    if (this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.tabToRetarget();
                } else if (event.ctrlKey) {
                    // reserved for future
                } else {
                    if (this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.tabToFighter();
                }
            } else {
                // Dungeon-level tab handling: cycle selected crew member when not in a monster battle
                const direction = event.shiftKey ? 'prev' : 'next';
                this.cycleSelectedCrewMember(direction);
            }
            return;
        }

        if(this.state.keysLocked && (this.state.inMonsterBattle || this.state.inTowerSiege)){
            this.combatKeyDownHandler(event);
            return
        }

        if(this.state.keysLocked) return
        let key = event.key, code = event.code
        let newTiles = [], overlayTiles = []; // eslint-disable-line no-unused-vars
        // if(code === 'Space'){
        //     let paused = !this.state.paused;
        //     this.props.combatManager.pauseCombat(paused)
        //     this.setState({
        //         paused
        //     })
        // }

    // debug code/key log removed
        if(code === 'p'){
            let paused = !this.state.paused;
            this.props.combatManager.pauseCombat(paused)
            this.setState({
                paused
            })
        }
        if(code === 'Space'){
            this.checkWhichSideOfBoard();
        }
        switch(key){
                case '1':
                this.toggleFullscreen();
            break;
            case 'Space':
                
            break;
            case 'Tab':
                event.preventDefault();
                // Battle-specific tab handling (existing behavior)
                // if(this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.tabToFighter();
                if(this.state.shiftDown){
                    if(this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.tabToRetarget();
                } else {
                    if(this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.tabToFighter();
                }
                // Dungeon-level tab handling: cycle selected crew member when not in a monster battle
                if(!this.state.inMonsterBattle){
                    const direction = this.state.shiftDown ? 'prev' : 'next';
                    this.cycleSelectedCrewMember(direction);
                }
            break;
            case 'Shift':
                event.preventDefault();
                this.setState({
                    shiftDown: true
                })
        break;
            case 'ArrowUp':
                if(this.state.keysLocked) return
                this.enqueueDirectionalMove('up')
                
            break;
            case 'ArrowDown':
                if(this.state.keysLocked) return
                this.enqueueDirectionalMove('down')
            break;
            case 'ArrowLeft':
                if(this.state.keysLocked) return
                this.enqueueDirectionalMove('left')
            break;
            case 'ArrowRight':
                if(this.state.keysLocked) return
                this.enqueueDirectionalMove('right')
            break;
            default:
                // nathin
            break;
        }
    }
    combatKeyDownHandler = (event) => {
        let key = event.key, code = event.code;
        if(code === 'Space'){
            if(this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.manualFire();
        }
        switch(key){
                // =/+ key: increase speed (decrease interval)
                case '=':
                case '+': {
                    const current = this.props.combatManager?.FIGHT_INTERVAL;
                    const idx = INTERVALS.indexOf(current);
                    if (idx < INTERVALS.length - 1) {
                        const newInterval = INTERVALS[idx + 1];
                        this.props.combatManager.updateAllFightIntervals(newInterval);
                        // Persist to meta
                        const meta = getMeta();
                        meta.combatSpeed = newInterval;
                        storeMeta(meta);
                        this.forceUpdate();
                    }
                    break;
                }
                // - key: decrease speed (increase interval)
                case '-': {
                    const current = this.props.combatManager?.FIGHT_INTERVAL;
                    const idx = INTERVALS.indexOf(current);
                    if (idx > 0) {
                        const newInterval = INTERVALS[idx - 1];
                        this.props.combatManager.updateAllFightIntervals(newInterval);
                        // Persist to meta
                        const meta = getMeta();
                        meta.combatSpeed = newInterval;
                        storeMeta(meta);
                        this.forceUpdate();
                    }
                    break;
                }
            case 'p': {
                const paused = !this.state.paused;
                if (this.props.combatManager) {
                    this.props.combatManager.pauseCombat(paused);
                }
                if (this.reduxCombatManager) {
                    this.reduxCombatManager.pauseCombat(paused);
                }
                this.setState({ paused });
                break;
            }
            case 'q':
                if(this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.selectSpecial();
            break;
            case 'w':
                if(this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.selectConsumableSpecial();
            break;
            case 'Tab':
                event.preventDefault();
                if(this.state.shiftDown){
                    if(this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.tabToRetarget();
                } else if(this.state.ctrlDown){
                    
                } else {
                    if(this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.tabToFighter();
                }
            break;
            case 'Control':
                event.preventDefault();
                this.setState({ ctrlDown: true })
            break;
            case 'Shift':
                event.preventDefault();
                this.setState({ shiftDown: true })
            break;
            case 'ArrowUp':
                if(this.state.selectedCrewMember) this.props.combatManager.moveFighterOneSpace('up');
            break;
            case 'ArrowDown':
                if(this.state.selectedCrewMember) this.props.combatManager.moveFighterOneSpace('down');
            break;
            case 'ArrowLeft':
                if(this.state.selectedCrewMember) this.props.combatManager.moveFighterOneSpace('left');
            break;
            case 'ArrowRight':
                if(this.state.selectedCrewMember) this.props.combatManager.moveFighterOneSpace('right');
            break;
            default:
                // nuttin
            break;
        }
    }

    //might need to put this function somewhere else so it doesnt fire on every rerender
    // useEventListener('keydown', this.keyDownHandler);


    handleHover = (id, type, tile) => {
    }
    handleOverlayHover = (id, type, tile) => {
        this.setState({
            overlayHoveredTileId: id
        })
    }
    buildItemSummaryDescription = (item) => {
        if (!item) return '';
        const itemName = (item.name && String(item.name).trim()) ? String(item.name).trim() : 'item';
        const subtype = item.subtype ? String(item.subtype).toLowerCase() : '';
        let baseDescription = typeof item.description === 'string' ? item.description.trim() : '';
        
        // If item doesn't have description, try to fetch it from the template in inventoryManager
        if (!baseDescription && this.props.inventoryManager) {
            const template = this.findItemTemplate(item);
            if (template && template.description) {
                baseDescription = String(template.description).trim();
            }
        }
        
        if (!baseDescription) {
            if (typeof item.armor === 'number') {
                if (subtype === 'boots') {
                    baseDescription = `${itemName} reinforces footing and lower-body protection. Defense: ${item.armor}.`;
                } else if (subtype === 'helm') {
                    baseDescription = `${itemName} protects the head and face in combat. Defense: ${item.armor}.`;
                } else if (subtype === 'shield') {
                    baseDescription = `${itemName} offers reliable blocking coverage. Defense: ${item.armor}.`;
                } else {
                    baseDescription = `${itemName} provides defensive protection. Defense: ${item.armor}.`;
                }
            } else if (typeof item.damage === 'number' && item.type === 'weapon') {
                baseDescription = `${itemName} grants +${item.damage}% base atk and +${(item.damage * 0.1).toFixed(1)} flat damage.`;
            } else if (item.type === 'magical' && typeof item.power === 'number') {
                baseDescription = `${itemName} channels arcane focus. Power: ${item.power}.`;
            }
        }
        const tierValue = Number(item.tier);
        const hasTier = Number.isFinite(tierValue) && tierValue > 0;
        if (!baseDescription) return '';
        if (!hasTier) return baseDescription;
        if (/\[tier\s+\d+\]/i.test(baseDescription)) return baseDescription;
        return `${baseDescription} [Tier ${tierValue}]`;
    }
    findItemTemplate = (item) => {
        if (!item || !this.props.inventoryManager) return null;
        const invMgr = this.props.inventoryManager;
        const icon = item.icon;
        // Search through all item categories for a matching template
        if (icon) {
            // Check weapons
            if (invMgr.weapons && invMgr.weapons[icon]) {
                return invMgr.weapons[icon];
            }
            // Check armor
            if (invMgr.armor && invMgr.armor[icon]) {
                return invMgr.armor[icon];
            }
            // Check magical items
            if (invMgr.magical && invMgr.magical[icon]) {
                return invMgr.magical[icon];
            }
        }
        return null;
    }
    getItemCategory = (item) => {
        if (!item) return 'Keys & Misc';
        const type = String(item.type || '').toLowerCase();
        const subtype = String(item.subtype || '').toLowerCase();
        
        if (type === 'soul_shard') return 'Materials & Jewels';
        if (type === 'weapon') return 'Weapons';
        if (type === 'armor' || subtype === 'shield' || subtype === 'boots' || subtype === 'helm' || subtype === 'mask' || subtype === 'tabard') return 'Armor';
        if (type === 'consumable' || type === 'potion') return 'Consumables';
        if (type === 'magical' || subtype === 'charm' || subtype === 'amulet' || subtype === 'wand' || subtype === 'staff') return 'Magical';
        if (type === 'jewel' || type === 'rune') return 'Materials & Jewels';
        return 'Keys & Misc';
    }
    handleInventoryTileHover = (tileProps) => {
        // Check if the hovered item has actually changed to prevent flickering from repeated hover events
        const newHoveredItem = tileProps ? (tileProps.data || null) : null;
        const oldHoveredItem = this.state.hoveredInventoryItem;
        
        // Only update if the hovered item is different (by reference or ID)
        if (newHoveredItem === oldHoveredItem || (newHoveredItem && oldHoveredItem && newHoveredItem.icon === oldHoveredItem.icon)) {
            return;
        }

        let inv = this.state.inventoryHoverMatrix,
        descriptionText = '';
        this.getCombinedInventory().forEach((e,i)=>{
            inv[i] = '';
        })
        if(tileProps){
            inv[tileProps.id] = tileProps.contains;
            descriptionText = this.buildItemSummaryDescription(tileProps.data || null);
        }

        this.setState({
            inventoryHoverMatrix: inv,
            descriptionText,
            hoveredInventoryItem: newHoveredItem,
        })
    }
    
    handleCrewTileHover = (tileProps) => {
        let crew = this.state.crewHoverMatrix;
        this.props.crewManager.crew.forEach((e,i)=>{
            crew[i] = '';
        })
        if(tileProps) crew[tileProps.id] = tileProps.contains;
        this.setState({
            crewHoverMatrix: crew
        })
    }
    handleClick = (tile) => {
        // nothing
    }
    handleOverlayClick = (tile, event) => {
        if(!this.state.minimapPlaceMapMarkerStarted) return
        // this is for marking the minimap
        
        let minimapIndicators = this.state.minimapIndicators,
        activeMinimapIndex = this.state.minimap.findIndex(e=>e.active),
        indicatorContainer = minimapIndicators[activeMinimapIndex],
        inputElement = this.state.mapMarkerInput.current;
        switch(this.state.markerType){
            case 'enemy':
                {
                    const c = this.props.boardManager.tiles[tile.id].contains;
                    const typeVal = (typeof c === 'object' && c !== null) ? c.subtype || c.type : c;
                    indicatorContainer.enemies.push({ type: typeVal, tileId: tile.id })
                    inputElement.value = typeVal
                }
            break;
            case 'merchant':
                {
                    const c = this.props.boardManager.tiles[tile.id].contains;
                    const typeVal = (typeof c === 'object' && c !== null) ? (c.subtype || c.type) : c;
                    indicatorContainer.merchant.push({ type: typeVal, tileId: tile.id })
                    inputElement.value = typeVal;
                }
            break;
            case 'gate':
                {
                    const c = this.props.boardManager.tiles[tile.id].contains;
                    const typeVal = (typeof c === 'object' && c !== null) ? (c.subtype || c.type) : c;
                    indicatorContainer.gates.push({ type: typeVal, tileId: tile.id })
                    inputElement.value = typeVal;
                }
            break;
            case 'stairs':
                {
                    const c = this.props.boardManager.tiles[tile.id].contains;
                    const typeVal = (typeof c === 'object' && c !== null) ? (c.subtype || c.type) : c;
                    indicatorContainer.stairs.push({ type: typeVal, tileId: tile.id })
                    inputElement.value = typeVal;
                }
            break;
            case 'custom':
                // custom marker handling not implemented yet
            break;
            default:
                break;
        }
        this.setState({
            minimapIndicators,
            minimapPlaceMapMarkerStarted: false
        })
    }

    handleMemberClickRitual = (member) => {
        this.setState({
            setMemberRitualOptions: member.data
        })
    }
    learnNewRitual = (magicUser) => {
        this.setState({ritualWrecked: true})
        this._setTimeout(()=>{
            this.setState({ritualWrecked: false}) 
        }, 1500)
    }

    handleLearnRitual = (magicUser, ritual) => {
        try {
            // Update meta (persisted)
            const meta = getMeta() || {};
            const metaMember = (meta.crew || []).find(c => c.id === magicUser.id);
            if (metaMember) {
                if (!Array.isArray(metaMember.knownRituals)) metaMember.knownRituals = [];
                if (!metaMember.knownRituals.includes(ritual.key)) metaMember.knownRituals.push(ritual.key);
            }
            // Update live crewManager copy
            const liveMember = (this.props.crewManager.crew || []).find(c => c.id === magicUser.id);
            if (liveMember) {
                if (!Array.isArray(liveMember.knownRituals)) liveMember.knownRituals = [];
                if (!liveMember.knownRituals.includes(ritual.key)) liveMember.knownRituals.push(ritual.key);
            }
            try { storeMeta(meta); } catch(e) {}
            try { updateUserRequest(getUserId(), meta).catch(()=>{}); } catch(e) {}
            try { if (typeof this.props.saveUserData === 'function') this.props.saveUserData(); } catch(e) {}
            // Refresh selectedCrewMember so the actions tray reflects the new ritual immediately
            if (this.state.selectedCrewMember && this.state.selectedCrewMember.id === magicUser.id) {
                const updatedKnown = liveMember ? liveMember.knownRituals : [ritual.key];
                this.setState(prev => ({
                    selectedCrewMember: { ...prev.selectedCrewMember, knownRituals: updatedKnown }
                }));
            }
        } catch(e) {
            console.warn('handleLearnRitual failed', e);
        }
        // Close the modal and unlock keys
        this.setState({ showModal: false, keysLocked: false, setMemberRitualOptions: null },
            () => this._cleanupModalBodyClass());
    }
    handleMemberClick = (member, expand = true) => {
        let meta = getMeta(), val;
        if(!member.data){
            return
        }
        // Match by type first, fall back to id so restored crew objects (which may have
        // been rebuilt by initializeCrew and only carry id) are still found.
        let foundMember = this.props.crewManager.crew.find(e => e.type === member.data.type)
                       || this.props.crewManager.crew.find(e => e.id === member.data.id);
        if(foundMember){
            this.props.crewManager.crew.forEach(c=>{
                c.selected = false;
            })
            foundMember.selected = true;
            meta.crew = this.props.crewManager.crew;
            meta.leftExpanded = expand;
            storeMeta(meta);
            this.props.saveUserData();
        }
        val = member.data;
        const expanded = foundMember ? (Array.isArray(foundMember.actionMenuTypeExpanded) ? foundMember.actionMenuTypeExpanded : (foundMember.actionMenuTypeExpanded ? [foundMember.actionMenuTypeExpanded] : [])) : [];

        this.setState({
            selectedCrewMember: val,
            leftPanelExpanded: expand,
            actionsTrayExpanded: foundMember ? foundMember.actionsTrayExpanded : false,
            actionMenuTypeExpanded: expanded,
            compoundBuilderOpen: expanded.includes('compound'),
            brewBuilderOpen: expanded.includes('brew'),
            tacticsBuilderOpen: expanded.includes('tactics'),
            innerDisciplineBuilderOpen: expanded.includes('inner_discipline'),
        })
    }

    cycleSelectedCrewMember = (direction = 'next') => {
        // direction: 'next' or 'prev'
        const crew = (this.props.crewManager && this.props.crewManager.crew) || [];
        if(!crew || crew.length === 0) return;

        const current = this.state.selectedCrewMember;
        const currentType = current && current.type;
        const currentId   = current && current.id;
        let currentIndex = crew.findIndex(c => c.type === currentType);
        // Fall back to id match in case type is missing or was rebuilt differently
        if (currentIndex === -1 && currentId) currentIndex = crew.findIndex(c => c.id === currentId);
        if (currentIndex === -1) currentIndex = 0;

        let nextIndex = 0;
        if(direction === 'prev'){
            nextIndex = (currentIndex - 1 + crew.length) % crew.length;
        } else {
            nextIndex = (currentIndex + 1) % crew.length;
        }

    // clear selection on all crew
        crew.forEach(c => c.selected = false);
        const foundMember = crew[nextIndex];
        foundMember.selected = true;


        // persist selection to meta so other parts of the app see it
        try{
            const meta = getMeta();
            meta.crew = crew;
            storeMeta(meta);
            if(this.props.saveUserData) this.props.saveUserData();
        } catch (e) {
            console.warn('failed to store meta when cycling selected crew', e);
        }

        const expanded = Array.isArray(foundMember.actionMenuTypeExpanded) ? foundMember.actionMenuTypeExpanded : (foundMember.actionMenuTypeExpanded ? [foundMember.actionMenuTypeExpanded] : []);
        // update local state so UI updates (inventory popup border, etc.)
        this.setState({
            selectedCrewMember: foundMember,
            actionsTrayExpanded: foundMember.actionsTrayExpanded,
            actionMenuTypeExpanded: expanded,
            compoundBuilderOpen: expanded.includes('compound'),
            brewBuilderOpen: expanded.includes('brew'),
            tacticsBuilderOpen: expanded.includes('tactics'),
            innerDisciplineBuilderOpen: expanded.includes('inner_discipline'),
        })
    }
    handleEquipmentItemClick = (item) => {
        if(!item)return;
        const selectedCrewMember = this.state.selectedCrewMember;
        const itemIndex = selectedCrewMember.inventory.findIndex(e=>e===item);
        item.equippedBy = null;
        this.props.inventoryManager.addItem(item)
        selectedCrewMember.inventory.splice(itemIndex,1);
        this.setState({
            selectedCrewMember
        })
    }
    handleSlotContextMenu = (e, slotName) => {
        if (slotName !== 'left' && slotName !== 'right') return;
        e.preventDefault();
        
        const selected = this.state.selectedCrewMember;
        if (!selected || selected.id === undefined || selected.id === null) return;

        const liveMember = (this.props.crewManager && Array.isArray(this.props.crewManager.crew))
            ? this.props.crewManager.crew.find(c => c && c.id === selected.id)
            : null;
        const selectedType = (((liveMember && liveMember.type) || selected.type || '') + '').toLowerCase();
        const normalizedClass = (((liveMember && liveMember.class) || selected.class || '') + '').toLowerCase();
        const inferredClass = ['soldier', 'ranger', 'monk', 'barbarian'].includes(selectedType)
            ? 'warrior'
            : (['wizard', 'sage', 'engineer', 'summoner'].includes(selectedType) ? 'spellcaster' : '');
        const crewClass = normalizedClass || inferredClass;
        
        if (crewClass !== 'warrior') return; // only warriors can equip weapons

        this.setState({
            contextMenu: {
                visible: true,
                x: e.clientX,
                y: e.clientY,
                slotName
            }
        });
    }
    handleEquipHighestAtkWeapon = (slotName) => {
        const selected = this.state.selectedCrewMember;
        if (!selected || selected.id === undefined || selected.id === null) return;

        if (!Array.isArray(selected.inventory)) selected.inventory = [];

        // 1. Un-equip current item in this slot if any
        const currentEquipped = selected.inventory.find(i => i.equippedSlot === slotName);
        if (currentEquipped) {
            const itemIndex = selected.inventory.findIndex(e => e === currentEquipped);
            currentEquipped.equippedBy = null;
            currentEquipped.equippedSlot = null;
            this.props.inventoryManager.addItem(currentEquipped);
            selected.inventory.splice(itemIndex, 1);
        }

        // 2. Find best weapon
        const available = (this.props.inventoryManager && Array.isArray(this.props.inventoryManager.inventory))
            ? this.props.inventoryManager.inventory
            : [];
        
        let bestWeapon = null;
        let bestWeaponIndex = -1;
        let highestScore = -1;

        for (let i = 0; i < available.length; i++) {
            const item = available[i];
            if (item && item.type === 'weapon') {
                const pct = item.damage || 0;
                const flat = pct * 0.1;
                const score = pct + flat;
                if (score > highestScore) {
                    highestScore = score;
                    bestWeapon = item;
                    bestWeaponIndex = i;
                }
            }
        }

        if (bestWeapon && bestWeaponIndex !== -1) {
            // 3. Equip it
            bestWeapon.equippedBy = selected.id;
            bestWeapon.equippedSlot = slotName;

            this.props.inventoryManager.removeItemByIndex(bestWeaponIndex);
            selected.inventory.push(bestWeapon);
        }

        // Persist updates to global meta
        const meta = getMeta();
        const crew = meta.crew || this.props.crewManager.crew;
        const found = crew.find(c => c.id === selected.id);
        if (found) {
            found.inventory = selected.inventory;
        }
        meta.crew = crew;
        storeMeta(meta);
        if (this.props.saveUserData) this.props.saveUserData();

        this.setState({
            selectedCrewMember: selected
        });
    }
    handleItemClick = (item, index) => {
        // New equip logic: place item into an appropriate equip slot on the selected crew member
        if(!item || index === undefined || index === null) return;
        if(item.type === 'soul_shard') {
            if(item.count >= 3) {
                this.setState({
                    showCardForge: true,
                    forgeHighlightMonsterType: item.monsterType,
                    showInventoryPopup: false,
                    isInventoryExpanded: false
                });
            }
            return;
        }
        const selected = this.state.selectedCrewMember;
        if(!selected || selected.id === undefined || selected.id === null){
            // nothing to equip to
            return;
        }

        // ensure inventory array exists on member
        if(!Array.isArray(selected.inventory)) selected.inventory = [];

        const subtype = item.subtype || '';
        const type = item.type || '';

        const liveMember = (this.props.crewManager && Array.isArray(this.props.crewManager.crew))
            ? this.props.crewManager.crew.find(c => c && c.id === selected.id)
            : null;
        const selectedType = (((liveMember && liveMember.type) || selected.type || '') + '').toLowerCase();
        const normalizedClass = (((liveMember && liveMember.class) || selected.class || '') + '').toLowerCase();
        const inferredClass = ['soldier', 'ranger', 'monk', 'barbarian'].includes(selectedType)
            ? 'warrior'
            : (['wizard', 'sage', 'engineer', 'summoner'].includes(selectedType) ? 'spellcaster' : '');
        const crewClass = normalizedClass || inferredClass;

        const slotOccupied = (slotName) => selected.inventory.some(i => i.equippedSlot === slotName);

        let targetSlot = null;

        // Map by subtype/type
        if(['helm','mask'].includes(subtype)){
            targetSlot = 'head';
            if(slotOccupied(targetSlot)) targetSlot = null;
        } else if (subtype === 'boots') {
            targetSlot = 'boots';
            if (slotOccupied(targetSlot)) targetSlot = null;
        } else if(['armor','tabard'].includes(subtype)){
            if (subtype === 'tabard' && crewClass !== 'spellcaster') {
                // Only spellcasters/magic users can equip tabards
                return;
            }
            targetSlot = 'chest';
            if(slotOccupied(targetSlot)) targetSlot = null;
        } else if(subtype === 'wand' || subtype === 'staff' || type === 'weapon' || subtype === 'shield'){
            // Warriors can equip weapons in hand slots
            if(type === 'weapon'){
                if(crewClass !== 'warrior'){
                    // Non-warriors cannot equip weapons
                    return;
                }
            }
            // Spellcasters can equip wands/staves in hand slots
            else if(subtype === 'wand' || subtype === 'staff'){
                if(crewClass !== 'spellcaster'){
                    // Non-spellcasters cannot equip wands/staves
                    return;
                }
            }
            
            // prefer left, then right
            if(!slotOccupied('left')) targetSlot = 'left';
            else if(!slotOccupied('right')) targetSlot = 'right';
            else targetSlot = null;
        } else if(['charm', 'amulet', 'ring'].includes(subtype)){
            // ancillary slots
            if(!slotOccupied('ancillary-left')) targetSlot = 'ancillary-left';
            else if(!slotOccupied('ancillary-right')) targetSlot = 'ancillary-right';
            else targetSlot = null;
        } else if (type === 'rune' && item.shard !== true) {
            // pet slot
            targetSlot = 'pet';
            if (slotOccupied(targetSlot)) targetSlot = null;
        }

        if(!targetSlot){
            // no eligible slot or all relevant slots full — do nothing
            return;
        }

        // equip: set metadata on item, move from global inventory into crew member inventory
        try{
            item.equippedBy = selected.id;
            item.equippedSlot = targetSlot;

            // remove from player's global inventory by index
            if(this.props.inventoryManager && typeof this.props.inventoryManager.removeItemByIndex === 'function'){
                this.props.inventoryManager.removeItemByIndex(index);
            }

            // add to crew member inventory
            selected.inventory.push(item);

            // persist selection to meta and save
            const meta = getMeta();
            const crew = meta.crew || this.props.crewManager.crew;
            const found = crew.find(c => c.id === selected.id);
            if(found){
                // ensure found.inventory reflects selected.inventory
                found.inventory = selected.inventory;
            }
            meta.crew = crew;
            storeMeta(meta);
            if(this.props.saveUserData) this.props.saveUserData();

            // Keep hover-driven UI in sync after the clicked inventory index shifts.
            // If the cursor is still over the same strip slot, show the item that
            // moved into that index immediately (without requiring mouseleave/enter).
            const inv = (this.props.inventoryManager && Array.isArray(this.props.inventoryManager.inventory))
                ? this.props.inventoryManager.inventory
                : [];
            const shiftedItem = inv[index] || null;
            const nextHoverMatrix = Array.isArray(this.state.inventoryHoverMatrix)
                ? [...this.state.inventoryHoverMatrix]
                : [];
            nextHoverMatrix.forEach((_, i) => {
                nextHoverMatrix[i] = '';
            });
            if (shiftedItem) {
                nextHoverMatrix[index] = shiftedItem.name ? shiftedItem.name.replace(' ', '_') : '';
            }

            // update state so UI refreshes
            this.setState({
                activeInventoryItem: item,
                selectedCrewMember: selected,
                inventoryHoverMatrix: nextHoverMatrix,
                hoveredInventoryItem: shiftedItem,
                descriptionText: shiftedItem ? this.buildItemSummaryDescription(shiftedItem) : ''
            });
        } catch (err) {
            console.warn('failed to equip item', err);
        }
    }
    outfitNewCrew = () => {
        const meta = getMeta();
        const crew = meta.crew || [];
        const allItems = this.props.inventoryManager?.allItems || {};
        
        crew.forEach((c)=>{
            if (!c.inventory) c.inventory = [];
            if (c.inventory.length === 0) {
                let itemKey = null;
                const isBow = (k, item) => k.endsWith('_bow') || k === 'merklins_peacekeeper' || item.range === 'far';
                
                if (c.type === 'soldier' || c.type === 'barbarian') {
                    const pool = Object.keys(allItems).filter(k => {
                        const item = allItems[k];
                        if (!item || item.tier !== 1) return false;
                        const isMartialWeapon = item.type === 'weapon' && !isBow(k, item);
                        const isMartialArmor = item.type === 'armor' && (item.subtype === 'shield' || item.subtype === 'helm');
                        return isMartialWeapon || isMartialArmor;
                    });
                    if (pool.length) itemKey = pool[Math.floor(Math.random() * pool.length)];
                } else if (c.type === 'ranger') {
                    const pool = Object.keys(allItems).filter(k => {
                        const item = allItems[k];
                        if (!item || item.tier !== 1) return false;
                        const isRangerWeapon = item.type === 'weapon' && isBow(k, item);
                        const isMartialArmor = item.type === 'armor' && (item.subtype === 'shield' || item.subtype === 'helm');
                        return isRangerWeapon || isMartialArmor;
                    });
                    if (pool.length) itemKey = pool[Math.floor(Math.random() * pool.length)];
                } else if (['sage', 'wizard', 'monk', 'summoner', 'engineer'].includes(c.type)) {
                    const pool = Object.keys(allItems).filter(k => {
                        const item = allItems[k];
                        if (!item || item.tier !== 1) return false;
                        return ['amulet', 'mask', 'tabard', 'boots'].includes(item.subtype);
                    });
                    if (pool.length) itemKey = pool[Math.floor(Math.random() * pool.length)];
                }

                if (itemKey && allItems[itemKey]) {
                    const item = JSON.parse(JSON.stringify(allItems[itemKey]));
                    item.equippedBy = c.id;
                    
                    if (item.type === 'weapon') {
                        item.equippedSlot = 'right';
                    } else if (item.subtype === 'shield') {
                        item.equippedSlot = 'left';
                    } else if (item.subtype === 'helm' || item.subtype === 'mask') {
                        item.equippedSlot = 'head';
                    } else if (item.subtype === 'tabard') {
                        item.equippedSlot = 'chest';
                    } else if (item.subtype === 'boots') {
                        item.equippedSlot = 'boots';
                    } else if (item.subtype === 'amulet' || item.subtype === 'charm') {
                        item.equippedSlot = 'ancillary-left';
                    } else {
                        item.equippedSlot = 'right';
                    }
                    
                    c.inventory.push(item);
                }
            }
        });
        storeMeta(meta);
    }
    getTileContainsType = (tile) => {
        if (!tile) return null;
        if (typeof tile.contains === 'object' && tile.contains !== null) return tile.contains.type;
        return tile.contains;
    }

    getSpawnPointsFromDungeon = (dungeon) => {
        const levels = Array.isArray(dungeon?.levels) ? dungeon.levels : [];
        const spawnPoints = [];

        levels.forEach((level) => {
            const planes = [
                { data: level?.front, orientation: 'front', orientationCode: 'F' },
                { data: level?.back, orientation: 'back', orientationCode: 'B' }
            ];

            planes.forEach(({ data: plane, orientation, orientationCode }) => {
                const miniboards = Array.isArray(plane?.miniboards) ? plane.miniboards : [];
                miniboards.forEach((miniboard, miniboardIndex) => {
                    const tiles = Array.isArray(miniboard?.tiles) ? miniboard.tiles : [];
                    tiles.forEach((tile, tileIndex) => {
                        const containsType = this.getTileContainsType(tile);
                        if (tile?.image !== 'spawn_point' && containsType !== 'spawn_point') return;

                        const coords = Array.isArray(tile?.coordinates)
                            ? tile.coordinates
                            : [tileIndex % 15, Math.floor(tileIndex / 15)];
                        const id = tile?.id != null ? tile.id : tileIndex;
                        spawnPoints.push({
                            id,
                            level: level?.id,
                            miniboardIndex,
                            coordinates: coords,
                            orientation,
                            locationCode: `spawn_point_level-${level?.id}_miniboard-${miniboardIndex}_${orientationCode}_[${coords}]`,
                            contains: tile?.contains || { type: 'spawn_point', subtype: null },
                            image: 'spawn_point'
                        });
                    });
                });
            });
        });

        return spawnPoints;
    }

    getResolvedSpawnPoints = (dungeon) => {
        const scanned = this.getSpawnPointsFromDungeon(dungeon);
        if (scanned.length > 0) return scanned;
        return Array.isArray(dungeon?.spawn_points) ? dungeon.spawn_points : [];
    }

    getSpawnOrientationCode = (spawnPoint) => {
        const fromLocationCode = spawnPoint?.locationCode && spawnPoint.locationCode.split('_')[4];
        if (fromLocationCode === 'F' || fromLocationCode === 'B') return fromLocationCode;
        if (spawnPoint?.orientation === 'F' || spawnPoint?.orientation === 'B') return spawnPoint.orientation;
        if (spawnPoint?.orientation === 'front') return 'F';
        if (spawnPoint?.orientation === 'back') return 'B';
        return 'F';
    }

    getBoardForLocation = (dungeon, location) => {
        if (!dungeon || !location || location.levelId == null) return null;
        const levelId = Number(location.levelId);
        const boardIndex = location.boardIndex != null ? Number(location.boardIndex) : 0;
        const orientation = location.orientation === 'B' ? 'B' : 'F';
        const level = Array.isArray(dungeon.levels)
            ? dungeon.levels.find((entry) => Number(entry?.id) === levelId)
            : null;
        if (!level) return null;
        const plane = orientation === 'F' ? level.front : level.back;
        const boards = Array.isArray(plane?.miniboards) ? plane.miniboards : [];
        return boards[boardIndex] || null;
    }

    formatTileDiagnostic = (tile, index) => {
        if (!tile) return { index, exists: false };
        const containsType = this.getTileContainsType(tile);
        const containsSubtype = (typeof tile.contains === 'object' && tile.contains !== null)
            ? tile.contains.subtype
            : null;
        const containsRaw = (typeof tile.contains === 'object' && tile.contains !== null)
            ? { ...tile.contains }
            : tile.contains;
        const hasKeyLikeValue = [containsType, containsSubtype, tile.image].some((value) =>
            typeof value === 'string' && value.indexOf('key') !== -1
        );

        return {
            index,
            id: tile.id,
            containsType,
            containsSubtype,
            containsRaw,
            image: tile.image,
            color: tile.color,
            keyLike: hasKeyLikeValue
        };
    }

    logKeyTileDiagnostics = ({ label, dungeon, location, tiles, tileIndexes = [96, 98, 126, 128], extra = {} }) => {
        try {
            let tilesToInspect = tiles;
            let resolvedBoard = null;
            if (!Array.isArray(tilesToInspect)) {
                resolvedBoard = this.getBoardForLocation(dungeon, location);
                tilesToInspect = Array.isArray(resolvedBoard?.tiles) ? resolvedBoard.tiles : [];
            }

            tileIndexes.map((idx) => this.formatTileDiagnostic(tilesToInspect[idx], idx));
        } catch (e) {
            // Diagnostics helper is best-effort only; swallow failures.
        }
    }

    loadNewDungeon = async () => {
        const meta = getMeta(),
              userId = getUserId(),
              userName = getUserName();
        const allDungeons = await loadAllDungeonsRequest();
        
        let dungeons = [],
            spawnList = [], // eslint-disable-line no-unused-vars
            selectedDungeon,
            spawnPoint;
            
        allDungeons.data.forEach((e, i) => {
            let d = JSON.parse(e.content)
            d.id = e._id
            dungeons.push(d)
        })
    // dungeons loaded
        const validDungeons = dungeons.filter((d) => d.valid === true && this.getResolvedSpawnPoints(d).length > 0);
        const selectedTemplateId = meta && meta.selectedDungeonTemplateId ? meta.selectedDungeonTemplateId : null;
        if (selectedTemplateId) {
            selectedDungeon = validDungeons.find((d) => d.id === selectedTemplateId);
        }
        if (!selectedDungeon) {
            const pool = validDungeons.length > 0 ? validDungeons : dungeons;
            selectedDungeon = pool[Math.floor(Math.random() * pool.length)];
        }
        if (!selectedDungeon) {
            return;
        }
        // selectedDungeon = dungeons.find(e=>e.name === 'Primari');
        let newDungeonPayload = {
            name: `${selectedDungeon.name}_${userName}_${userId.slice(userId.length-4)}`,
            levels: selectedDungeon.levels,
            pocket_planes: selectedDungeon.pocket_planes,
            descriptions: `${userName}'s dungeon`,
                        spawn_points: this.getResolvedSpawnPoints(selectedDungeon),
            valid: selectedDungeon.valid
          }
        const newDungeonRes = await addDungeonRequest(newDungeonPayload);
        selectedDungeon = JSON.parse(newDungeonRes.data.content);
        selectedDungeon.id = newDungeonRes.data._id;
                selectedDungeon.spawn_points = this.getResolvedSpawnPoints(selectedDungeon);
        // spawnPoint = selectedDungeon.spawn_points[Math.floor(Math.random()*spawnList.length)]
        // ^ need to populate spawnList
                spawnPoint = selectedDungeon.spawn_points[0]


        this.props.inventoryManager.initializeItems()

        // ── Sage starting reagents ─────────────────────────────────────────────
        // If the crew includes a Sage, seed the inventory with one of each
        // reagent needed for the smallest recipe (healing_salve: grass + leaves).
        try {
            const hasSage = (this.props.crewManager?.crew || []).some(
                m => m && (m.type === 'sage' || m.image === 'sage')
            );
            if (hasSage) {
                ['grass', 'leaves'].forEach(reagentId => {
                    const def = REAGENTS[reagentId];
                    if (def) {
                        this.props.inventoryManager.addItem({
                            id: def.id,
                            name: def.name,
                            icon: def.icon,
                            type: def.type,
                            category: def.category,
                            description: def.description,
                            equippedBy: null,
                        });
                    }
                });
            }
        } catch(e) {
            console.warn('[Sage] Failed to add starting reagents', e);
        }
    // spawnpoint selected
        if(spawnPoint){
            // return
            this.props.boardManager.setDungeon(selectedDungeon);
            const levelId =  spawnPoint.level;
            const level = selectedDungeon.levels.find(e=>e.id === levelId)
            const miniboardIndex = spawnPoint.miniboardIndex
            const orientation = this.getSpawnOrientationCode(spawnPoint);
            const spawnTileIndex = spawnPoint.id;
            const board = orientation === 'F' ? level.front.miniboards[miniboardIndex] : (orientation === 'B' ? level.back.miniboards[miniboardIndex] : null)
            if(board === null){
                // board is null -- investigate
                debugger
            }
            meta.selectedDungeon = selectedDungeon;
            meta.spawnPoint = spawnPoint;
            meta.location = {
                boardIndex: spawnPoint.miniboardIndex,
                tileIndex: spawnPoint.id,
                levelId,
                orientation
            }
            meta.dungeonId = selectedDungeon.id;
            storeMeta(meta)
            await updateUserRequest(userId, meta);
            this.props.boardManager.setCurrentLevel(level);
            this.props.boardManager.setCurrentOrientation(orientation);
            this.props.boardManager.initializeTilesFromMap(miniboardIndex, spawnTileIndex);
            const levelTracker = this.state.levelTracker;
            const minimap = this.state.minimap;
            minimap[miniboardIndex].active = true;
            let foundLevel = levelTracker.find(e=>e.id === levelId)
            foundLevel.active = true;

            let newIndicators = []
            for(let i = 0; i < 9; i++){
                newIndicators.push({
                    enemies: [],
                    gates: [],
                    merchant: [],
                    stairs: [],
                    misc: [],
                    custom: []
                })
            }

            meta.minimapIndicators = [{
                indicators: newIndicators,
                orientation,
                level: level.id
            }]

            storeMeta(meta);

            this.setState(()=>{
                return {
                    overlayTiles: this.props.boardManager.overlayTiles,
                    tiles: this.props.boardManager.tiles,
                    minimap,
                    levelTracker,
                    minimapZoomedTile: null,
                    minimapIndicators: {
                        level: foundLevel.id,
                        orientation,
                        indicators: newIndicators
                    },
                    leftPanelExpanded: false,
                    rightPanelExpanded: false
                }
            }, () => {
                // Match loadExistingDungeon behavior: position floating avatar after
                // first-load tiles are mounted so spawn-on-portal is visible immediately.
                try {
                    this.updateFloatingPlayerPosition(this.props.boardManager.playerTile.location);
                } catch (e) {
                    console.warn('Failed to position floating player on first dungeon load', e);
                }
            })
            const firstCrewMember = this.props.crewManager.crew[0];
            this.handleMemberClick({data:firstCrewMember}, false)
            this._setTimeout(()=>{
                this.toggleLeftSidePanel({ expanded: true });
                this.toggleRightSidePanel({ expanded: true });
            }, 1000)
        } else {
            // no valid dungeon
            // alert('no valid dungeon!')
        }
    }
    loadExistingDungeon = async (dungeonId) => {
        const meta = getMeta();

        // clear death tracker if you want:
        
        // try {
        //     meta.deathTracker = 0;
        //     storeMeta(meta);
        //     await updateUserRequest(getUserId(), meta).catch(()=>{});
        //     // Notify local UI/state handlers immediately so death-tracker visuals update.
        //     try { if (typeof this.handleDeathTrackerChanged === 'function') this.handleDeathTrackerChanged(0); } catch(e){}
        //     console.log('meta cleared: , meta:', meta);
        // } catch (e) {
        //     // best-effort: still persist locally
        //     try { meta.deathTracker = 0; storeMeta(meta); } catch (inner) {}
        // }

        const res = await loadDungeonRequest(dungeonId);
        if(res.data && res.data.length === 0){
            // cached dungeon deleted; go to first time flow
            this.loadNewDungeon();
            return
        }
        const dungeon = JSON.parse(res.data[0].content)
        dungeon.id = res.data[0]._id;
        const resolvedSpawnPoints = this.getResolvedSpawnPoints(dungeon);
        const spawnFallbackForDiagnostics = resolvedSpawnPoints[0] || null;
        const defaultDiagnosticLocation = meta.location && meta.location.levelId != null
            ? meta.location
            : (spawnFallbackForDiagnostics
                ? {
                    levelId: spawnFallbackForDiagnostics.level,
                    orientation: this.getSpawnOrientationCode(spawnFallbackForDiagnostics),
                    boardIndex: spawnFallbackForDiagnostics.miniboardIndex,
                    tileIndex: spawnFallbackForDiagnostics.id
                }
                : null);
        this.logKeyTileDiagnostics({
            label: 'loadExistingDungeon pre-cleanup',
            dungeon,
            location: defaultDiagnosticLocation,
            extra: {
                spawnFallback: spawnFallbackForDiagnostics,
                requestedDungeonId: dungeonId
            }
        });
        dungeon.spawn_points = resolvedSpawnPoints;
        keyCleanup(dungeon);
        itemCleanup(dungeon, meta.crew);
        resolveItemPools(dungeon, this.props.inventoryManager.allItems);
        resolveMonsterPools(dungeon, this.props.monsterManager.monsters);
        this.logKeyTileDiagnostics({
            label: 'loadExistingDungeon post-cleanup',
            dungeon,
            location: defaultDiagnosticLocation,
            extra: {
                spawnFallback: spawnFallbackForDiagnostics,
                requestedDungeonId: dungeonId
            }
        });
        this.props.boardManager.setDungeon(dungeon)
        try {
            getMeta();
        } catch (e) {}

        // If meta.location is missing or incomplete, derive safe defaults from the dungeon data
        if (!meta.location || meta.location.levelId == null) {
            const firstLevel = dungeon.levels && dungeon.levels[0];
            const levelZero = dungeon.levels && dungeon.levels.find(level => Number(level.id) === 0);
            const defaultLevel = levelZero || firstLevel;
            // Try to use the dungeon's stored spawn point for a sensible starting tile
            const spawnFallback = resolvedSpawnPoints[0];
            const fallbackTileIndex = spawnFallback ? spawnFallback.id : 112; // 112 = center of 15x15 board
            const fallbackBoardIndex = spawnFallback ? (spawnFallback.miniboardIndex || 0) : 0;
            const fallbackOrientation = spawnFallback ? this.getSpawnOrientationCode(spawnFallback) : 'F';
            meta.location = {
                levelId: defaultLevel ? defaultLevel.id : null,
                orientation: fallbackOrientation,
                boardIndex: fallbackBoardIndex,
                tileIndex: fallbackTileIndex
            };
        }
        // If tileIndex is 0 (top-left corner — almost never a real spawn), try to find a
        // spawn point on the same level, or scan the board for a walkable tile near center.
        // We do NOT cross levels — using a spawn from level 0 when the player is on level 2
        // would place them on the wrong miniboard entirely.
        if (meta.location.tileIndex === 0 || meta.location.tileIndex == null) {
            const levelId = meta.location.levelId;
            const levelSpawn = resolvedSpawnPoints.find(
                sp => sp.level === levelId || sp.level === Number(levelId)
            );
            if (levelSpawn && levelSpawn.id) {
                meta.location.tileIndex = levelSpawn.id;
                meta.location.boardIndex = levelSpawn.miniboardIndex != null ? levelSpawn.miniboardIndex : meta.location.boardIndex;
            } else {
                // No spawn on this level — find the first walkable (non-void) tile scanning
                // outward from center (112) so the player doesn't land in a void.
                try {
                    const coerceId = meta.location.levelId != null ? Number(meta.location.levelId) : null;
                    const lvl = dungeon.levels.find(l => Number(l.id) === coerceId) || dungeon.levels[0];
                    const boardIdx = meta.location.boardIndex || 0;
                    const orientation = meta.location.orientation || 'F';
                    const plane = orientation === 'F' ? lvl.front : lvl.back;
                    const boardTiles = plane && plane.miniboards && plane.miniboards[boardIdx] && plane.miniboards[boardIdx].tiles;
                    let foundTile = null;
                    if (boardTiles) {
                        // scan from center outward
                        const order = [112, 97, 127, 111, 113, 96, 98, 126, 128, 82, 142, 110, 114];
                        for (const idx of order) {
                            const t = boardTiles[idx];
                            if (t && t.type !== 'void' && (!t.contains || t.contains.type !== 'void') && t.color !== 'void') {
                                foundTile = idx;
                                break;
                            }
                        }
                        // if still null, do a full scan
                        if (foundTile == null) {
                            for (let i = 0; i < boardTiles.length; i++) {
                                const t = boardTiles[i];
                                if (t && t.type !== 'void' && (!t.contains || t.contains.type !== 'void')) {
                                    foundTile = i;
                                    break;
                                }
                            }
                        }
                    }
                    meta.location.tileIndex = foundTile != null ? foundTile : 112;
                } catch (e) {
                    meta.location.tileIndex = 112;
                }
            }
        }
        // Coerce levelId to a number for comparison — it may have been serialised as a string
        const targetLevelId = meta.location.levelId != null ? Number(meta.location.levelId) : null;
        const dungeonLevel = dungeon.levels.find(l => Number(l.id) === targetLevelId) || dungeon.levels[0];
        if (!dungeonLevel) {
            console.error('DungeonPage.loadExistingDungeon: dungeon has no levels, cannot initialize board');
            return;
        }
        // Patch meta.location so the rest of the function uses the resolved id
        meta.location.levelId = dungeonLevel.id;

        this.props.boardManager.setCurrentLevel(dungeonLevel);
        this.props.boardManager.setCurrentOrientation(meta.location.orientation);
        this.logKeyTileDiagnostics({
            label: 'loadExistingDungeon pre-initialize finalized-location',
            dungeon,
            location: meta.location,
            extra: {
                spawnFallback: spawnFallbackForDiagnostics,
                requestedDungeonId: dungeonId
            }
        });
        try {
            this.props.boardManager.initializeTilesFromMap(meta.location.boardIndex, meta.location.tileIndex);
            this.logKeyTileDiagnostics({
                label: 'loadExistingDungeon post-initialize boardManager.tiles',
                location: {
                    levelId: this.props.boardManager?.currentLevel?.id,
                    orientation: this.props.boardManager?.currentOrientation,
                    boardIndex: this.props.boardManager?.currentBoard?.id,
                    tileIndex: this.props.boardManager?.getIndexFromCoordinates
                        ? this.props.boardManager.getIndexFromCoordinates(this.props.boardManager.playerTile.location)
                        : null
                },
                tiles: this.props.boardManager.tiles,
                extra: {
                    currentBoardId: this.props.boardManager?.currentBoard?.id,
                    playerLocation: this.props.boardManager?.playerTile?.location,
                    requestedDungeonId: dungeonId
                }
            });
        } catch (initErr) {
            console.error('DungeonPage.loadExistingDungeon: initializeTilesFromMap THREW:', initErr);
            return;
        }
        const minimap = this.state.minimap,
        levels = this.state.levelTracker;
        let level = levels.find(e => Number(e.id) === Number(meta.location.levelId));
        if (!level) {
            console.warn('DungeonPage.loadExistingDungeon: levelId not found in levelTracker, falling back to first entry', meta.location.levelId, levels);
            level = levels[0];
        }
        if (!level) {
            console.error('DungeonPage.loadExistingDungeon: no levels in levelTracker, cannot continue');
            return;
        }
        levels.forEach(e=>e.active = false)
        level.active = true;
        const safeBoardIndex = meta.location.boardIndex != null ? meta.location.boardIndex : 0;
        if (minimap[safeBoardIndex]) minimap[safeBoardIndex].active = true;
        
    let orientation = this.props.boardManager.currentOrientation;
    // Ensure meta.minimapIndicators is always an array before using it.
    if (!meta.minimapIndicators || !Array.isArray(meta.minimapIndicators)) meta.minimapIndicators = [];
    let indicatorsGroup = meta.minimapIndicators.find(e=>e.level === level.id && e.orientation === orientation);

        if(!indicatorsGroup){
            let newIndicators = []
            for(let i = 0; i < 9; i++){
                newIndicators.push({
                    enemies: [],
                    gates: [],
                    merchant: [],
                    stairs: [],
                    misc: [],
                    custom: []
                })
            }
            indicatorsGroup = {
                level: level.id,
                orientation,
                indicators: newIndicators
            }
            meta.minimapIndicators.push(indicatorsGroup)
            storeMeta(meta)
        }
        let selectedCrewMember = this.props.crewManager.crew.find(c => c.selected) || this.props.crewManager.crew[0] || {};
        if (selectedCrewMember && selectedCrewMember.id) {
            this.props.crewManager.crew.forEach(c => {
                c.selected = (c.id === selectedCrewMember.id);
            });
            const metaObj = getMeta() || {};
            metaObj.crew = this.props.crewManager.crew;
            storeMeta(metaObj);
        }
        // Generate a fresh quest set for this dungeon run
        if (this.props.questManager) {
            this.props.questManager.generateQuestSet(dungeon, this.props.monsterManager, this.props.inventoryManager, this.props.crewManager);
        }
        const expanded = selectedCrewMember ? (Array.isArray(selectedCrewMember.actionMenuTypeExpanded) ? selectedCrewMember.actionMenuTypeExpanded : (selectedCrewMember.actionMenuTypeExpanded ? [selectedCrewMember.actionMenuTypeExpanded] : [])) : [];
        this.setState(()=>{
            return {
                spawn: meta.location.tileIndex,
                tiles: this.props.boardManager.tiles,
                overlayTiles: this.props.boardManager.overlayTiles,
                minimap,
                minimapIndicators: indicatorsGroup.indicators,
                levelTracker: levels,
                selectedCrewMember,
                actionsTrayExpanded: selectedCrewMember ? selectedCrewMember.actionsTrayExpanded : false,
                actionMenuTypeExpanded: expanded,
                compoundBuilderOpen: expanded.includes('compound'),
                brewBuilderOpen: expanded.includes('brew'),
                tacticsBuilderOpen: expanded.includes('tactics'),
                innerDisciplineBuilderOpen: expanded.includes('inner_discipline'),
            }
        }, () => {
            // After board loads, position floating player at its location
            try {
                this.updateFloatingPlayerPosition(this.props.boardManager.playerTile.location);
            } catch (e) {
                console.warn('Failed to position floating player on load', e);
            }
        })
    }
    toggleLeftSidePanel = async (val = null) => {
        // toggle left side panel
        // If called as an onClick handler it may receive an event object.
        // Accept either an object like { expanded: true } or no arg to toggle.
        const newVal = (val && typeof val === 'object' && Object.prototype.hasOwnProperty.call(val, 'expanded')) ? val.expanded : !this.state.leftPanelExpanded;
        this.setState({leftPanelExpanded: newVal})
        const meta = getMeta()
        meta.leftExpanded = newVal
        storeMeta(meta)
        await updateUserRequest(getUserId(), meta)
    }
    toggleRightSidePanel = async (val = null) => {
        // Handle event objects from onClick; accept { expanded } objects or toggle when no arg
        const newVal = (val && typeof val === 'object' && Object.prototype.hasOwnProperty.call(val, 'expanded')) ? val.expanded : !this.state.rightPanelExpanded
        this.setState({rightPanelExpanded: newVal})
        const meta = getMeta()
        meta.rightExpanded = newVal;
        storeMeta(meta)
        await updateUserRequest(getUserId(), meta)
    }
    toggleActionsTray = () => {
        const newVal = !this.state.actionsTrayExpanded

        let foundMember = this.props.crewManager.crew.find(c=>c.selected);
        foundMember.actionsTrayExpanded = newVal;
        let meta = getMeta();
        meta.crew = this.props.crewManager.crew;
        storeMeta(meta);
        this.props.saveUserData();


        this.setState({actionsTrayExpanded: newVal})
    }
    toggleCrewActionsTray = () => {
        const newVal = !this.state.crewActionsTrayExpanded;
        // persist crew actions tray state to meta so it survives reloads
        try {
            const meta = getMeta() || {};
            meta.crewActionsTrayExpanded = newVal;
            storeMeta(meta);
            if (this.props.saveUserData) this.props.saveUserData();
        } catch (e) {}
        this.setState({ crewActionsTrayExpanded: newVal });
    }

    // Delegates camping start to CampManager
    setUpCamp = async (maybeDuration) => {
        return CampManager.setUpCamp(this, maybeDuration);
    }

    // Delegates camping end to CampManager
    endCamp = async () => {
        await CampManager.endCamp(this);
        // After endCamp resolves, force another re-render so crew tiles pick up
        // the restored hp values from the new member objects in crewManager.crew.
        try { this.forceUpdate(); } catch(e) {}
        setTimeout(() => { try { this.forceUpdate(); } catch(e) {} }, 50);
    }
    uppercaseFirstLetter = (text) => {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
    battleOver = (result) => {
        if(result === 'win'){
            // Suppress any lingering battle callbacks from overwriting HP/dead after win
            this._suppressFighterDeadHpUpdates = true;

            // Progress bounty quests
            if (this.props.questManager) {
                this.props.questManager.updateProgressByType('bounty', 1);
            }

            this.props.boardManager.removeDefeatedMonsterTile(this.state.monsterBattleTileId)
            this.props.crewManager.checkForLevelUp(this.props.crewManager.crew)
            let meta = getMeta()
            
            // Adjust resolve on victory: +10 for bosses (tier >= 3), +5 otherwise
            const isBoss = this.state.monster && (this.state.monster.tier >= 3 || this.state.monster.isBoss);
            const currentResolve = typeof meta.resolve === 'number' ? meta.resolve : 100;
            meta.resolve = Math.min(100, currentResolve + (isBoss ? 10 : 5));

            // ── Soul Shard drop ──────────────────────────────────────────────
            try {
                const defeatedMonster = this.state.monster;
                if (defeatedMonster && defeatedMonster.type) {
                    const dropChance = shardDropChance(defeatedMonster);
                    if (Math.random() < dropChance) {
                        if (!meta.soulShards) meta.soulShards = {};
                        const mType = defeatedMonster.type;
                        meta.soulShards[mType] = (meta.soulShards[mType] || 0) + 1;
                        try { this.props.boardManager.messaging(`💀 Soul Shard: ${mType.replace(/_/g,' ')} (+1)`); } catch(e) {}
                    }
                }
            } catch(e) { console.warn('shard drop failed', e); }
            
            meta.crew = this.props.crewManager.crew;
            storeMeta(meta)
            this.props.saveUserData()
            // Refresh selectedCrewMember from the live crew so dead/hp flags set during
            // battle are replaced with the end-of-battle values (survivors still alive).
            try {
                const crew = this.props.crewManager.crew || [];
                const prev = this.state.selectedCrewMember;
                const updated = prev && prev.id
                    ? crew.find(c => c && c.id === prev.id)
                    : crew.find(c => c && !c.dead) || crew[0];
                if (updated) {
                    this.setState({ selectedCrewMember: { ...updated } });
                }
            } catch(e) {}
            // Re-enable after a tick so any final in-flight combat callbacks have cleared
            setTimeout(() => { this._suppressFighterDeadHpUpdates = false; }, 0);
        } else if(result === 'loss'){
            this.setState({
                inMonsterBattle: false,
                keysLocked: false
            }, () => {
                this.setState({ isCardScrimmage: false, cardDuelTileId: 'combat_loss' }, () => {
                    this.openCardDuel('combat_loss');
                });
            });
            return;
        } else if(result === 'respawn'){
                  // Try to respawn the player at spawn point (guard against missing boardManager)
                  const meta2 = getMeta();
                  
                  // Adjust resolve on defeat: -5 resolve
                  const currentResolve = typeof meta2.resolve === 'number' ? meta2.resolve : 100;
                  const penalty = applyResolvePenalty(5);
                  meta2.resolve = Math.max(0, currentResolve - penalty);
                    if (meta2 && Array.isArray(meta2.crew)) {
                        meta2.crew.forEach(c => {
                            if (!c) return;
                            c.hp = 1;
                            c.dead = false;
                        });
                        const selectedDungeon = meta2.selectedDungeon || (this.props.boardManager && this.props.boardManager.dungeon);
                        const resolvedRespawnPoints = this.getResolvedSpawnPoints(selectedDungeon);
                        const spawnPoint = resolvedRespawnPoints[0] || meta2.spawnPoint;
                        if (spawnPoint && selectedDungeon) {
                            const levelId = spawnPoint.level;
                            const level = Array.isArray(selectedDungeon.levels)
                                ? selectedDungeon.levels.find(e => Number(e.id) === Number(levelId))
                                : null;
                            const miniboardIndex = spawnPoint.miniboardIndex != null ? spawnPoint.miniboardIndex : 0;
                            const orientation = this.getSpawnOrientationCode(spawnPoint);
                            const spawnTileIndex = spawnPoint.id != null ? spawnPoint.id : 112;
                            const board = level
                                ? (orientation === 'F'
                                    ? level.front && level.front.miniboards && level.front.miniboards[miniboardIndex]
                                    : (orientation === 'B' ? level.back && level.back.miniboards && level.back.miniboards[miniboardIndex] : null))
                                : null;

                            if (level && board) {
                                meta2.spawnPoint = spawnPoint;
                                meta2.location = {
                                    boardIndex: miniboardIndex,
                                    tileIndex: spawnTileIndex,
                                    levelId,
                                    orientation
                                }
                            } else {
                                console.warn('battleOver respawn: resolved spawn did not map to a level/board, keeping current location');
                            }
                        } else {
                            console.warn('battleOver respawn: no resolved spawn point found — keeping current location');
                        }
                        // Re-fetch meta so we don't overwrite values (e.g. deathTracker) written
                        // by gameOver in MonsterBattle between when we fetched meta2 and now.
                        const freshMeta = getMeta();
                        meta2.deathTracker = freshMeta.deathTracker;
                        try { storeMeta(meta2); } catch(e) {}
                        try { this.props.crewManager.initializeCrew(meta2.crew); } catch(e) {}
                        try {
                            if (this.props.inventoryManager && typeof this.props.inventoryManager.refreshWeaponStats === 'function') {
                                this.props.crewManager.crew.forEach(m => { if (m && Array.isArray(m.inventory)) m.inventory = this.props.inventoryManager.refreshWeaponStats(m.inventory); });
                            }
                        } catch(e) {}
                        try {
                            if (Array.isArray(this.props.crew)) {
                                this.props.crew.forEach(c => {
                                    if (!c) return;
                                    c.hp = 1;
                                    c.dead = false;
                                });
                            }
                        } catch(e) {}
                        // Explicitly clear dead/hp on crewManager.crew as a second pass — initializeCrew
                        // rebuilds from meta2.crew (hp=1/dead=false) but any in-flight callbacks from
                        // combat may have mutated the objects. Force-clear here so the Tile dead-overlay
                        // and HP bar render correctly immediately after respawn.
                        // Also set the suppress flag so handleFighterUpdateFromBattle ignores dead/hp
                        // writes from any lingering battle callbacks during the cleanup window.
                        this._suppressFighterDeadHpUpdates = true;
                        try {
                            if (this.props.crewManager && Array.isArray(this.props.crewManager.crew)) {
                                this.props.crewManager.crew.forEach(c => {
                                    if (!c) return;
                                    c.hp = 1;
                                    c.dead = false;
                                });
                            }
                        } catch(e) {}
                        try { if (this.props.saveUserData) this.props.saveUserData(); } catch(e) {}

                        // // Notify parent UI for each crew member so DungeonPage updates portrait overlays
                        // Ensure UI reflects restored crew state (hp/dead flags). Force a re-render
                        // and update any selectedCrewMember references so portrait overlays refresh.
                        const refreshCrewUI = () => {
                            try {
                                // Update selectedCrewMember if present — read from the now-clean crewManager.crew
                                if (this.state.selectedCrewMember && this.state.selectedCrewMember.id) {
                                    const updated = (this.props.crewManager && Array.isArray(this.props.crewManager.crew)) ? this.props.crewManager.crew.find(c => c && c.id === this.state.selectedCrewMember.id) : null;
                                    if (updated) {
                                        try { this.setState({ selectedCrewMember: { ...updated, hp: 1, dead: false } }); } catch(e) {}
                                    }
                                }
                                // Force update to refresh crew tiles and death overlays
                                try { this.forceUpdate(); } catch(e) {}
                            } catch (inner) { console.warn('post-respawn UI refresh failed', inner); }
                        };
                        // Run immediately, then again after a tick so any in-flight battle
                        // callbacks that may race with the respawn are also overridden.
                        refreshCrewUI();
                        setTimeout(() => {
                            refreshCrewUI();
                        }, 0);
                        // Keep suppression active through the battle tear-down window so
                        // delayed callbacks cannot write dead/hp back onto revived crew.
                        setTimeout(() => {
                            this._suppressFighterDeadHpUpdates = false;
                        }, 2500);
                    }
            try {
                if (meta2 && meta2.location && this.props && this.props.boardManager) {
                    try {
                        const bm = this.props.boardManager;
                        const targetLevelId = Number(meta2.location.levelId);
                        const targetMiniboardIndex = Number(meta2.location.boardIndex || 0);

                        // Update levelTracker active state
                        const levelTracker = [...this.state.levelTracker];
                        levelTracker.forEach(e => { if (e) e.active = false; });
                        const lvl = levelTracker.find(e => e && Number(e.id) === targetLevelId);
                        if (lvl) lvl.active = true;

                        // Update minimap active state
                        const minimap = [...this.state.minimap];
                        minimap.forEach(e => { if (e) e.active = false; });
                        if (minimap[targetMiniboardIndex]) {
                            minimap[targetMiniboardIndex].active = true;
                        }

                        // Sync minimap indicators
                        let indicatorsGroup = meta2.minimapIndicators.find(e => Number(e.level) === targetLevelId && e.orientation === meta2.location.orientation);
                        if (!indicatorsGroup) {
                            let newIndicators = [];
                            for (let i = 0; i < 9; i++) {
                                newIndicators.push({ enemies: [], gates: [], merchant: [], stairs: [], misc: [], custom: [] });
                            }
                            indicatorsGroup = { level: targetLevelId, orientation: meta2.location.orientation, indicators: newIndicators };
                            meta2.minimapIndicators.push(indicatorsGroup);
                            try { storeMeta(meta2); } catch (e) {}
                        }

                        // Rebuild board context from respawn location so tile index is applied
                        // on the correct level/orientation/miniboard.
                        const respawnLevel = bm.dungeon && Array.isArray(bm.dungeon.levels)
                            ? bm.dungeon.levels.find(l => Number(l.id) === Number(meta2.location.levelId))
                            : null;
                        if (respawnLevel && typeof bm.setCurrentLevel === 'function') {
                            bm.setCurrentLevel(respawnLevel);
                        }
                        if (typeof bm.setCurrentOrientation === 'function') {
                            bm.setCurrentOrientation(meta2.location.orientation || 'F');
                        }
                        if (typeof bm.initializeTilesFromMap === 'function') {
                            bm.initializeTilesFromMap(meta2.location.boardIndex || 0, meta2.location.tileIndex != null ? meta2.location.tileIndex : 112);
                        } else if (typeof bm.getCoordinatesFromIndex === 'function' && typeof bm.placePlayer === 'function') {
                            const coords = bm.getCoordinatesFromIndex(meta2.location.tileIndex);
                            bm.placePlayer(coords);
                        }
                        try {
                            // Use the manager's own dungeon/template to respawn monsters.
                            if (typeof bm.respawnMonsters === 'function') bm.respawnMonsters(bm.dungeon || {});
                        } catch (inner) { console.warn('respawnMonsters failed', inner); }
                        
                        try {
                            if (typeof this.setState === 'function') {
                                this.setState({
                                    levelTracker,
                                    minimap,
                                    minimapZoomedTile: null,
                                    minimapIndicators: indicatorsGroup.indicators,
                                    overlayTiles: bm.overlayTiles,
                                    tiles: bm.tiles
                                });
                            }
                        } catch(e){}
                    } catch (inner) {
                        console.warn('group-death: respawn failed', inner);
                    }
                } else {
                    console.warn('group-death: cannot respawn - boardManager missing');
                }
            } catch (inner) { console.warn('group-death: respawn failed', inner); }
        }
        try {
            // If we saved the pre-combat panel state, restore it now so the UI returns
            // to the same expanded/collapsed configuration the player had before combat.
            if (this._preCombatPanels) {
                const prev = this._preCombatPanels;
                try {
                    this.setState({
                        leftPanelExpanded: !!prev.left,
                        rightPanelExpanded: !!prev.right
                    });
                } catch (e) {}
                try {
                    const meta = getMeta() || {};
                    meta.leftExpanded = !!prev.left;
                    meta.rightExpanded = !!prev.right;
                    try { storeMeta(meta); } catch (e) {}
                    try { updateUserRequest(getUserId(), meta).catch(()=>{}); } catch(e) {}
                } catch (inner) {}
                this._preCombatPanels = null;
            }
        } catch (err) {
            console.warn('battleOver: failed to restore panel state', err);
        }

        this.setState({
            keysLocked : false,
            inMonsterBattle: false
        }, () => {
            try {
                const bm = this.props.boardManager;
                if (bm && bm.playerTile && bm.playerTile.location) {
                    this.updateFloatingPlayerPosition(bm.playerTile.location);
                }
            } catch (e) {
                console.warn('battleOver: failed to re-anchor floating avatar after combat', e);
            }
        })
    }
    minimapTileClicked = (index) => {
        this.setState({
            minimapZoomedTile: index
        })
    }
    calcPlayerIndicatorTop = () => {
        let formattedCoords = {x: this.props.boardManager.playerTile.location[0]-15, y: this.props.boardManager.playerTile.location[1]-15};
        let fromTop = formattedCoords.x
        return `${fromTop / 14 * 100}%`
    }
    calcPlayerIndicatorLeft = () => {
        let formattedCoords = {x: this.props.boardManager.playerTile.location[0]-15, y: this.props.boardManager.playerTile.location[1]-15}
        let fromLeft = formattedCoords.y;
        return `${fromLeft / 14 * 100}%`
    }
    calcIndicator = (tileId) => {
        let coords = this.props.boardManager.getCoordinatesFromIndex(tileId);
        return {
            left: `${(coords[1]-15) / 14 * 100}%`,
            top: `${(coords[0]-15) / 14 * 100}%`
        }
    }

    // ── Breadcrumb trail ────────────────────────────────────────────
    // Persist breadcrumbs in meta so they survive browser refreshes.
    persistBreadcrumbsToMeta = () => {
        try {
            const meta = getMeta() || {};
            const dungeonId = meta.dungeonId || null;
            const entries = Array.from(this._breadcrumbs.values())
                .sort((a, b) => (a.seq || 0) - (b.seq || 0))
                // Keep payload bounded in case of very long sessions.
                .slice(-1500);
            const monsterSightings = Array.from(this._monsterSightings.values())
                .sort((a, b) => (a.ts || 0) - (b.ts || 0))
                .slice(-1200);
            meta.breadcrumbTrail = {
                dungeonId,
                seq: this._breadcrumbSeq || 0,
                entries,
                monsterSightings
            };
            storeMeta(meta);
        } catch (e) {}
    }

    // Restore breadcrumbs for the currently active dungeon id.
    restoreBreadcrumbsFromMeta = (metaInput = null) => {
        try {
            const meta = metaInput || getMeta() || {};
            const payload = meta.breadcrumbTrail;
            if (!payload || !Array.isArray(payload.entries)) return;

            const currentDungeonId = meta.dungeonId || null;
            // Prevent leaking trails between different dungeon runs.
            if ((payload.dungeonId || null) !== currentDungeonId) return;

            this._breadcrumbs.clear();
            this._monsterSightings.clear();
            payload.entries.forEach((entry) => {
                if (!entry) return;
                const {
                    levelId,
                    orientation,
                    boardIndex,
                    row,
                    col,
                    ts,
                    seq,
                } = entry;
                if (
                    levelId === undefined ||
                    !orientation ||
                    typeof boardIndex !== 'number' ||
                    typeof row !== 'number' ||
                    typeof col !== 'number'
                ) return;

                const key = `${levelId}:${orientation}:${boardIndex}:${row}:${col}`;
                this._breadcrumbs.set(key, {
                    levelId,
                    orientation,
                    boardIndex,
                    row,
                    col,
                    ts: typeof ts === 'number' ? ts : Date.now(),
                    seq: typeof seq === 'number' ? seq : 0,
                });
            });

            const maxSeqFromEntries = Math.max(0, ...Array.from(this._breadcrumbs.values()).map(v => Number(v.seq) || 0));
            this._breadcrumbSeq = Math.max(Number(payload.seq) || 0, maxSeqFromEntries);

            if (Array.isArray(payload.monsterSightings)) {
                payload.monsterSightings.forEach((entry) => {
                    if (!entry) return;
                    const { levelId, orientation, boardIndex, tileId, ts, type } = entry;
                    if (
                        levelId === undefined ||
                        !orientation ||
                        typeof boardIndex !== 'number' ||
                        typeof tileId !== 'number'
                    ) return;

                    const key = `${levelId}:${orientation}:${boardIndex}:${tileId}`;
                    this._monsterSightings.set(key, {
                        levelId,
                        orientation,
                        boardIndex,
                        tileId,
                        type: type || 'monster',
                        ts: typeof ts === 'number' ? ts : Date.now(),
                    });
                });
            }
        } catch (e) {}
    }

    recordAdjacentMonsterSightings = (tilesForBoard = null, persistToMeta = true) => {
        try {
            const bm = this.props.boardManager;
            if (!bm || !bm.playerTile || !Array.isArray(bm.playerTile.location)) return false;

            const activeBoardIndex = this.state.minimap.findIndex(e => e.active);
            const boardIndex = activeBoardIndex >= 0 ? activeBoardIndex : (typeof bm.playerTile.boardIndex === 'number' ? bm.playerTile.boardIndex : -1);
            if (boardIndex < 0) return false;

            const levelId = (this.state.levelTracker.find(e => e.active) || {}).id;
            const orientation = bm.currentOrientation || 'A';
            const tiles = Array.isArray(tilesForBoard) ? tilesForBoard : bm.tiles;
            if (!Array.isArray(tiles) || tiles.length === 0) return false;

            const [row, col] = bm.playerTile.location;
            const candidateCoords = [
                [row - 1, col],
                [row + 1, col],
                [row, col - 1],
                [row, col + 1],
            ];

            let changed = false;
            const now = Date.now();
            candidateCoords.forEach(([r, c]) => {
                if (r < 15 || r > 29 || c < 15 || c > 29) return;
                let tileId = null;
                try {
                    tileId = typeof bm.getIndexFromCoordinates === 'function'
                        ? bm.getIndexFromCoordinates([r, c])
                        : ((r - 15) * 15 + (c - 15));
                } catch (e) {
                    tileId = ((r - 15) * 15 + (c - 15));
                }
                if (typeof tileId !== 'number' || tileId < 0 || tileId >= tiles.length) return;

                const tile = tiles[tileId];
                if (!tile) return;
                const contains = tile.contains;
                const containsType = typeof bm.getContainsType === 'function'
                    ? bm.getContainsType(contains)
                    : (typeof contains === 'object' && contains !== null ? contains.type : contains);
                const containsSubtype = (typeof contains === 'object' && contains !== null) ? contains.subtype : null;
                const isMonsterTile =
                    containsType === 'monster' ||
                    (!!containsSubtype && !!this.props.monsterManager?.monsters?.[containsSubtype]) ||
                    (!!containsType && !!this.props.monsterManager?.monsters?.[containsType]);
                if (!isMonsterTile) return;

                const key = `${levelId}:${orientation}:${boardIndex}:${tileId}`;
                const existing = this._monsterSightings.get(key);
                if (!existing) {
                    this._monsterSightings.set(key, {
                        levelId,
                        orientation,
                        boardIndex,
                        tileId,
                        type: containsSubtype || containsType || 'monster',
                        ts: now,
                    });
                    changed = true;
                } else if (existing.ts !== now) {
                    existing.ts = now;
                    this._monsterSightings.set(key, existing);
                    changed = true;
                }
            });

            if (changed && persistToMeta) this.persistBreadcrumbsToMeta();
            return changed;
        } catch (e) {
            return false;
        }
    }

    getMonsterSightingsForBoard = (levelId, orientation, boardIndex) => {
        const EXPIRE_MS = 30 * 60 * 1000;
        const now = Date.now();
        const markers = [];
        try {
            this._monsterSightings.forEach((entry) => {
                if (!entry) return;
                if (entry.levelId !== levelId) return;
                if (entry.orientation !== orientation) return;
                if (entry.boardIndex !== boardIndex) return;
                if ((now - (entry.ts || 0)) > EXPIRE_MS) return;
                markers.push({ type: entry.type || 'monster', tileId: entry.tileId, ts: entry.ts });
            });
        } catch (e) {}
        return markers;
    }

    // Record the player's current position onto the breadcrumb map.
    // Each unique (levelId, orientation, boardIndex, row, col) cell gets one entry;
    // revisiting a cell just refreshes its timestamp (keeping the most-recent visit).
    recordBreadcrumb = () => {
        try {
            const bm = this.props.boardManager;
            if (!bm || !bm.playerTile) return;
            const [row, col] = bm.playerTile.location;
            const boardIndex = this.state.minimap.findIndex(e => e.active);
            if (boardIndex < 0) return;
            const levelId = (this.state.levelTracker.find(e => e.active) || {}).id;
            const orientation = bm.currentOrientation || 'A';
            const key = `${levelId}:${orientation}:${boardIndex}:${row}:${col}`;
            const existing = this._breadcrumbs.get(key);
            this._breadcrumbs.set(key, {
                levelId,
                orientation,
                boardIndex,
                row,
                col,
                ts: Date.now(),
                // preserve original seq so the path stays in order; only update ts
                seq: existing ? existing.seq : ++this._breadcrumbSeq,
            });
            this.recordAdjacentMonsterSightings(null, false);
            this.persistBreadcrumbsToMeta();
        } catch (e) {}
    }

    // Evict breadcrumbs older than 180 minutes, then trigger a re-render so the
    // trail visually fades and disappears.
    _pruneBreadcrumbs = () => {
        try {
            const EXPIRE_MS = 180 * 60 * 1000;
            const now = Date.now();
            let pruned = false;
            this._breadcrumbs.forEach((val, key) => {
                if (now - val.ts > EXPIRE_MS) {
                    this._breadcrumbs.delete(key);
                    pruned = true;
                }
            });
            this._monsterSightings.forEach((val, key) => {
                if (now - (val.ts || 0) > EXPIRE_MS) {
                    this._monsterSightings.delete(key);
                    pruned = true;
                }
            });
            if (pruned) {
                this.persistBreadcrumbsToMeta();
                try { this.forceUpdate(); } catch (e) {}
            }
        } catch (e) {}
    }
    clearAllMarkers = () => {
        let meta = getMeta();
        meta.minimapIndicators = []
        storeMeta(meta)

        let newIndicators = []
        for(let i = 0; i < 9; i++){
            newIndicators.push({
                enemies: [],
                gates: [],
                merchant: [],
                stairs: [],
                misc: [],
                custom: []
            })
        }
        
        this.setState({
            minimapIndicators: newIndicators
        })
    }
    beginMarkingMap = () => {
        let current = this.state.minimapMarkerTrayOpen;
        this.setState({
            minimapMarkerTrayOpen: !current
        })
    }
    placeMapMarkerStart = () => {
        this.setState({
            minimapPlaceMapMarkerStarted: true
        })

    }
    submitMarkers = () => {
        let meta = getMeta();
        let indicators = this.state.minimapIndicators;
        let orientation = this.props.boardManager.currentOrientation;
        let levelId = this.props.boardManager.currentLevel.id
        let obj = {
            level: levelId,
            orientation,
            indicators
        }
        if(!meta['minimapIndicators']){
            meta['minimapIndicators'] = [obj]
        } else if(meta.minimapIndicators.find(e=>e.level === levelId && e.orientation === orientation)){
            let existing = meta.minimapIndicators.find(e=>e.level === levelId && e.orientation === orientation);
            existing.indicators = indicators;
        } else {
            meta.minimapIndicators.push(obj)
        }
        storeMeta(meta)
        // this.state.mapMarkerInput.current.value = null;
        // this.state.markerSelectVal.current.value = 'Marker Type';
        this.setState({
            minimapMarkerTrayOpen: false,
            minimapPlaceMapMarkerStarted: false,
            markerName: '',
            markerType: 'Marker Type'
        })
    }
    onMarkerNameInputChange = (markerName) => {
        this.setState({
            markerName
        })
    }
    onMarkerTypeDropdownChange = (markerType) => {
        this.setState({
            markerType
        })
    }
    handleActionClick = (action) => {
        if (action.disabled && action.type !== 'sharpen_blades') {
            return;
        }
        if (action.type === 'scrimmage') {
            this.setState({ isCardScrimmage: true });
            this.openCardDuel(null);
            return;
        }
        if (action.type === 'sharpen_blades') {
            if (action.disabled) {
                const active = (this.state.selectedCrewMember?.specialActions || []).find(a => a.type === 'sharpen_blades' && new Date(a.endDate) > new Date());
                if (active) {
                    const remainingMs = new Date(active.endDate) - new Date();
                    if (remainingMs > 0) {
                        const mins = Math.ceil(remainingMs / 60000);
                        this.displayMessage(`Sharpen Blades is currently in progress! ${mins} minutes remaining.`);
                    }
                }
                return;
            }
            this.setState({
                showModal: true,
                modalType: 'SharpenBladesDetails'
            });
            return;
        }

        const current = Array.isArray(this.state.actionMenuTypeExpanded) ? this.state.actionMenuTypeExpanded : [];
        const isOpen = current.includes(action.type);
        const val = isOpen ? current.filter(t => t !== action.type) : [...current, action.type];

        let foundMember = this.props.crewManager.crew.find(c=>c.selected);
        if(foundMember.actionMenuExpanded){
            delete foundMember.actionMenuExpanded
        }
        foundMember.actionMenuTypeExpanded = val;
        let meta = getMeta();
        meta.crew = this.props.crewManager.crew;
        storeMeta(meta);
        this.props.saveUserData();

        const nextState = { actionMenuTypeExpanded: val };
        // Toggle compound builder open/closed when the Compound Potions action row is clicked
        if (action.type === 'compound') {
            const character = this.state.selectedCrewMember;
            const isBrewing = character && (character.specialActions || []).some(a => {
                if (!a || a.type !== 'compound') return false;
                return new Date(a.endDate) > new Date();
            });
            if (isBrewing) {
                this.displayMessage("Already brewing a potion!");
                return;
            }
            nextState.compoundBuilderOpen = !isOpen;
            if (isOpen) nextState.compoundBuilderSlots = [];
        }
        // Toggle brew builder open/closed when the Brew action row is clicked
        if (action.type === 'brew') {
            const character = this.state.selectedCrewMember;
            const isBrewing = character && (character.specialActions || []).some(a => {
                if (!a || a.type !== 'brew') return false;
                return new Date(a.endDate) > new Date();
            });
            if (isBrewing) {
                this.displayMessage("Already brewing a brew!");
                return;
            }
            nextState.brewBuilderOpen = !isOpen;
            if (isOpen) nextState.brewBuilderSlots = [];
        }
        // Open Imprint Tattoo overlay
        if (action.type === 'imprint_tattoo') {
            if (action.disabled) return;
            const character = this.state.selectedCrewMember;
            this.setState({
                showTattooOverlay: true,
                tattooOverlayMemberId: character ? character.id : null,
                tattooSelectedSlot: null,
                tattooSelectedDesign: null,
            });
            return;
        }
        // Toggle tactics builder open/closed when the Battle Tactics action row is clicked
        if (action.type === 'tactics') {
            const character = this.state.selectedCrewMember;
            const activeTactic = (character?.specialActions || []).find(a => a.type === 'tactics');
            const isBusy = activeTactic && new Date(activeTactic.endDate) > new Date();
            if (isBusy) {
                this.displayMessage(`Already preparing: ${activeTactic.name}!`);
                return;
            }
            nextState.tacticsBuilderOpen = !isOpen;
            if (isOpen) nextState.tacticsBuilderSelected = null;
        }
        // Toggle inner discipline builder open/closed
        if (action.type === 'inner_discipline') {
            const character = this.state.selectedCrewMember;
            const busyDisc = (character?.specialActions || []).find(a => {
                if (!a || a.type !== 'inner_discipline') return false;
                return new Date(a.endDate) > new Date();
            });
            if (busyDisc) {
                this.displayMessage(`Already practising: ${busyDisc.name}!`);
                return;
            }
            nextState.innerDisciplineBuilderOpen = !isOpen;
            if (isOpen) {
                nextState.innerDisciplineSelected = null;
                nextState.innerDisciplineCategoryOpen = null;
            }
        }
        // ── Prepare Poison builder toggle (Ranger) ─────────────────────────────
        if (action.type === 'prepare_poison') {
            const character = this.state.selectedCrewMember;
            const bombPrepping = (character?.specialActions || []).some(a =>
                a.type === 'acid_bomb' && !a.available && new Date(a.endDate) > new Date()
            );
            if (bombPrepping) {
                this.displayMessage('Already preparing an Acid Bomb!');
                return;
            }
            nextState.preparePoisonBuilderOpen = !isOpen;
        }
        // ── Deploy Animal Agent builder toggle (Ranger) ─────────────────────────
        if (action.type === 'deploy_animal') {
            const character = this.state.selectedCrewMember;
            const ratPrepping = (character?.specialActions || []).some(a =>
                a.type === 'rat_agent' && !a.available && new Date(a.endDate) > new Date()
            );
            if (ratPrepping) {
                this.displayMessage('The Scrounging Rat is already deployed!');
                return;
            }
            nextState.deployAnimalBuilderOpen = !isOpen;
        }
        this.setState(nextState);
    }
    getSubtypeClass = (subtype, maxReached) => {
        if(!subtype.available) return 'disabled'
        if(maxReached) return 'max-reached'

        // ── Tactics subtype: in-prep blocks all others; active tactic shows count ──
        if (subtype.tacticKey) {
            const specialActions = this.state.selectedCrewMember?.specialActions || [];
            const tacticInProgress = specialActions.find(a =>
                a && a.type === 'tactics' && new Date(a.endDate) > new Date()
            );
            if (tacticInProgress) {
                return tacticInProgress.tacticKey === subtype.tacticKey ? 'in-progress' : 'disabled';
            }
            // Show active (ready) tactic as distinct from idle ones
            const readyTactic = specialActions.find(a =>
                a && a.type === 'tactics' && a.available === true && (a.combatsRemaining || 0) > 0
            );
            if (readyTactic && readyTactic.tacticKey === subtype.tacticKey) {
                return 'available'; // active and ready — highlighted
            }
            return null; // selectable
        }

        // ── Inner Discipline subtype: in-prep blocks all; active stance/chi shows count ──
        if (subtype.disciplineKey || subtype.isCategory) {
            const specialActions = this.state.selectedCrewMember?.specialActions || [];
            const discInProgress = specialActions.find(a =>
                a && a.type === 'inner_discipline' && new Date(a.endDate) > new Date()
            );
            if (discInProgress) {
                if (subtype.disciplineKey) {
                    return discInProgress.disciplineKey === subtype.disciplineKey ? 'in-progress' : 'disabled';
                }
                // Category: show in-progress if any child matches
                if (subtype.isCategory && subtype.children) {
                    const childMatch = subtype.children.some(c => c.disciplineKey === discInProgress.disciplineKey);
                    return childMatch ? 'in-progress' : 'disabled';
                }
                return 'disabled';
            }
            // Category-level: check if any child is active
            if (subtype.isCategory && subtype.children) {
                if (subtype.category === 'stance') {
                    const activeStance = specialActions.find(a =>
                        a && a.type === 'inner_discipline' && a.category === 'stance'
                        && a.available === true && (a.combatsRemaining || 0) > 0
                    );
                    if (activeStance) return 'available';
                }
                if (subtype.category === 'spirit') {
                    const activeSpirit = specialActions.find(a =>
                        a && a.type === 'inner_discipline' && a.category === 'spirit' && a.available === true
                    );
                    if (activeSpirit) return 'available';
                }
                return null;
            }
            // Chi: show available if charges exist
            if (subtype.category === 'chi') {
                const charges = specialActions.filter(a => a.type === 'inner_discipline' && a.category === 'chi' && a.available).length;
                const maxCharges = (INNER_DISCIPLINES[subtype.disciplineKey] || {}).maxCharges || 3;
                if (charges >= maxCharges) return 'max-reached';
                if (charges > 0) return 'available';
            }
            // Stance: show available if this stance is active with combats remaining
            if (subtype.category === 'stance') {
                const activeStance = specialActions.find(a =>
                    a && a.type === 'inner_discipline' && a.category === 'stance'
                    && a.available === true && (a.combatsRemaining || 0) > 0
                );
                if (activeStance && activeStance.disciplineKey === subtype.disciplineKey) {
                    return 'available';
                }
            }
            // Spirit: show available if this spirit walk is active
            if (subtype.category === 'spirit') {
                const activeSpirit = specialActions.find(a =>
                    a && a.type === 'inner_discipline' && a.category === 'spirit' && a.available === true
                );
                if (activeSpirit && activeSpirit.disciplineKey === subtype.disciplineKey) {
                    return 'available';
                }
            }
            return null; // selectable
        }

        const actionInProgress = this.state.selectedCrewMember.specialActions.find(a => {
            let end = new Date(a.endDate);
            let now = new Date();
            return end > now;
        });

        if (actionInProgress) {
            let isMatch = false;
            if (actionInProgress.type === 'glyph' && subtype.glyphTier) {
                isMatch = actionInProgress.glyphTier === subtype.glyphTier;
            } else if (actionInProgress.type === 'ritual' && subtype.ritualKey) {
                isMatch = actionInProgress.ritualKey === subtype.ritualKey;
            } else {
                isMatch = actionInProgress.name === subtype.type || actionInProgress.type === subtype.type || actionInProgress.subtype === subtype.type;
            }

            if (isMatch) {
                return 'in-progress';
            } else {
                return 'disabled';
            }
        }
    }

    // For special-action-icon: Roman numerals as text
    getSubtypeNumeralElement = (subtype) => {
        if (!subtype.count || subtype.count < 1) return null;
        const numerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
        const idx = Math.max(0, Math.min(subtype.count, numerals.length - 1));
        return <div className="numeral">{numerals[idx]}</div>;
    }

    // For action-sub-menu/action-subtype: image-based numbers
    getSubtypeImageCountElement = (subtype) => {
        let arr = ['zero','one','two','three','four','five','six','seven','eight','nine'];
        if (!subtype.count || subtype.count < 1) return null;
        let idx = Math.max(0, Math.min(subtype.count, arr.length - 1));
        return <div className="numeral" style={{backgroundImage: `url(${images[arr[idx]]})`}}></div>;
    }

    handleActionSubtypeClick = (action, subType) => {
        // For glyph actions, open the spell-slot builder instead of immediately starting
        if (action.type === 'glyph' && subType.glyphTier) {
            const currentTier = this.state.glyphBuilderOpen;
            // Toggle: clicking same tier closes the builder
            if (currentTier === subType.glyphTier) {
                this.setState({ glyphBuilderOpen: null, glyphBuilderSpells: [] });
            } else {
                this.setState({ glyphBuilderOpen: subType.glyphTier, glyphBuilderSpells: [] });
            }
            return;
        }
        // For tactics: select/deselect a tactic in the builder panel
        if (action.type === 'tactics' && subType.tacticKey) {
            const current = this.state.tacticsBuilderSelected;
            this.setState({ tacticsBuilderSelected: current === subType.tacticKey ? null : subType.tacticKey });
            return;
        }
        // For inner discipline: handle category expansion + child selection
        if (action.type === 'inner_discipline') {
            // Category subtype (Body Conditioning / Spirit Walk) — toggle submenu
            if (subType.isCategory && subType.categoryKey) {
                const current = this.state.innerDisciplineCategoryOpen;
                this.setState({
                    innerDisciplineCategoryOpen: current === subType.categoryKey ? null : subType.categoryKey,
                    innerDisciplineSelected: null, // reset selection when toggling category
                });
                return;
            }
            // Direct discipline (Meditative Focus) or child discipline — select for preview
            if (subType.disciplineKey) {
                const current = this.state.innerDisciplineSelected;
                this.setState({ innerDisciplineSelected: current === subType.disciplineKey ? null : subType.disciplineKey });
                return;
            }
        }
        // For prepare_poison: directly begin the acid bomb preparation
        if (action.type === 'prepare_poison' && subType.bombType === 'acid_bomb') {
            if (!subType.available) return; // disabled (max 2 or in-progress)
            const characterFromCrew = this.props.crewManager.crew.find(e => e.id === this.state.selectedCrewMember.id);
            if (!characterFromCrew) return;
            // Enforce max 2 acid bombs
            const readyBombs = (characterFromCrew.specialActions || []).filter(a => a.type === 'acid_bomb' && a.available).length;
            const inProgress = (characterFromCrew.specialActions || []).some(a => a.type === 'acid_bomb' && !a.available && new Date(a.endDate) > new Date());
            if (readyBombs >= 2) {
                this.displayMessage('You can hold at most 2 Acid Bombs!');
                return;
            }
            if (inProgress) {
                this.displayMessage('Already preparing an Acid Bomb!');
                return;
            }
            this.props.crewManager.beginSpecialAction(characterFromCrew, action, subType);
            const nextExpanded = this.collapseActionMenu(action.type);
            const meta = getMeta();
            meta.crew = this.props.crewManager.crew;
            storeMeta(meta);
            this.props.saveUserData();
            const updatedCrewMember = this.props.crewManager.crew.find(e => e.id === this.state.selectedCrewMember.id);
            this.displayMessage('🧪 Acid Bomb preparation started! Ready in 2 hours.');
            this.setState({
                preparePoisonBuilderOpen: false,
                actionMenuTypeExpanded: nextExpanded,
                selectedCrewMember: updatedCrewMember ? { ...updatedCrewMember } : this.state.selectedCrewMember,
            });
            return;
        }
        // For deploy_animal: directly begin the rat/crow deployment
        if (action.type === 'deploy_animal' && subType.agentType === 'scrounging_rat') {
            if (!subType.available) return; // disabled (already deployed)
            const characterFromCrew = this.props.crewManager.crew.find(e => e.id === this.state.selectedCrewMember.id);
            if (!characterFromCrew) return;
            const inProgress = (characterFromCrew.specialActions || []).some(a => a.type === 'rat_agent' && !a.available && new Date(a.endDate) > new Date());
            if (inProgress) {
                this.displayMessage('The Scrounging Rat is already deployed!');
                return;
            }
            this.props.crewManager.beginSpecialAction(characterFromCrew, action, subType);
            const nextExpanded = this.collapseActionMenu(action.type);
            const meta = getMeta();
            meta.crew = this.props.crewManager.crew;
            storeMeta(meta);
            this.props.saveUserData();
            const updatedCrewMember = this.props.crewManager.crew.find(e => e.id === this.state.selectedCrewMember.id);
            this.displayMessage('🐀 Scrounging Rat deployed! Returns in 30 minutes.');
            this.setState({
                deployAnimalBuilderOpen: false,
                actionMenuTypeExpanded: nextExpanded,
                selectedCrewMember: updatedCrewMember ? { ...updatedCrewMember } : this.state.selectedCrewMember,
            });
            return;
        }
        // Original path for rituals, scrimmage, etc.

        let characterFromCrew = this.props.crewManager.crew.find(e=>e.id === this.state.selectedCrewMember.id)
        this.props.crewManager.beginSpecialAction(characterFromCrew, action, subType)
        const nextExpanded = this.collapseActionMenu(action.type);
        const meta = getMeta();
        meta.crew = this.props.crewManager.crew;
        storeMeta(meta);
        this.props.saveUserData();
        // Force update to reflect new specialActions count immediately
        // Find updated selectedCrewMember from crewManager
        const updatedCrewMember = this.props.crewManager.crew.find(e => e.id === this.state.selectedCrewMember.id);
        if (updatedCrewMember) {
            this.setState({
                actionMenuTypeExpanded: nextExpanded,
                selectedCrewMember: { ...updatedCrewMember }
            });
        }
    }


    // Toggle a spell in the glyph builder. spellKey is the skills-matrix key.
    handleGlyphSpellToggle = (spellKey) => {
        const tier = this.state.glyphBuilderOpen;
        if (!tier || !GLYPHS[tier]) return;
        const glyphSlots = GLYPHS[tier].slots;
        const current = this.state.glyphBuilderSpells || [];
        const spellDef = skillsMatrix[spellKey];
        if (!spellDef) return;
        const spellCost = GLYPH_SPELL_SLOT_COST[spellDef.tier] || 1;

        // If already selected, remove it
        const existingIdx = current.findIndex(s => s.id === spellKey);
        if (existingIdx !== -1) {
            this.setState({ glyphBuilderSpells: current.filter((_, i) => i !== existingIdx) });
            return;
        }
        // Compute slots already used
        const slotsUsed = current.reduce((sum, s) => sum + (GLYPH_SPELL_SLOT_COST[s.tier] || 1), 0);
        if (slotsUsed + spellCost > glyphSlots) return; // not enough room
        this.setState({
            glyphBuilderSpells: [...current, { id: spellKey, tier: spellDef.tier, name: spellDef.name }]
        });
    }

    collapseActionMenu = (actionType) => {
        const nextExpanded = (Array.isArray(this.state.actionMenuTypeExpanded) ? this.state.actionMenuTypeExpanded : [])
            .filter(t => t !== actionType);
        const characterFromCrew = this.props.crewManager.crew.find(e => e.id === this.state.selectedCrewMember.id);
        if (characterFromCrew) {
            characterFromCrew.actionMenuTypeExpanded = nextExpanded;
        }
        return nextExpanded;
    }

    // Commit the built glyph — starts the preparation timer.
    handleGlyphPrepare = () => {
        const tier = this.state.glyphBuilderOpen;
        const spellDefs = this.state.glyphBuilderSpells || [];
        if (!tier || spellDefs.length === 0) return;

        const action = { type: 'glyph' };
        const subType = { glyphTier: tier, spellDefs };
        const characterFromCrew = this.props.crewManager.crew.find(e => e.id === this.state.selectedCrewMember.id);
        this.props.crewManager.beginSpecialAction(characterFromCrew, action, subType);
        const nextExpanded = this.collapseActionMenu('glyph');
        const meta = getMeta();
        meta.crew = this.props.crewManager.crew;
        storeMeta(meta);
        this.props.saveUserData();
        const updatedCrewMember = this.props.crewManager.crew.find(e => e.id === this.state.selectedCrewMember.id);
        this.setState({
            glyphBuilderOpen: null,
            glyphBuilderSpells: [],
            actionMenuTypeExpanded: nextExpanded,
            selectedCrewMember: updatedCrewMember ? { ...updatedCrewMember } : this.state.selectedCrewMember,
        });
    }

    // ── Battle Tactics handler ────────────────────────────────────────────────

    /** Commit to a tactic — starts the preparation timer. */
    handleTacticsCommit = (tacticKey) => {
        if (!tacticKey) return;
        const characterFromCrew = this.props.crewManager.crew.find(e => e.id === this.state.selectedCrewMember.id);
        if (!characterFromCrew) return;

        // Remove any previous tactics special action (replace with new one)
        characterFromCrew.specialActions = (characterFromCrew.specialActions || []).filter(a => a.type !== 'tactics');

        const action = { type: 'tactics' };
        const subType = { tacticKey };
        this.props.crewManager.beginSpecialAction(characterFromCrew, action, subType);
        const nextExpanded = this.collapseActionMenu('tactics');

        // Persist the collapsed state to the crew member so it survives state reload
        characterFromCrew.actionMenuTypeExpanded = nextExpanded;

        const meta = getMeta();
        meta.crew = this.props.crewManager.crew;
        storeMeta(meta);
        this.props.saveUserData();

        const updatedCrewMember = this.props.crewManager.crew.find(e => e.id === this.state.selectedCrewMember.id);
        this.displayMessage(`Battle tactic committed: ${this.props.crewManager.crew.find(e => e.id === this.state.selectedCrewMember.id)?.specialActions?.slice(-1)[0]?.name || tacticKey}. Preparation underway.`);
        this.setState({
            tacticsBuilderOpen: false,
            tacticsBuilderSelected: null,
            actionMenuTypeExpanded: nextExpanded,
            selectedCrewMember: updatedCrewMember ? { ...updatedCrewMember } : this.state.selectedCrewMember,
        });
    }

    // ── Inner Discipline commit handler (Monk) ─────────────────────────────────
    handleInnerDisciplineCommit = (disciplineKey) => {
        if (!disciplineKey) return;
        const discDef = INNER_DISCIPLINES[disciplineKey];
        if (!discDef) return;
        const characterFromCrew = this.props.crewManager.crew.find(e => e.id === this.state.selectedCrewMember.id);
        if (!characterFromCrew) return;

        const category = discDef.category;

        // Chi: enforce max charges
        if (category === 'chi') {
            const currentCharges = (characterFromCrew.specialActions || []).filter(
                a => a.type === 'inner_discipline' && a.category === 'chi' && a.available
            ).length;
            if (currentCharges >= (discDef.maxCharges || 3)) {
                this.displayMessage(`Maximum chi charges reached (${discDef.maxCharges || 3})!`);
                return;
            }
        }

        // Stances: beginSpecialAction handles removal of previous stance
        // Spirit: beginSpecialAction handles removal of previous spirit walk

        const action = { type: 'inner_discipline' };
        const subType = { disciplineKey };
        this.props.crewManager.beginSpecialAction(characterFromCrew, action, subType);
        const nextExpanded = this.collapseActionMenu('inner_discipline');

        const meta = getMeta();
        meta.crew = this.props.crewManager.crew;
        storeMeta(meta);
        this.props.saveUserData();

        const updatedCrewMember = this.props.crewManager.crew.find(e => e.id === this.state.selectedCrewMember.id);
        const catLabel = category === 'chi' ? 'Meditation' : category === 'stance' ? 'Stance training' : 'Spirit walk';
        this.displayMessage(`${catLabel} begun: ${discDef.name}. Preparation underway.`);
        this.setState({
            innerDisciplineBuilderOpen: false,
            innerDisciplineSelected: null,
            innerDisciplineCategoryOpen: null,
            actionMenuTypeExpanded: nextExpanded,
            selectedCrewMember: updatedCrewMember ? { ...updatedCrewMember } : this.state.selectedCrewMember,
        });
    }

    // ── Compound Potions handlers ─────────────────────────────────────────────


    /** Add a reagent to the next empty slot (max 3). Deselects if already in slots. */
    handleCompoundReagentClick = (reagentId) => {
        const slots = [...(this.state.compoundBuilderSlots || [])];
        const existingIdx = slots.indexOf(reagentId);
        if (existingIdx !== -1) {
            // Deselect — remove from slots
            slots.splice(existingIdx, 1);
        } else if (slots.length < 3) {
            slots.push(reagentId);
        }
        this.setState({ compoundBuilderSlots: slots });
    }

    /** Remove the reagent at a specific slot index by clicking the slot directly. */
    handleCompoundSlotRemove = (slotIndex) => {
        const slots = [...(this.state.compoundBuilderSlots || [])];
        slots.splice(slotIndex, 1);
        this.setState({ compoundBuilderSlots: slots });
    }

    /** Brew the matched potion: consume 1 of each reagent from inventory, start brewing timer. */
    handleCompoundBrew = () => {
        const slots = this.state.compoundBuilderSlots || [];
        const recipe = matchRecipe(slots);
        if (!recipe) return;
        const potion = POTIONS[recipe.potionId];
        if (!potion) return;

        // Consume 1 of each required reagent from inventory immediately
        recipe.reagents.forEach(reagentId => {
            const inv = (this.props.inventoryManager && this.props.inventoryManager.inventory) || [];
            const idx = inv.findIndex(item => item && item.id === reagentId && item.category === 'reagent');
            if (idx !== -1) {
                this.props.inventoryManager.removeItemByIndex(idx);
            }
        });

        // Start timed action
        const action = { type: 'compound' };
        const subType = { recipe, potion };
        const characterFromCrew = this.props.crewManager.crew.find(e => e.id === this.state.selectedCrewMember.id);
        this.props.crewManager.beginSpecialAction(characterFromCrew, action, subType);
        const nextExpanded = this.collapseActionMenu('compound');

        // Persist
        try {
            const meta = getMeta();
            meta.crew = this.props.crewManager.crew;
            meta.inventory = {
                items: this.props.inventoryManager.inventory,
                gold: this.props.inventoryManager.gold,
                shimmering_dust: this.props.inventoryManager.shimmering_dust,
                totems: this.props.inventoryManager.totems,
            };
            storeMeta(meta);
            this.props.saveUserData();
        } catch (e) { console.warn('handleCompoundBrew: persist failed', e); }

        this.displayMessage(`Started mixing ${potion.name}...`);

        // Reset builder slots and close
        this.setState({
            compoundBuilderSlots: [],
            compoundBuilderOpen: false,
            actionMenuTypeExpanded: nextExpanded,
            selectedCrewMember: characterFromCrew ? { ...characterFromCrew } : this.state.selectedCrewMember
        });
    }

    handleCombinePotions = (sourceKey, targetKey) => {
        const inv = (this.props.inventoryManager && this.props.inventoryManager.inventory) || [];
        const count = inv.filter(item => item && (item.id === sourceKey || item._im_key === sourceKey || item.name === sourceKey)).length;
        if (count < 2) return;

        // Remove 2 source potions
        this.props.inventoryManager.removeItemByKey(sourceKey);
        this.props.inventoryManager.removeItemByKey(sourceKey);

        // Add 1 target potion
        this.props.inventoryManager.addItemsByName([targetKey]);

        // Persist the changes
        try {
            const meta = getMeta();
            meta.inventory = {
                items: this.props.inventoryManager.inventory,
                gold: this.props.inventoryManager.gold,
                shimmering_dust: this.props.inventoryManager.shimmering_dust,
                totems: this.props.inventoryManager.totems,
            };
            storeMeta(meta);
            this.props.saveUserData();
        } catch (e) {
            console.warn('handleCombinePotions: persist failed', e);
        }

        const potionName = targetKey.replace(/_/g, ' ');
        this.displayMessage(`Combined 2 lower tier potions into 1 ${potionName}.`);
        this.forceUpdate(); // Refresh the UI
    };

    /** Add a brew ingredient to the next empty slot (max 2). Deselects if already in slots. */
    handleBrewIngredientClick = (ingredientId) => {
        const slots = [...(this.state.brewBuilderSlots || [])];
        const existingIdx = slots.indexOf(ingredientId);
        if (existingIdx !== -1) {
            slots.splice(existingIdx, 1);
        } else if (slots.length < 2) {
            slots.push(ingredientId);
        }
        this.setState({ brewBuilderSlots: slots });
    }

    /** Remove the brew ingredient at a specific slot index. */
    handleBrewSlotRemove = (slotIndex) => {
        const slots = [...(this.state.brewBuilderSlots || [])];
        slots.splice(slotIndex, 1);
        this.setState({ brewBuilderSlots: slots });
    }

    /** Brew the matched brew: consume ingredients, start brewing timer. */
    handleBrewStart = () => {
        const slots = this.state.brewBuilderSlots || [];
        const recipe = matchBrewRecipe(slots);
        if (!recipe) return;
        const brew = BREWS[recipe.brewId];
        if (!brew) return;

        // Consume 1 of each required ingredient from inventory immediately
        recipe.reagents.forEach(reagentId => {
            const inv = (this.props.inventoryManager && this.props.inventoryManager.inventory) || [];
            const idx = inv.findIndex(item => item && item.id === reagentId && item.category === 'reagent');
            if (idx !== -1) {
                this.props.inventoryManager.removeItemByIndex(idx);
            }
        });

        // Start timed action
        const action = { type: 'brew' };
        const subType = { recipe, brew };
        const characterFromCrew = this.props.crewManager.crew.find(e => e.id === this.state.selectedCrewMember.id);
        this.props.crewManager.beginSpecialAction(characterFromCrew, action, subType);
        const nextExpanded = this.collapseActionMenu('brew');

        // Persist
        try {
            const meta = getMeta();
            meta.crew = this.props.crewManager.crew;
            meta.inventory = {
                items: this.props.inventoryManager.inventory,
                gold: this.props.inventoryManager.gold,
                shimmering_dust: this.props.inventoryManager.shimmering_dust,
                totems: this.props.inventoryManager.totems,
            };
            storeMeta(meta);
            this.props.saveUserData();
        } catch (e) { console.warn('handleBrewStart: persist failed', e); }

        this.displayMessage(`Started brewing ${brew.name}...`);

        // Reset builder slots and close
        this.setState({
            brewBuilderSlots: [],
            brewBuilderOpen: false,
            actionMenuTypeExpanded: nextExpanded,
            selectedCrewMember: characterFromCrew ? { ...characterFromCrew } : this.state.selectedCrewMember
        });
    }

    // Called by MonsterBattle (via prop) when a fighter's consumable specialActions change
    handleFighterUpdateFromBattle = (fighter) => {
        if (!fighter || !fighter.id) return;
        try {
            // Update crewManager's copy — replace the array slot with a new spread object
            // so React.memo on Tile sees a changed `data` prop reference and re-renders.
            if (this.props.crewManager && Array.isArray(this.props.crewManager.crew)) {
                const idx = this.props.crewManager.crew.findIndex(c => c && c.id === fighter.id);
                if (idx !== -1) {
                    const cur = this.props.crewManager.crew[idx];
                    const updates = { specialActions: JSON.parse(JSON.stringify(fighter.specialActions || [])) };
                    // Skip dead/hp writes during respawn so battle-end callbacks can't clobber the restored state
                    if (!this._suppressFighterDeadHpUpdates) {
                        if (typeof fighter.hp !== 'undefined') updates.hp = fighter.hp;
                        if (typeof fighter.dead !== 'undefined') updates.dead = !!fighter.dead;
                    }
                    this.props.crewManager.crew[idx] = { ...cur, ...updates };
                }
            }

            // If this fighter is currently selected, update selectedCrewMember state so UI updates immediately.
            // Either way, forceUpdate so the crew tile list re-renders with the new member object reference.
            if (this.state.selectedCrewMember && this.state.selectedCrewMember.id === fighter.id) {
                this.setState({ selectedCrewMember: { ...this.state.selectedCrewMember, specialActions: JSON.parse(JSON.stringify(fighter.specialActions || [])), ...(!this._suppressFighterDeadHpUpdates && { hp: (typeof fighter.hp !== 'undefined' ? fighter.hp : this.state.selectedCrewMember.hp), dead: (typeof fighter.dead !== 'undefined' ? !!fighter.dead : this.state.selectedCrewMember.dead) }) } });
            } else {
                try { this.forceUpdate(); } catch(e) {}
            }

            // Persist to meta as well
            try {
                const meta = getMeta();
                if (meta && Array.isArray(meta.crew)) {
                    const mIdx = meta.crew.findIndex(c => c && c.id === fighter.id);
                    if (mIdx !== -1) {
                        meta.crew[mIdx].specialActions = JSON.parse(JSON.stringify(fighter.specialActions || []));
                        if (!this._suppressFighterDeadHpUpdates) {
                            if (typeof fighter.hp !== 'undefined') meta.crew[mIdx].hp = fighter.hp;
                            if (typeof fighter.dead !== 'undefined') meta.crew[mIdx].dead = !!fighter.dead;
                        }
                        storeMeta(meta);
                        if (typeof this.props.saveUserData === 'function') this.props.saveUserData();
                    }
                }
            } catch (err) {
                console.warn('handleFighterUpdateFromBattle: failed to persist meta', err);
            }
        } catch (err) {
            console.warn('handleFighterUpdateFromBattle failed', err);
        }
    }
    getActionCooldownPercentage = (action) => {
    if(!action) return;
    const startDate = new Date(action.startDate);
    const endDate = new Date(action.endDate);
    let diffInMilli = endDate - startDate;
    let diffInMinutes = diffInMilli / (1000 * 60);
    let currentTime = new Date();
    let minutesElapsed = (currentTime - startDate) / (1000 * 60);
    let percentageComplete = Math.ceil(minutesElapsed/diffInMinutes*100);
    if(percentageComplete > 100) percentageComplete = 100;
    return percentageComplete;
    }
    onUpdateModalClosed = () => {
        switch(this.state.modalType){
            case 'Updates':
                const meta = getMeta();
                let updates = this.state.updates;
                let crew = meta.crew;
                crew.forEach(c=>{
                    if(updates.some(e=>e.owner === c.name)){
                        let update = updates.find(e=>e.owner === c.name)
                        let ref = c.specialActions.find(e=> e.type === update.actionType && !e.notified)
                        if (ref) ref.notified = true;
                    }
                })
                // Clean up notified compound, brew, and sharpen_blades actions
                crew.forEach(c => {
                    c.specialActions = (c.specialActions || []).filter(sa => !(['compound', 'brew', 'sharpen_blades'].includes(sa.type) && sa.notified));
                });
                meta.crew = crew;
                this.props.crewManager.crew = crew;
                storeMeta(meta);
                this.props.saveUserData();
                this.setState({showModal: false, selectedCrewMember: crew.find(c => c.selected) || this.state.selectedCrewMember}, () => this._cleanupModalBodyClass())
            break;
            case 'PrepComplete':
                // In-session preparation completion modal — clear auto-dismiss timeout and close
                if (this.prepCompleteTimeout) {
                    clearTimeout(this.prepCompleteTimeout);
                    this.prepCompleteTimeout = null;
                }
                const prepCompleteMeta = getMeta();
                prepCompleteMeta.crew.forEach(c => {
                    c.specialActions = (c.specialActions || []).filter(sa => !(['compound', 'brew', 'sharpen_blades'].includes(sa.type) && sa.notified));
                });
                this.props.crewManager.crew = prepCompleteMeta.crew;
                storeMeta(prepCompleteMeta);
                this.props.saveUserData();
                this.setState({
                    showModal: false,
                    selectedCrewMember: prepCompleteMeta.crew.find(c => c.selected) || this.state.selectedCrewMember
                }, () => this._cleanupModalBodyClass());
            break;
            case 'SharpenBladesDetails':
                this.setState({ showModal: false }, () => {
                    this._cleanupModalBodyClass();
                    const action = {
                        type: 'sharpen_blades',
                        name: 'Sharpen Blades',
                        iconUrl: images['shortsword'] || '',
                        subTypes: []
                    };
                    this.handleActionSubtypeClick(action, {});
                });
            break;
            case 'RitualComplete':
                // Ritual completion modal — same dismiss logic as PrepComplete
                if (this.prepCompleteTimeout) {
                    clearTimeout(this.prepCompleteTimeout);
                    this.prepCompleteTimeout = null;
                }
                this.setState({ showModal: false }, () => this._cleanupModalBodyClass());
            break;
            case 'FoodComplete':
                if (this.prepCompleteTimeout) {
                    clearTimeout(this.prepCompleteTimeout);
                    this.prepCompleteTimeout = null;
                }
                this.setState({ showModal: false }, () => this._cleanupModalBodyClass());
            break;
            case 'Magic':
                this.setState({keysLocked: false}, () => this._cleanupModalBodyClass())
            break;
            case 'Merchant':
            case 'Alchemist':
                this.setState({ showModal: false, keysLocked: false }, () => this._cleanupModalBodyClass())
            break;
            default: break;
        }
    }

    // CoreUI CModal adds 'modal-open' + 'overflow:hidden' to <body> while any modal is
    // visible. If two modals open/close in rapid succession the class can be left behind
    // even after all modals are dismissed. Call this after every modal close to force-
    // clean it up whenever no modal is actually open.
    _cleanupModalBodyClass = () => {
        try {
            if (!this.state.showModal && !this.state.showQuestsPopup) {
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }
        } catch (e) {}
    }
    checkWhichSideOfBoard = () => {
        let side = this.props.boardManager.playerTile.location[0] < 22 ? 'top' : 'bottom'
        // console.log('side of board: ', side);
        return side
    }
    triggerRitualEncounter = () => {
        this.setState({
            keysLocked: true,
            modalType: 'Magic',
            showModal: true
        })
    }

    triggerNarrativeEncounter = () => {
        let meta = {};
        try { meta = getMeta() || {}; } catch (e) { meta = {}; }

        const { sequence, meta: updatedMeta } = getNextNarrativePayload(meta);
        if (!sequence) return;

        try { storeMeta(updatedMeta); } catch (e) {}
        try { if (typeof this.props.saveUserData === 'function') this.props.saveUserData(); } catch (e) {}

        this._setTimeout(() => {
            this.setState({
                activeNarrativeSequence: sequence,
                showNarrativeOverlay: true,
                keysLocked: true
            });
        }, 140);
    }

    triggerVendorEncounter = (vendorType) => {
        const normalized = String(vendorType || '').toLowerCase();
        this.setState({
            keysLocked: true,
            modalType: normalized === 'alchemist' ? 'Alchemist' : 'Merchant',
            showModal: true
        });
    }

    triggerShrineEncounter = (tile) => {
        // tile.contains = { type: 'shrine', subtype: classKey, key: shrineKey }
        const shrineClass = (tile && tile.contains && tile.contains.subtype) || null;
        const crew = (this.props.crewManager && this.props.crewManager.crew) || [];
        const meta = getMeta() || {};

        // Check Resolve gate (must be > 50)
        const currentResolve = typeof meta.resolve === 'number' ? meta.resolve : 100;
        if (currentResolve <= 50) {
            try { if (this.props.boardManager.messaging) this.props.boardManager.messaging('🏛 The shrine is cold — your party\'s resolve is too low to commune.'); } catch(e) {}
            return;
        }

        // Check one-time use per run
        const shrinesUsed = Array.isArray(meta.shrinesUsed) ? meta.shrinesUsed : [];
        const shrineKey = tile && tile.contains && tile.contains.key;
        if (shrineKey && shrinesUsed.includes(shrineKey)) {
            try { if (this.props.boardManager.messaging) this.props.boardManager.messaging('🏛 This shrine has already been communed with.'); } catch(e) {}
            return;
        }

        // Find the matching crew member
        const matchingMember = shrineClass ? crew.find(m => (m.type || '').toLowerCase() === shrineClass.toLowerCase()) : null;

        if (shrineClass && !matchingMember) {
            try { if (this.props.boardManager.messaging) this.props.boardManager.messaging(`🏛 You need a ${shrineClass} in your party to commune with this shrine.`); } catch(e) {}
            return;
        }

        // Launch the new full-screen ShrineScreen (cinematic combat encounter)
        this.setState({
            keysLocked: true,
            inShrineScreen: true,
            shrineData: {
                tile,
                shrineClass,
                shrineKey,
                matchingMember,
            },
        });
    }

    closeShrineOverlay = (cancelled = false) => {
        clearInterval(this._shrineInterval);
        this.setState({
            keysLocked: false,
            showShrineOverlay: false,
            shrineData: null,
        });
    }

    // Called by ShrineScreen when the encounter ends (success or failure)
    onShrineComplete = (result) => {
        const { success, shrineData, selectedSkill } = result || {};

        if (success) {
            if (this.props.questManager) {
                this.props.questManager.updateProgressByType('communion', 1);
            }
        }

        if (success && selectedSkill) {
            // Delegate to existing confirmGlobalSkill — it handles marking used, awarding skill, removing tile
            // But we need shrineData in state for confirmGlobalSkill to read
            this.setState({ shrineData, inShrineScreen: false }, () => {
                this.confirmGlobalSkill(selectedSkill);
            });
        } else if (success && !selectedSkill) {
            // No more skills to unlock — just mark shrine used and clean up
            const meta = getMeta() || {};
            if (shrineData && shrineData.shrineKey) {
                const shrinesUsed = Array.isArray(meta.shrinesUsed) ? meta.shrinesUsed : [];
                if (!shrinesUsed.includes(shrineData.shrineKey)) shrinesUsed.push(shrineData.shrineKey);
                meta.shrinesUsed = shrinesUsed;
                try { storeMeta(meta); } catch(e) {}
            }
            if (shrineData && shrineData.tile) {
                try { this.props.boardManager.removeTileFromBoard(shrineData.tile); } catch(e) {}
            }
            try { if (this.props.boardManager.messaging) this.props.boardManager.messaging('🏛 Communion complete — all shrine gifts already bestowed.'); } catch(e) {}
            this.setState({ keysLocked: false, inShrineScreen: false, shrineData: null });
        } else {
            // Failure — shrine not marked used (they can try again later if resolve allows)
            try { if (this.props.boardManager.messaging) this.props.boardManager.messaging('🏛 The communion was broken — the shrine\'s power awaits another attempt.'); } catch(e) {}
            this.setState({ keysLocked: false, inShrineScreen: false, shrineData: null });
        }
    }


    confirmGlobalSkill = (skillKey) => {
        if (!skillKey) return;
        const { shrineData } = this.state;
        const meta = getMeta() || {};

        // Mark shrine as used
        if (shrineData && shrineData.shrineKey) {
            const shrinesUsed = Array.isArray(meta.shrinesUsed) ? meta.shrinesUsed : [];
            if (!shrinesUsed.includes(shrineData.shrineKey)) shrinesUsed.push(shrineData.shrineKey);
            meta.shrinesUsed = shrinesUsed;
        }

        // Award the global skill to the matching crew member
        const crew = Array.isArray(meta.crew) ? meta.crew : [];
        const shrineClass = shrineData && shrineData.shrineClass;
        if (shrineClass) {
            const memberIdx = crew.findIndex(m => (m.type || '').toLowerCase() === shrineClass.toLowerCase());
            if (memberIdx !== -1) {
                const member = crew[memberIdx];
                const globalSkills = Array.isArray(member.globalSkills) ? member.globalSkills : [];
                
                const skillIdx = globalSkills.findIndex(s => (typeof s === 'string' ? s : s.key) === skillKey);
                if (skillIdx !== -1) {
                    const existing = globalSkills[skillIdx];
                    const currentLvl = typeof existing === 'string' ? 1 : (existing.level || 1);
                    const newLvl = Math.min(3, currentLvl + 1);
                    globalSkills[skillIdx] = { key: skillKey, level: newLvl };
                } else {
                    globalSkills.push({ key: skillKey, level: 1 });
                }

                crew[memberIdx] = { ...member, globalSkills };
                meta.crew = crew;
                // Mirror to crewManager
                if (this.props.crewManager && Array.isArray(this.props.crewManager.crew)) {
                    const cmIdx = this.props.crewManager.crew.findIndex(m => (m.type || '').toLowerCase() === shrineClass.toLowerCase());
                    if (cmIdx !== -1) {
                        this.props.crewManager.crew[cmIdx] = { ...this.props.crewManager.crew[cmIdx], globalSkills };
                    }
                }
            }
        }

        try { storeMeta(meta); } catch(e) {}
        try { if (typeof this.props.saveUserData === 'function') this.props.saveUserData(); } catch(e) {}

        // Remove shrine tile from board so it can't be re-triggered this session
        if (shrineData && shrineData.tile) {
            try { this.props.boardManager.removeTileFromBoard(shrineData.tile); } catch(e) {}
        }

        clearInterval(this._shrineInterval);
        this.setState({ keysLocked: false, showShrineOverlay: false, inShrineScreen: false, shrineData: null });
        try { if (this.props.boardManager.messaging) this.props.boardManager.messaging(`✨ Global skill unlocked: ${skillKey.replace(/_/g,' ')}`); } catch(e) {}

    }

    triggerLoreTabletEncounter = (tile) => {
        const domain = (tile && tile.contains && tile.contains.subtype) || 'unknown';
        const meta = getMeta() || {};
        const selectedMember = this.state.selectedCrewMember;
        if (!selectedMember) return;

        // Award a domain token to the active crew member
        const crew = Array.isArray(meta.crew) ? meta.crew : [];
        const memberIdx = crew.findIndex(m => m.id === selectedMember.id);
        if (memberIdx !== -1) {
            const member = crew[memberIdx];
            const loreTokens = { ...(member.loreTokens || {}) };
            loreTokens[domain] = (loreTokens[domain] || 0) + 1;
            crew[memberIdx] = { ...member, loreTokens };
            meta.crew = crew;
            try { storeMeta(meta); } catch(e) {}
            try { if (typeof this.props.saveUserData === 'function') this.props.saveUserData(); } catch(e) {}
            // Remove tablet from board
            try { this.props.boardManager.removeTileFromBoard(tile); } catch(e) {}
            
            // Progress lore quests
            if (this.props.questManager) {
                this.props.questManager.updateProgressByType('lore', 1);
            }

            const count = loreTokens[domain];
            try { if (this.props.boardManager.messaging) this.props.boardManager.messaging(`📜 ${selectedMember.name} absorbs the lore of ${domain}. (${count}/3 tokens)`); } catch(e) {}
        }
    }

    closeNarrativeOverlay = () => {
        this.setState({
            activeNarrativeSequence: null,
            showNarrativeOverlay: false,
            keysLocked: false
        });
    }

    handleCloseQuestsPopup = () => {
        try {
            // Mark as seen for this session only so a full page refresh will show it again
            this.seenQuests = true;
        } catch (e) {}
        // Clear any pending scheduled popup to avoid it reopening
        try { if (this.questsPopupTimeout) { clearTimeout(this.questsPopupTimeout); this.questsPopupTimeout = null; } } catch(e){}
        try { this.setState({ showQuestsPopup: false }, () => this._cleanupModalBodyClass()); } catch(e){}
    }

    handleOpenQuestsPopup = () => {
        try { this.setState({ showQuestsPopup: true }); } catch(e) {}
    }

    handleOpenCampPopup = () => {
        try { this.setState({ showCampPopup: true }); } catch(e) {}
    }

    handleOpenSkillTree = (crewMember) => {
        try { this.setState({ showSkillTreePopup: true, selectedSkillTreeCrewMember: crewMember }); } catch(e) {}
    }
    handleCloseSkillTree = () => {
        try { this.setState({ showSkillTreePopup: false, selectedSkillTreeCrewMember: null }); } catch(e) {}
    }
    handleCloseCampPopup = () => {
        try { this.setState({ showCampPopup: false, showFoodPrepOverlay: false, showSpellsOverlay: false, showMapOverlay: false, mapZoomedLevelId: null, mapUnzoomingLevelId: null, mapRevealAfterUnzoom: false, mapPendingZoomLevelId: null, mapSelectedLevelId: null, mapBoardDetailStage: null, mapBoardDetailBoardIndex: null }, () => this._cleanupModalBodyClass()); } catch(e) {}
    }

    handleOpenFoodPrep = () => {
        this.setState({ showFoodPrepOverlay: true });
    }

    handleFoodPrepBack = () => {
        this.setState({ showFoodPrepOverlay: false });
    }

    handleOpenSpells = () => {
        this.setState({ showSpellsOverlay: true });
    }

    handleSpellsBack = () => {
        this.setState({ showSpellsOverlay: false });
    }

    handleSpellAction = (member, ritual, actionType) => {
        if (actionType === 'prepare') {
            this.props.crewManager.beginSpecialAction(member, { type: 'ritual' }, { ritualKey: ritual.key });
            
            const meta = getMeta();
            meta.crew = this.props.crewManager.crew;
            storeMeta(meta);
            this.props.saveUserData();
            this.setState({ crew: [...this.props.crewManager.crew] });
            this.displayMessage(`${member.name} started preparing ${ritual.name}.`);
        } else if (actionType === 'cast') {
            if (ritual.key === 'unlock') {
                const crew = this.props.crewManager.crew;
                const activeUnlock = crew.find(m => m.unlockSpellActive);
                if (activeUnlock) {
                    this.displayMessage(`Only one Unlock spell can be active at a time (currently active on ${activeUnlock.name}).`);
                    return;
                }
                
                member.specialActions = (member.specialActions || []).filter(a => !(a.type === 'ritual' && a.ritualKey === 'unlock' && a.available));
                member.unlockSpellActive = true;
                
                const meta = getMeta();
                meta.crew = this.props.crewManager.crew;
                storeMeta(meta);
                this.props.saveUserData();
                this.setState({ crew: [...this.props.crewManager.crew] });
                this.displayMessage(`${member.name} cast Unlock! An active indicator is shown on their portrait.`);
            }
        }
    }

    handleOpenTraining = () => {
        this.setState({ showTrainingOverlay: true, trainingResults: {} });
    }

    handleTrainingBack = () => {
        this.setState({ showTrainingOverlay: false, trainingResults: {} });
    }

    handleConfirmDrill = (member, drillStat, takeRisk) => {
        try {
            const meta = getMeta() || {};
            const currentFood = typeof meta.food === 'number' ? meta.food : 0;
            const FOOD_COST = 2;
            if (currentFood < FOOD_COST) return;

            // Resolve progress delta based on stat + risk choice
            const DRILLS = {
                str: { safe: 1, risk: 2, riskLabel: 'Exhausted next combat', riskChance: 1.0 },
                dex: { safe: 1, risk: 2, riskLabel: '25% chance: 50% endurance next combat', riskChance: 0.25 },
                fort: { safe: 1, risk: 2, riskLabel: 'Bleed risk next combat', riskChance: 1.0 },
                int: { safe: 1, risk: null, riskLabel: '75% chance +2, 25% chance +0', riskChance: null },
            };
            const drill = DRILLS[drillStat];
            if (!drill) return;

            let delta = drill.safe;
            let riskTriggered = false;
            if (takeRisk) {
                if (drillStat === 'int') {
                    delta = Math.random() < 0.75 ? 2 : 0;
                } else if (drillStat === 'dex') {
                    delta = 2;
                    riskTriggered = Math.random() < 0.25;
                } else {
                    delta = 2;
                    riskTriggered = true;
                }
            }

            // Deduct food
            meta.food = currentFood - FOOD_COST;

            // Calculate duration based on current progress
            const currentProgress = (member.trainingProgress && member.trainingProgress[drillStat]) || 0;
            const durationHours = currentProgress + 1;

            const now = new Date();
            member.trainingActive = {
                stat: drillStat,
                delta,
                takeRisk,
                riskTriggered,
                startDate: now.toISOString(),
                endDate: new Date(now.getTime() + durationHours * 3600 * 1000).toISOString()
            };

            // Sync with meta.crew
            const crew = meta.crew || [];
            const idx = crew.findIndex(c => c.id === member.id);
            if (idx !== -1) {
                crew[idx].trainingActive = member.trainingActive;
            }
            meta.crew = crew;

            try { storeMeta(meta); } catch(e) {}
            try { if (typeof this.props.saveUserData === 'function') this.props.saveUserData(); } catch(e) {}

            const STAT_LABELS = { str: 'STR', dex: 'DEX', fort: 'FORT', int: 'INT' };
            const startMsg = `⚔️ ${member.name} started training ${STAT_LABELS[drillStat]}! (Takes ${durationHours}h)`;
            this.setState({ toastMessage: startMsg }, () => {
                setTimeout(() => this.setState({ toastMessage: null }), 4000);
            });
        } catch (e) {
            console.warn('handleConfirmDrill failed', e);
        }
    }

    handleOpenMapOverlay = () => {
        const tracker = this.state.levelTracker || [];
        const activeLevel = tracker.find((entry) => entry && entry.active);
        const currentLevelId = activeLevel ? Number(activeLevel.id) : Number((getMeta() || {}).location?.levelId || 0);
        const persistedZoom = this.getPersistedMapZoomLevel();
        const activeBoardIndex = this.getActiveMapBoardIndex();
        const nextState = {
            showMapOverlay: true,
            mapSelectedLevelId: currentLevelId,
            mapZoomedLevelId: null,
            mapUnzoomingLevelId: null,
            mapRevealAfterUnzoom: false,
            mapPendingZoomLevelId: null,
            mapBoardDetailStage: null,
            mapBoardDetailBoardIndex: null
        };

        if (persistedZoom === 'plane' || persistedZoom === 'zone') {
            nextState.mapZoomedLevelId = currentLevelId;
        }
        if (persistedZoom === 'zone' && activeBoardIndex >= 0) {
            nextState.mapBoardDetailStage = 'detail';
            nextState.mapBoardDetailBoardIndex = activeBoardIndex;
        }

        this.setState(nextState);
    }

    handleMapOverlayBack = () => {
        this.setState({ showMapOverlay: false, mapZoomedLevelId: null, mapUnzoomingLevelId: null, mapRevealAfterUnzoom: false, mapPendingZoomLevelId: null, mapSelectedLevelId: null, mapBoardDetailStage: null, mapBoardDetailBoardIndex: null });
    }

    handleMapLevelSelect = (levelId) => {
        const nextLevel = Number(levelId);
        if (Number.isNaN(nextLevel)) return;
        this.setState({
            mapSelectedLevelId: nextLevel,
            mapZoomedLevelId: null,
            mapUnzoomingLevelId: null,
            mapRevealAfterUnzoom: false,
            mapPendingZoomLevelId: null,
            mapBoardDetailStage: null,
            mapBoardDetailBoardIndex: null
        });
        this.persistMapZoomLevelInMeta('dungeon');
    }

    handleMapZoomClose = () => {
        const exitingLevelId = this.state.mapZoomedLevelId;
        if (exitingLevelId === null || typeof exitingLevelId === 'undefined') return;

        this.setState({ mapZoomedLevelId: null, mapUnzoomingLevelId: exitingLevelId, mapRevealAfterUnzoom: false, mapPendingZoomLevelId: null, mapBoardDetailStage: null, mapBoardDetailBoardIndex: null });
        this.persistMapZoomLevelInMeta('dungeon');
        this._setTimeout(() => {
            this.setState((prev) => {
                if (prev.mapUnzoomingLevelId !== exitingLevelId) return null;
                return { mapUnzoomingLevelId: null, mapRevealAfterUnzoom: true };
            });
        }, 750);

        this._setTimeout(() => {
            this.setState((prev) => {
                if (prev.mapZoomedLevelId !== null || prev.mapUnzoomingLevelId !== null) return null;
                if (!prev.mapRevealAfterUnzoom) return null;
                return { mapRevealAfterUnzoom: false };
            });
        }, 1700);
    }

    handleMapZoomInStart = (levelId, levelCount, selectedIndex) => {
        const MAP_FADE_DURATION_MS = 1000;
        const MAP_FADE_STAGGER_MS = 90;
        const totalLevels = Math.max(Number(levelCount) || 1, 1);
        const safeSelectedIndex = Number.isInteger(selectedIndex) ? selectedIndex : 0;
        const highestIndex = totalLevels - 1;
        const maxNonSelectedIndex = safeSelectedIndex === highestIndex ? Math.max(highestIndex - 1, 0) : highestIndex;
        const zoomStartDelay = MAP_FADE_DURATION_MS + (maxNonSelectedIndex * MAP_FADE_STAGGER_MS);

        this.setState({
            mapPendingZoomLevelId: levelId,
            mapZoomedLevelId: null,
            mapUnzoomingLevelId: null,
            mapRevealAfterUnzoom: false,
            mapBoardDetailStage: null,
            mapBoardDetailBoardIndex: null
        });
        this.persistMapZoomLevelInMeta('plane');

        this._setTimeout(() => {
            this.setState((prev) => {
                if (prev.mapPendingZoomLevelId !== levelId) return null;
                return { mapZoomedLevelId: levelId, mapPendingZoomLevelId: null };
            });
        }, zoomStartDelay);
    }

    handleMapCurrentBoardLayerOpen = (boardIndex, forceOpen = false) => {
        const idx = Number(boardIndex);
        if (Number.isNaN(idx) || idx < 0 || idx > 8) return;

        // Toggle off if already opened for this board.
        if (this.state.mapBoardDetailStage === 'detail' && this.state.mapBoardDetailBoardIndex === idx) {
            if (forceOpen) {
                this.persistMapZoomLevelInMeta('zone');
                return;
            }
            this.setState({ mapBoardDetailStage: null, mapBoardDetailBoardIndex: null });
            this.persistMapZoomLevelInMeta('plane');
            return;
        }

        this.setState({ mapBoardDetailStage: 'fading', mapBoardDetailBoardIndex: idx });
        this.persistMapZoomLevelInMeta('zone');
        this._setTimeout(() => {
            this.setState((prev) => {
                if (prev.mapBoardDetailBoardIndex !== idx || prev.mapBoardDetailStage !== 'fading') return null;
                return { mapBoardDetailStage: 'detail' };
            });
        }, 520);
    }

    getPersistedMapZoomLevel = () => {
        try {
            const meta = getMeta() || {};
            const raw = typeof meta.mapZoomLevel === 'string' ? meta.mapZoomLevel.toLowerCase() : 'dungeon';
            if (raw === 'plane' || raw === 'zone' || raw === 'dungeon') return raw;
        } catch (e) {}
        return 'dungeon';
    }

    persistMapZoomLevelInMeta = (zoomLevel) => {
        const normalized = typeof zoomLevel === 'string' ? zoomLevel.toLowerCase() : '';
        if (!['dungeon', 'plane', 'zone'].includes(normalized)) return;
        try {
            const meta = getMeta() || {};
            if (meta.mapZoomLevel === normalized) return;
            meta.mapZoomLevel = normalized;
            storeMeta(meta);
        } catch (e) {}
    }

    getActiveMapBoardIndex = () => {
        if (Array.isArray(this.state.minimap)) {
            const activeIdx = this.state.minimap.findIndex((entry) => entry && entry.active);
            if (activeIdx >= 0) return activeIdx;
        }
        const bm = this.props.boardManager;
        if (!bm) return -1;
        if (bm.playerTile && typeof bm.playerTile.boardIndex === 'number') return bm.playerTile.boardIndex;
        if (typeof bm.getBoardIndexFromBoard === 'function' && bm.currentBoard) {
            const idx = bm.getBoardIndexFromBoard(bm.currentBoard);
            if (typeof idx === 'number') return idx;
        }
        return -1;
    }

    handleMapBreadcrumbNavigate = (targetLevel, options = {}) => {
        const target = (targetLevel || '').toLowerCase();
        const tracker = this.state.levelTracker || [];
        const activeLevel = tracker.find((entry) => entry && entry.active);
        const fallbackLevelId = activeLevel ? Number(activeLevel.id) : Number((getMeta() || {}).location?.levelId || 0);
        const requestedLevelId = Number(options.levelId);
        const resolvedLevelId = Number.isNaN(requestedLevelId) ? fallbackLevelId : requestedLevelId;

        if (target === 'dungeon') {
            this.setState({
                mapZoomedLevelId: null,
                mapUnzoomingLevelId: null,
                mapRevealAfterUnzoom: false,
                mapPendingZoomLevelId: null,
                mapBoardDetailStage: null,
                mapBoardDetailBoardIndex: null
            });
            this.persistMapZoomLevelInMeta('dungeon');
            return;
        }

        if (target === 'plane') {
            if (this.state.mapZoomedLevelId === resolvedLevelId) {
                this.setState({
                    mapSelectedLevelId: resolvedLevelId,
                    mapBoardDetailStage: null,
                    mapBoardDetailBoardIndex: null
                });
                this.persistMapZoomLevelInMeta('plane');
                return;
            }

            const levelCount = Number(options.levelCount) || 1;
            const selectedIndex = Number.isInteger(options.selectedIndex) ? options.selectedIndex : 0;
            this.setState({ mapSelectedLevelId: resolvedLevelId }, () => {
                this.handleMapZoomInStart(resolvedLevelId, levelCount, selectedIndex);
            });
            return;
        }

        if (target === 'zone') {
            const boardIndexRaw = options.boardIndex;
            const boardIndex = Number.isInteger(boardIndexRaw) ? boardIndexRaw : this.getActiveMapBoardIndex();
            if (boardIndex < 0 || boardIndex > 8) return;

            const ensureZoneOpen = () => {
                this.handleMapCurrentBoardLayerOpen(boardIndex, true);
            };

            if (this.state.mapZoomedLevelId === resolvedLevelId) {
                this.setState({ mapSelectedLevelId: resolvedLevelId }, ensureZoneOpen);
                return;
            }

            this.setState({
                mapSelectedLevelId: resolvedLevelId,
                mapZoomedLevelId: resolvedLevelId,
                mapUnzoomingLevelId: null,
                mapRevealAfterUnzoom: false,
                mapPendingZoomLevelId: null,
                mapBoardDetailStage: null,
                mapBoardDetailBoardIndex: null
            }, ensureZoneOpen);
        }
    }

    getMapBoardHighlightSvg = (boardIndex) => {
        const idx = Number(boardIndex);
        if (Number.isNaN(idx) || idx < 0 || idx > 8) return '';

        // The tower plane is visually rotated relative to the row-major minimap grid.
        // This remap rotates minimap indices clockwise into the projected slab cells.
        const projectedIndexByMinimapIndex = [6, 3, 0, 7, 4, 1, 8, 5, 2];
        const projectedIndex = projectedIndexByMinimapIndex[idx];
        const row = Math.floor(projectedIndex / 3);
        const col = projectedIndex % 3;
        const a0 = col / 3;
        const a1 = (col + 1) / 3;
        const b0 = row / 3;
        const b1 = (row + 1) / 3;

        const point = (a, b) => {
            const x = 50 + (50 * (a - b));
            const y = 50 * (a + b);
            return `${x.toFixed(3)},${y.toFixed(3)}`;
        };

        const rawPoints = [
            point(a0, b0),
            point(a1, b0),
            point(a1, b1),
            point(a0, b1)
        ].map((pair) => {
            const [x, y] = pair.split(',').map(Number);
            return { x, y };
        });

        const center = rawPoints.reduce((acc, p) => ({
            x: acc.x + p.x,
            y: acc.y + p.y
        }), { x: 0, y: 0 });
        center.x /= rawPoints.length;
        center.y /= rawPoints.length;

        // Pull edges inward to create a true inner border (not overlapping grid lines).
        const insetFactor = 0.17;
        const insetPoints = rawPoints.map((p) => {
            const x = p.x + ((center.x - p.x) * insetFactor);
            const y = p.y + ((center.y - p.y) * insetFactor);
            return `${x.toFixed(3)},${y.toFixed(3)}`;
        }).join(' ');

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="${insetPoints}" fill="none" stroke="#66c2ff" stroke-width="2.2" stroke-linejoin="round"/></svg>`;
        return `url("data:image/svg+xml;base64,${btoa(svg)}")`;  
    }

    handleStartRecipe = (recipe) => {
        try {
            const meta = getMeta() || {};
            const currentFood = typeof meta.food === 'number' ? meta.food : 0;
            if (currentFood < recipe.foodCost) return;
            if (meta.campCooking && !meta.campCooking.notified) return; // already cooking
            meta.food = currentFood - recipe.foodCost;
            const startDate = new Date();
            const endDate = new Date(Date.now() + recipe.cookTime);
            meta.campCooking = {
                recipeKey: recipe.key,
                recipeName: recipe.name,
                foodYield: recipe.foodYield,
                startDate,
                endDate,
                notified: false,
            };
            try { storeMeta(meta); } catch(e) {}
            try { updateUserRequest(getUserId(), meta).catch(() => {}); } catch(e) {}
            try { if (typeof this.props.saveUserData === 'function') this.props.saveUserData(); } catch(e) {}
        } catch(e) { console.warn('handleStartRecipe failed', e); }
        this.setState({ showFoodPrepOverlay: false, showCampPopup: false }, () => this._cleanupModalBodyClass());
    }
    render(){
        const crew = ((this.props.crewManager && this.props.crewManager.crew) || []);

        const hasMagicUser = crew.some(member => ['wizard', 'sage'].includes((member.type || '').toLowerCase()));
        const magicUsers = crew.filter(member => ['wizard', 'sage'].includes((member.type || '').toLowerCase()));

        return (
        <div className={`dungeon-container ${this.state.ritualWrecked ? 'wrecked' : ''}`}>
            {this.state.showFoodGoneBadPopup && (
                <CModal
                    visible={this.state.showFoodGoneBadPopup}
                    onClose={() => this.setState({ showFoodGoneBadPopup: false })}
                    alignment="center"
                    className="food-gone-bad-modal"
                >
                    <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#1a120b', border: '2px solid #8f5c38', color: '#f5efe6', borderRadius: '8px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }} role="img" aria-label="rotten meat">🤢</div>
                        <h3 style={{ color: '#e74c3c', fontSize: '24px', margin: '0 0 12px 0', fontFamily: 'Outfit, sans-serif' }}>Food Has Gone Bad!</h3>
                        <p style={{ fontSize: '16px', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                            Your food supply exceeded the fresh storage limit of <strong style={{ color: '#2ecc71' }}>{this.state.foodGoneBadLimit}</strong> units.
                        </p>
                        <div style={{ backgroundColor: '#2c1e12', padding: '12px', borderRadius: '4px', border: '1px dashed #d35400', marginBottom: '24px' }}>
                            <span style={{ fontSize: '18px', color: '#e67e22', fontWeight: 'bold' }}>-{this.state.foodGoneBadAmount} Food Spoiled</span>
                        </div>
                        <button
                            onClick={() => this.setState({ showFoodGoneBadPopup: false })}
                            style={{
                                padding: '10px 24px',
                                fontSize: '16px',
                                backgroundColor: '#8f5c38',
                                border: 'none',
                                color: 'white',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#a06d4a'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#8f5c38'}
                        >
                            Understood
                        </button>
                    </div>
                </CModal>
            )}
            {this.state.showAmbushPopup && this.state.ambushMonster && (() => {
                const monster = this.state.ambushMonster;
                const tierColors = {
                    1: '#2ecc71', // Common (Green)
                    2: '#3498db', // Elite (Blue)
                    3: '#9b59b6', // Epic (Purple)
                    4: '#e74c3c'  // Legendary (Red)
                };
                const tierLabels = {
                    1: 'Common (Tier 1)',
                    2: 'Elite (Tier 2)',
                    3: 'Epic (Tier 3)',
                    4: 'Legendary (Tier 4)'
                };
                const tierColor = tierColors[monster.tier] || '#2ecc71';
                const tierLabel = tierLabels[monster.tier] || 'Tier ' + monster.tier;
                
                const isTier1Main = monster.tier === 1;
                const displayHp = isTier1Main ? (monster.stats?.hp || 0) * 2 : (monster.stats?.hp || 0);
                const displaySpeed = monster.stats?.speed || monster.stats?.dex || 0;

                const portraitSrc = (typeof monster.portrait === 'string') 
                    ? ((images[monster.portrait]?.default || images[monster.portrait] || images[monster.portrait.replace('_portrait', '')]?.default || images[monster.portrait.replace('_portrait', '')]) || monster.portrait) 
                    : (monster.portrait?.default || monster.portrait);

                return (
                    <div className="ambush-popup-overlay">
                        <div className="ambush-popup-card">
                            <h2 className="ambush-title">Ambush!</h2>
                            <p className="ambush-subtitle">
                                You were ambushed by a <span className="monster-highlight">{monster.name}</span>!
                            </p>
                            <div className="ambush-portrait-frame" style={{ border: `2px solid ${tierColor}`, boxShadow: `0 0 15px ${tierColor}40` }}>
                                <img 
                                    src={portraitSrc} 
                                    alt={monster.name} 
                                    className="ambush-portrait"
                                />
                                <div className="ambush-badge" style={{ borderColor: tierColor, color: tierColor }}>
                                    {tierLabel}
                                </div>
                            </div>
                            
                            <div className="ambush-stats-grid">
                                <div className="ambush-stat-item">
                                    <span className="stat-icon" role="img" aria-label="Heart">❤️</span>
                                    <span className="stat-label">Health</span>
                                    <span className="stat-value">{displayHp}</span>
                                </div>
                                <div className="ambush-stat-item">
                                    <span className="stat-icon" role="img" aria-label="Swords">⚔️</span>
                                    <span className="stat-label">Attack</span>
                                    <span className="stat-value">{monster.stats?.atk || 0}</span>
                                </div>
                                <div className="ambush-stat-item">
                                    <span className="stat-icon" role="img" aria-label="Shield">🛡️</span>
                                    <span className="stat-label">Defense</span>
                                    <span className="stat-value">{monster.stats?.def || 0}</span>
                                </div>
                                <div className="ambush-stat-item">
                                    <span className="stat-icon" role="img" aria-label="Lightning bolt">⚡</span>
                                    <span className="stat-label">Speed</span>
                                    <span className="stat-value">{displaySpeed}</span>
                                </div>
                            </div>
                            
                            <button className="ambush-fight-btn" onClick={() => this.startAmbushCombat()}>
                                Fight
                            </button>
                            <div className="ambush-shortcut-hint">
                                Press [Enter] to Fight
                            </div>
                        </div>
                    </div>
                );
            })()}
            {this.state.showTrapPopup && this.state.trapResults && (() => {
                const results = this.state.trapResults;
                return (
                    <div className="trap-popup-overlay">
                        <div className="trap-popup-card">
                            <h2 className="trap-title">Trap Sprung!</h2>
                            <p className="trap-subtitle">
                                Your party triggered a hidden trap! <span style={{color: '#aaa', fontSize: '0.85rem'}}>(Damage range: {results.damageRange})</span>
                            </p>
                            <div className="trap-crew-results">
                                {results.crewResults.map((cr, idx) => (
                                    <div key={idx} className={`trap-crew-row ${cr.saved ? 'saved' : 'hit'}`}>
                                        <span className="trap-crew-name">{cr.name}</span>
                                        <span className="trap-roll-info">
                                            d20: {cr.d20Roll} + DEX {cr.dexStat}{cr.keenEyeBonus > 0 ? ` + KE ${cr.keenEyeBonus}` : ''} = {cr.totalRoll}
                                        </span>
                                        <span className={`trap-result-label ${cr.saved ? 'dodged' : 'damaged'}`}>
                                            {cr.saved ? 'Dodged!' : `-${cr.damageTaken} HP`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {results.keenEyeLevel >= 3 && (
                                <div style={{fontSize: '0.8rem', color: '#e67e22', marginBottom: '12px'}}>
                                    ⦿ Keen Eye (L3): +3 DEX save bonus applied
                                </div>
                            )}
                            <button className="trap-dismiss-btn" onClick={() => this.dismissTrapPopup()}>
                                Continue
                            </button>
                            <div className="trap-shortcut-hint">
                                Press [Enter] to Continue
                            </div>
                        </div>
                    </div>
                );
            })()}
            {/* ── Imprint Tattoo Overlay ── */}
            {this.state.showTattooOverlay && (() => {
                const meta = getMeta() || {};
                const member = (meta.crew || []).find(m => m && m.id === this.state.tattooOverlayMemberId);
                if (!member) return null;
                const tattoos = member.tattoos || [];
                const knownDesigns = member.knownTattoos || ['fire_bird', 'silver_serpent', 'tribal_hand'];
                const tattooIndex = tattoos.length;
                const durationMs = TATTOO_IMPRINT_DURATIONS_MS[tattooIndex] || 0;
                const fmtDuration = (ms) => {
                    const totalMin = Math.floor(ms / 60000);
                    const days = Math.floor(totalMin / 1440);
                    const hrs  = Math.floor((totalMin % 1440) / 60);
                    const mins = totalMin % 60;
                    if (days > 0) return `${days}d ${hrs}h`;
                    if (hrs > 0)  return `${hrs}h ${mins}m`;
                    return `${mins} min`;
                };

                // Slot positions as percentages over the body image
                const SLOT_POSITIONS = [
                    { key: 'head',       top: '10%', left: '50%' },  // center of head
                    { key: 'torso',      top: '30%', left: '50%' },  // center of chest
                    { key: 'left_arm',   top: '36%', left: '26%' },  // mid upper-left arm
                    { key: 'right_arm',  top: '36%', left: '74%' },  // mid upper-right arm
                    { key: 'left_hand',  top: '55%', left: '32%' },  // left wrist/hand
                    { key: 'right_hand', top: '55%', left: '68%' },  // right wrist/hand
                    { key: 'left_leg',   top: '70%', left: '40%' },  // left mid-thigh
                    { key: 'right_leg',  top: '70%', left: '58%' },  // right mid-thigh
                ];

                const { tattooSelectedSlot, tattooSelectedDesign } = this.state;
                const canConfirm = !!tattooSelectedSlot && !!tattooSelectedDesign;

                return (
                    <div
                        className="tattoo-overlay"
                        onClick={(e) => { if (e.target === e.currentTarget) this.setState({ showTattooOverlay: false }); }}
                    >
                        <div className="tattoo-overlay-card">
                            {/* Header */}
                            <div className="tattoo-overlay-header">
                                <h2 className="tattoo-overlay-title">⚔ Imprint Tattoo</h2>
                                <div className="tattoo-overlay-sub">{member.name} &nbsp;·&nbsp; {tattoos.length} / 8 tattoos</div>
                                <button
                                    className="tattoo-close-btn"
                                    onClick={() => this.setState({ showTattooOverlay: false })}
                                    aria-label="Close"
                                >✕</button>
                            </div>

                            {/* Body */}
                            <div className="tattoo-overlay-body">
                                {/* Left — body silhouette with slots */}
                                <div className="tattoo-body-section">
                                    <div className="tattoo-body-label">Select a location</div>
                                    <div className="tattoo-body-container">
                                        <img
                                            src={images.body_male}
                                            alt="body silhouette"
                                            className="tattoo-body-img"
                                        />
                                        {SLOT_POSITIONS.map(({ key, top, left }) => {
                                            const existing = tattoos.find(t => t.slot === key);
                                            const inProgress = member.tattooImprinting?.slot === key;
                                            const isSelected = tattooSelectedSlot === key;
                                            const design = existing ? TATTOO_DESIGNS[existing.design] : null;
                                            return (
                                                <div
                                                    key={key}
                                                    className={`tattoo-slot${existing ? ' filled' : ''}${inProgress ? ' imprinting' : ''}${isSelected ? ' selected' : ''}`}
                                                    style={{
                                                        top, left,
                                                        backgroundColor: design ? design.color + 'aa' : undefined,
                                                    }}
                                                    title={TATTOO_SLOT_LABELS[key]}
                                                    onClick={() => {
                                                        if (existing || inProgress) return;
                                                        this.setState({ tattooSelectedSlot: isSelected ? null : key });
                                                    }}
                                                >
                                                    {existing ? '✓' : inProgress ? '⟳' : ''}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {/* Slot legend */}
                                    <div className="tattoo-slot-legend">
                                        {SLOT_POSITIONS.map(({ key }) => {
                                            const existing = tattoos.find(t => t.slot === key);
                                            const design = existing ? TATTOO_DESIGNS[existing.design] : null;
                                            return (
                                                <div key={key} className={`tattoo-legend-row${existing ? ' legend-filled' : ''}${tattooSelectedSlot === key ? ' legend-selected' : ''}`}>
                                                    <span className="tattoo-legend-dot" style={{ backgroundColor: design ? design.color : '#444' }} />
                                                    <span className="tattoo-legend-name">{TATTOO_SLOT_LABELS[key]}</span>
                                                    {existing && <span className="tattoo-legend-design">{TATTOO_DESIGNS[existing.design]?.name}</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right — design picker + confirm */}
                                <div className="tattoo-design-panel">
                                    <div className="tattoo-design-label">Choose a Design</div>
                                    <div className="tattoo-design-grid">
                                        {knownDesigns.map(designKey => {
                                            const def = TATTOO_DESIGNS[designKey];
                                            if (!def) return null;
                                            const isSelected = tattooSelectedDesign === designKey;
                                            const alreadyApplied = tattoos.some(t => t.design === designKey);
                                            return (
                                                <div
                                                    key={designKey}
                                                    className={`tattoo-design-card${isSelected ? ' selected' : ''}${alreadyApplied ? ' applied' : ''}`}
                                                    style={{ borderColor: isSelected ? def.color : undefined }}
                                                    onClick={() => {
                                                        if (alreadyApplied) return;
                                                        this.setState({ tattooSelectedDesign: isSelected ? null : designKey });
                                                    }}
                                                    title={alreadyApplied ? 'Already imprinted' : def.flavor}
                                                >
                                                    <div className="tattoo-design-icon" style={{ backgroundColor: def.color + '33' }}>
                                                        <img
                                                            src={images[def.iconKey] || images.avatar}
                                                            alt={def.name}
                                                        />
                                                    </div>
                                                    <div className="tattoo-design-info">
                                                        <div className="tattoo-design-name" style={{ color: def.color }}>{def.name}</div>
                                                        <div className="tattoo-design-desc">{def.desc}</div>
                                                        {alreadyApplied && <div className="tattoo-design-applied-badge">✓ Imprinted</div>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Confirm area */}
                                    <div className="tattoo-confirm-area">
                                        <div className="tattoo-selection-summary">
                                            {tattoos.length >= 8
                                                ? '⛔ All 8 tattoo slots are filled'
                                                : canConfirm
                                                    ? `${TATTOO_SLOT_LABELS[tattooSelectedSlot]} · ${TATTOO_DESIGNS[tattooSelectedDesign]?.name} · ~${fmtDuration(durationMs)}`
                                                    : tattooSelectedSlot
                                                        ? 'Now select a tattoo design →'
                                                        : tattooSelectedDesign
                                                            ? '← Select a body location'
                                                            : 'Select a location and a design'}
                                        </div>
                                        <button
                                            className={`tattoo-imprint-btn${canConfirm && tattoos.length < 8 ? '' : ' disabled'}`}
                                            disabled={!canConfirm || tattoos.length >= 8}
                                            onClick={() => this.handleImprintTattoo()}
                                        >
                                            Imprint {canConfirm ? `(~${fmtDuration(durationMs)})` : ''}
                                        </button>
                                        {tattoos.length < 8 && (
                                            <div className="tattoo-slots-remaining">{8 - tattoos.length} slot{8 - tattoos.length !== 1 ? 's' : ''} remaining</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
            {this.state.showNarrativeOverlay && this.state.activeNarrativeSequence && (
                <NarrativeOverlay
                    sequence={this.state.activeNarrativeSequence}
                    onClose={this.closeNarrativeOverlay}
                />
            )}

            {/* Codex Modal */}
            <CodexModal
                visible={!!this.state.showCodex}
                onClose={() => this.setState({ showCodex: false, codexEntry: null })}
                monsterManager={this.props.monsterManager}
                initialTab={this.state.codexEntry && this.state.codexEntry.tab}
                initialSearch={this.state.codexEntry && this.state.codexEntry.search}
                initialEntryId={this.state.codexEntry && this.state.codexEntry.entryId}
            />

            {/* No Codex Entry popup */}
            {this.state.noCodexEntry && (
                <div
                    className="trap-popup-overlay"
                    style={{ zIndex: 10001 }}
                    onClick={() => this.setState({ noCodexEntry: false })}
                >
                    <div className="trap-popup-card" style={{ width: 320, borderColor: 'rgba(140,140,160,0.6)' }}>
                        <div className="trap-title" style={{ color: '#aaa', fontSize: '1.4rem' }}>📖 No Entry Found</div>
                        <div className="trap-subtitle">There is no Codex entry for this tile yet.</div>
                        <button
                            className="trap-dismiss-btn"
                            style={{ background: 'linear-gradient(185deg,#444 0%,#222 100%)', borderColor: '#666' }}
                            onClick={() => this.setState({ noCodexEntry: false })}
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {/* Shrine Encounter Overlay */}
            {this.state.showShrineOverlay && this.state.shrineData && (() => {
                const sd = this.state.shrineData;
                const duration = sd.ritualDuration || 20;
                const timeLeft = sd.ritualTimeLeft || 0;
                const progress = sd.ritualComplete ? 1 : (duration - timeLeft) / duration;
                const circumference = 2 * Math.PI * 44; // r=44 in viewBox 100
                const strokeDashoffset = circumference * (1 - progress);
                const classLabel = sd.shrineClass ? sd.shrineClass.charAt(0).toUpperCase() + sd.shrineClass.slice(1) : 'Unknown';
                const memberName = sd.matchingMember ? sd.matchingMember.name : classLabel;

                // Global skills for this class (from proposed_new_features spec)
                const globalSkillsByClass = {
                    ranger:   [{ key: 'keen_eye', name: 'Keen Eye', desc: 'L1: Reveals +2 fog tiles. L2: Reveals nearby traps. L3: +3 DEX to trap saves.' }, { key: 'hunters_quarry', name: "Hunter's Quarry", desc: '+10% food drop on monster defeat' }, { key: 'read_the_land', name: 'Read the Land', desc: 'Adjacent tile types hinted on entry' }, { key: 'trailblaze', name: 'Trailblaze', desc: 'Visual breadcrumb to last camp spot' }, { key: 'scrounging_rat', name: 'Scrounging Rat', desc: 'Forage for food in camp: 15-30 food (3h) / 30-50 food (2h) / 50-80 food (1h).' }, { key: 'fastidious_crow', name: 'Fastidious Crow', desc: 'Scout a 10x10 board area for 24h. Process: 20m. Cooldown: 6h / 3h. Reward: 5-20g / 25-80g + 30% shard chance.' }],
                    sage:     [{ key: 'herbalism', name: 'Herbalism', desc: 'Camp costs 1 less food per member' }, { key: 'mend', name: 'Mend', desc: 'Out-of-combat potions restore +15% HP' }, { key: 'ritual_efficiency', name: 'Ritual Efficiency', desc: 'Ritual prep time -25%' }, { key: 'revive', name: 'Revive', desc: 'Once per run: fallen member revived at 25% HP' }, { key: 'awake_refreshed', name: 'Awake Refreshed', desc: 'Recuperates an additional +10/+20/+40 Resolve after camping.' }],
                    soldier:  [{ key: 'fortify', name: 'Fortify', desc: 'Resolve does not decay while camping' }, { key: 'breacher', name: 'Breacher', desc: 'Force open a Minor Key gate once per level' }, { key: 'rally', name: 'Rally', desc: '+5 bonus Resolve on combat victory' }, { key: 'iron_will', name: 'Iron Will', desc: 'Party Resolve never drops below 20 from deaths' }, { key: 'awake_refreshed', name: 'Awake Refreshed', desc: 'Recuperates an additional +10/+20/+40 Resolve after camping.' }, { key: 'strong_resolve', name: 'Strong Resolve', desc: 'Reduces Resolve penalties by 40%/75%/90%.' }],
                    wizard:   [{ key: 'arcane_sense', name: 'Arcane Sense', desc: 'Identifies chest tier before opening' }, { key: 'ley_tap', name: 'Ley Tap', desc: 'Draw energy at Magic Nexus — recover 15% endurance' }, { key: 'dimensional_pocket', name: 'Dimensional Pocket', desc: '+2 shared inventory slots' }, { key: 'scry', name: 'Scry', desc: 'Reveals all chests and monsters for 30s once per run' }],
                    barbarian:[{ key: 'iron_gut', name: 'Iron Gut', desc: 'Barbarian does not count toward camping food cost' }, { key: 'savage_haul', name: 'Savage Haul', desc: 'Grants +2/+4/+6 Strength and +10/+20/+30 Max HP' }, { key: 'bloodhound', name: 'Bloodhound', desc: 'Reveals all monsters on miniboard entry' }, { key: 'endure', name: 'Endure', desc: 'Zero-food camp: no Resolve penalty, crew heals to 50%' }],
                    monk:     [{ key: 'swift_step', name: 'Swift Step', desc: 'Movement animation 30% faster' }, { key: 'focused_rest', name: 'Focused Rest', desc: 'Camping duration -30% (same healing)' }, { key: 'pressure_points', name: 'Pressure Points', desc: '15% vendor discount once per vendor' }, { key: 'astral_map', name: 'Astral Map', desc: 'Full fog reveal for 60s once per run' }],
                    summoner: [{ key: 'spirit_sight', name: 'Spirit Sight', desc: 'Narrative tiles glow through fog' }, { key: 'plunder', name: 'Plunder', desc: 'Open a chest a second time once per run' }, { key: 'soul_tithe', name: 'Soul Tithe', desc: '+1 Shimmering Dust per combat victory' }, { key: 'dark_pact', name: 'Dark Pact', desc: 'Trade Shimmering Dust at vendors (1 Dust = 25g)' }],
                };
                const availableSkills = globalSkillsByClass[sd.shrineClass] || [];
                
                const getSkillLevel = (member, skillKey) => {
                    if (!member || !member.globalSkills) return 0;
                    const skill = member.globalSkills.find(s => (typeof s === 'string' ? s : s.key) === skillKey);
                    if (!skill) return 0;
                    return typeof skill === 'string' ? 1 : (skill.level || 1);
                };

                const unlockedSkills = availableSkills.filter(s => getSkillLevel(sd.matchingMember, s.key) < 3);
                const nextSkill = unlockedSkills[0] || null; // Next in tier order
                const nextSkillLevel = nextSkill ? getSkillLevel(sd.matchingMember, nextSkill.key) + 1 : 1;

                return (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(8,4,20,0.96)',
                        zIndex: 8000, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        fontFamily: "'Palatino Linotype', Palatino, serif",
                    }}>
                        {/* Animated ambient particles (CSS-based shimmer) */}
                        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                            {[...Array(12)].map((_, i) => (
                                <div key={i} style={{
                                    position: 'absolute',
                                    width: '2px', height: '2px',
                                    borderRadius: '50%',
                                    background: '#d4a844',
                                    opacity: 0.4,
                                    left: `${8 + i * 7.5}%`,
                                    top: `${20 + (i % 4) * 15}%`,
                                    animation: `float-up ${2 + (i % 3)}s ease-in-out ${i * 0.3}s infinite alternate`,
                                    boxShadow: '0 0 6px 2px rgba(212,168,68,0.5)',
                                }}/>
                            ))}
                        </div>

                        {/* Header */}
                        <div style={{ color: '#d4a844', fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '6px', opacity: 0.7 }}>
                            Ancestral Shrine
                        </div>
                        <div style={{ color: '#fff', fontSize: '20px', letterSpacing: '2px', marginBottom: '24px', textShadow: '0 0 20px rgba(212,168,68,0.6)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img src={images.shrine} alt="shrine" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                            <span>{classLabel} Communion</span>
                        </div>

                        {/* Ritual Timer Ring */}
                        {!sd.ritualComplete && (
                            <div style={{ position: 'relative', width: '140px', height: '140px', marginBottom: '24px' }}>
                                <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                    <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(212,168,68,0.15)" strokeWidth="6"/>
                                    <circle cx="50" cy="50" r="44" fill="none" stroke="#d4a844"
                                        strokeWidth="6" strokeLinecap="round"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        style={{ transition: 'stroke-dashoffset 0.9s linear', filter: 'drop-shadow(0 0 8px rgba(212,168,68,0.8))' }}
                                    />
                                </svg>
                                <div style={{
                                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#d4a844' }}>{timeLeft}</div>
                                    <div style={{ fontSize: '10px', letterSpacing: '2px', opacity: 0.6, textTransform: 'uppercase' }}>seconds</div>
                                </div>
                            </div>
                        )}

                        {/* Ritual in progress text */}
                        {!sd.ritualComplete && (
                            <div style={{ color: '#ccc', fontSize: '13px', textAlign: 'center', maxWidth: '280px', lineHeight: 1.6, marginBottom: '20px', fontStyle: 'italic' }}>
                                {memberName} kneels before the shrine, communing with the ancestors of the {classLabel} lineage…
                            </div>
                        )}

                        {/* Ritual complete — skill select */}
                        {sd.ritualComplete && (
                            <div style={{ textAlign: 'center', maxWidth: '360px', animation: 'fade-in 0.5s ease-out' }}>
                                <div style={{ color: '#d4a844', fontSize: '15px', letterSpacing: '2px', marginBottom: '8px' }}><span role="img" aria-label="sparkles">✨</span> The communion is complete</div>
                                <div style={{ color: '#ccc', fontSize: '13px', marginBottom: '20px', fontStyle: 'italic' }}>
                                    The ancestors grant {memberName} wisdom.
                                </div>
                                {nextSkill ? (
                                    <div
                                        onClick={() => this.confirmGlobalSkill(nextSkill.key)}
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(212,168,68,0.2), rgba(212,168,68,0.08))',
                                            border: '1px solid rgba(212,168,68,0.6)',
                                            borderRadius: '8px', padding: '16px 24px',
                                            cursor: 'pointer', marginBottom: '12px',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212,168,68,0.35), rgba(212,168,68,0.15))'; e.currentTarget.style.boxShadow = '0 0 20px rgba(212,168,68,0.3)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212,168,68,0.2), rgba(212,168,68,0.08))'; e.currentTarget.style.boxShadow = 'none'; }}
                                    >
                                        <div style={{ color: '#d4a844', fontSize: '16px', fontWeight: 'bold', marginBottom: '6px' }}>
                                            {nextSkill.name} {nextSkillLevel > 1 ? `(Upgrade to Lvl ${nextSkillLevel})` : ''}
                                        </div>
                                        <div style={{ color: '#aaa', fontSize: '12px', lineHeight: 1.5 }}>{nextSkill.desc}</div>
                                    </div>
                                ) : (
                                    <div style={{ color: '#888', fontSize: '13px', fontStyle: 'italic' }}>All global skills for {classLabel} have been unlocked.</div>
                                )}
                                <div
                                    onClick={() => this.closeShrineOverlay(false)}
                                    style={{ color: '#666', fontSize: '12px', cursor: 'pointer', marginTop: '10px', textDecoration: 'underline' }}
                                >
                                    {nextSkill ? 'Leave without claiming' : 'Depart'}
                                </div>
                            </div>
                        )}

                        {/* Cancel button during ritual */}
                        {!sd.ritualComplete && (
                            <div
                                onClick={() => this.closeShrineOverlay(true)}
                                style={{ color: '#555', fontSize: '12px', cursor: 'pointer', marginTop: '16px', textDecoration: 'underline' }}
                            >
                                Abandon ritual
                            </div>
                        )}
                    </div>
                );
            })()}
            <CModal className={this.state.modalType === 'PrepComplete' ? 'prep-complete-modal' : this.state.modalType === 'RitualComplete' ? 'ritual-complete-modal' : this.state.modalType === 'Magic' ? 'ritual-encounter-modal' : this.state.modalType === 'FoodComplete' ? 'food-complete-modal' : this.state.modalType === 'Merchant' ? 'merchant-modal' : this.state.modalType === 'Alchemist' ? 'alchemist-modal' : this.state.modalType === 'SharpenBladesDetails' ? 'sharpen-blades-details-modal' : ''} alignment="center" visible={this.state.showModal} onClose={() => this.onUpdateModalClosed()}>
                {this.state.modalType === 'Merchant' && (
                    <div className="merchant-modal-bg" style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundImage: `url(${images.merchant_bg?.default || images.merchant_bg})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 0.18,
                        zIndex: 0,
                        pointerEvents: 'none'
                    }} />
                )}
                {this.state.modalType === 'Alchemist' && (
                    <div className="alchemist-modal-bg" style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundImage: `url(${images.alchemist_bg?.default || images.alchemist_bg})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 0.18,
                        zIndex: 0,
                        pointerEvents: 'none'
                    }} />
                )}
                {(this.state.modalType === 'Merchant' || this.state.modalType === 'Alchemist') && (
                    <CModalHeader closeButton={false} style={{position: 'relative', zIndex: 2}}>
                        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', position:'relative', zIndex:2}}>
                            <CModalTitle>{this.state.modalType}</CModalTitle>
                            <button aria-label="Close vendor" className="camp-close" onClick={() => this.onUpdateModalClosed()} style={{background:'transparent', border:'none', color:'#fff', fontSize:20}}>✕</button>
                        </div>
                    </CModalHeader>
                )}
                <ModalInner
                    modalType={this.state.modalType}
                    updates={this.state.updates}
                    crew={this.props.crewManager.crew}
                    tileSize={this.state.tileSize}
                    handleMemberClickRitual={this.handleMemberClickRitual}
                    handleCrewTileHover={this.handleCrewTileHover}
                    setMemberRitualOptions={this.state.setMemberRitualOptions}
                    onLearnRitual={this.handleLearnRitual}
                    inventoryManager={this.props.inventoryManager}
                    saveUserData={this.props.saveUserData}
                    onForceUpdate={() => this.forceUpdate()}
                    onClose={() => this.onUpdateModalClosed()}
                />
            </CModal>
            {/* Teleport popup */}
            <CModal 
                className="teleport-modal" 
                alignment="center" 
                visible={this.state.showTeleportPopup} 
                onClose={() => this.setState({ showTeleportPopup: false, keysLocked: false })}
                backdrop={true}
            >
                <CModalHeader closeButton={false}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <CModalTitle><span role="img" aria-label="teleport">🌀</span> Teleportation Beacons</CModalTitle>
                        <button 
                            aria-label="Close teleport beacons"
                            className="camp-close" 
                            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} 
                            onClick={() => this.setState({ showTeleportPopup: false, keysLocked: false })}
                        >
                            ✕
                        </button>
                    </div>
                </CModalHeader>
                <CModalBody style={{ backgroundColor: '#141517', color: '#ffffff', padding: '20px' }}>
                    {(() => {
                        const meta = getMeta() || {};
                        const coords = meta.storedCoordinates || [];
                        if (coords.length === 0) {
                            return <div style={{ textAlign: 'center', opacity: 0.6, padding: '20px', fontSize: '14px' }}>No teleport coordinates stored. Right-click a tile in Mapmaker Board View to store coordinates first.</div>;
                        }
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                                {coords.map((c, idx) => (
                                    <div 
                                        key={c.id || idx}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '12px 16px',
                                            backgroundColor: '#1c1d21',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#25272d';
                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = '#1c1d21';
                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                        }}
                                        onClick={() => {
                                            this.setState({ showTeleportPopup: false, keysLocked: false });
                                            this.teleportCrew(c);
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                                            <span style={{ fontWeight: '600', fontSize: '14px', color: '#ffffff' }}>{c.dungeonName || 'Dungeon'}</span>
                                            <span style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '4px' }}>
                                                Level {c.levelId} ({c.orientation}) • Board {c.boardIndex} • Tile ({c.x}, {c.y})
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '18px', color: '#34d399' }}>➔</span>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </CModalBody>
            </CModal>
            {/* Quests popup */}
            <CModal className={`quests-modal${this.state.showCampPopup ? ' quests-above-camp' : ''}`} alignment="center" visible={this.state.showQuestsPopup} onClose={this.handleCloseQuestsPopup} backdrop={true} style={this.state.showCampPopup ? {zIndex: 1100} : undefined}>
                <CModalHeader closeButton={false}>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%'}}>
                        <CModalTitle>Quests</CModalTitle>
                        <button aria-label="Close quests" className="quests-close" onClick={this.handleCloseQuestsPopup} style={{background: 'transparent', border: 'none', color: '#fff', fontSize: 20}}>✕</button>
                    </div>
                </CModalHeader>
                <CModalBody>
                    {(() => {
                        const quests = (this.props.questManager && this.props.questManager.activeQuests) || [];
                        const completed = (this.props.questManager && this.props.questManager.completedQuests) || [];
                        const all = [...quests, ...completed];

                        const TYPE_LABELS = {
                            travel: 'Journey',
                            bounty: 'Bounty',
                            item_retrieval: 'Recovery',
                            lore: 'Lore',
                            communion: 'Communion',
                            inscription: 'Discovery',
                        };

                        if (!all.length) {
                            return (
                                <div style={{color: '#888', textAlign: 'center', padding: '48px 0', fontStyle: 'italic', fontSize: 14}}>
                                    <div style={{fontSize: 40, marginBottom: 16}}><span role="img" aria-label="scroll">📜</span></div>
                                    No active quests. Enter a dungeon to receive your mission.
                                </div>
                            );
                        }

                        return (
                            <div className="quests-list">
                                {all.map(quest => {
                                    const c = quest.color || { bg: '#1a2535', border: '#4a90d9', title: '#7eb8f7' };
                                    const showProgress = quest.progressTarget > 1;
                                    const pct = showProgress ? Math.round((quest.progress / quest.progressTarget) * 100) : 100;
                                    const isComplete = !!quest.completed;
                                    const typeLabel = TYPE_LABELS[quest.type] || quest.type;

                                    return (
                                        <div key={quest.id} className={`quest-item${isComplete ? ' quest-completed' : ''}`} style={{ '--quest-accent': c.border }}>
                                            {/* Icon badge */}
                                            <div className="quest-icon-badge">
                                                {isComplete ? '✅' : (quest.icon || '📋')}
                                            </div>

                                            {/* Content */}
                                            <div className="quest-body">
                                                {/* Type label + status */}
                                                <div className="quest-meta-row">
                                                    <span className="quest-tag">{typeLabel}</span>
                                                    {isComplete && <span className="quest-completed-badge">✓ COMPLETE</span>}
                                                </div>

                                                {/* Title */}
                                                <div className="quest-title">
                                                    {quest.title}
                                                </div>

                                                {/* Description */}
                                                <div className="quest-desc">
                                                    {quest.description}
                                                </div>

                                                {/* Progress bar */}
                                                {showProgress && (
                                                    <div className="quest-progress-section">
                                                        <div className="quest-progress-header">
                                                            <span className="label">Progress</span>
                                                            <span className="val">{quest.progress} / {quest.progressTarget}</span>
                                                        </div>
                                                        <div className="quest-progress-track">
                                                            <div className="quest-progress-bar" style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Hint — shown when not complete */}
                                                {!isComplete && quest.hint && (
                                                    <div className="quest-hint">
                                                        {quest.hint}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </CModalBody>
            </CModal>
            {/* Camp popup */}
            <CModal className={'camp-modal'} alignment="center" visible={this.state.showCampPopup} onClose={this.handleCloseCampPopup} backdrop={true}>
                {/* Background: camp icon at cover opacity 0.3 */}
                <div className="camp-modal-bg" style={{backgroundImage: `url(${images.camping?.default || images.camping})`}}></div>
                <CModalHeader closeButton={false}>
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', position:'relative', zIndex:2}}>
                        <CModalTitle>Camp</CModalTitle>
                        <button aria-label="Close camp" className="camp-close" onClick={this.handleCloseCampPopup} style={{background:'transparent', border:'none', color:'#fff', fontSize:20}}>✕</button>
                    </div>
                </CModalHeader>
                <CModalBody style={{position:'relative', zIndex:2}}>
                    {/* TOP: crew portrait row */}
                    <div className="camp-crew-row">
                        {crew.map((member, i) => (
                            <div key={i} className="camp-crew-tile">
                                <Tile
                                    id={i}
                                    tileSize={108}
                                    image={member.image || null}
                                    imageOverride={member.portrait || null}
                                    contains={member.type}
                                    data={member}
                                    color={member.color}
                                    editMode={false}
                                    type={'crew-tile'}
                                    handleClick={() => this.handleOpenSkillTree(member)}
                                    handleHover={() => {}}
                                />
                                <div className="camp-crew-name">{member.name}</div>
                            </div>
                        ))}
                    </div>

                    {/* MIDDLE: action buttons */}
                    <div className="camp-actions-section">
                        <button className="camp-action-btn" onClick={() => { this.handleCloseCampPopup(); this.setUpCamp(); }}>
                            <span className="camp-btn-icon"><span role="img" aria-label="campsite">🏕️</span></span>
                            <span>Recuperate</span>
                        </button>
                        <button className="camp-action-btn" onClick={this.handleOpenQuestsPopup}>
                            <span className="camp-btn-icon"><span role="img" aria-label="scroll">📜</span></span>
                            <span>Quests</span>
                        </button>
                        <button className="camp-action-btn" onClick={this.handleOpenFoodPrep}>
                            <span className="camp-btn-icon"><span role="img" aria-label="meat">🍖</span></span>
                            <span>Prepare Food</span>
                        </button>
                        <button className="camp-action-btn" onClick={this.handleOpenMapOverlay}>
                            <span className="camp-btn-icon"><span role="img" aria-label="map">🗺️</span></span>
                            <span>Map</span>
                        </button>
                        {this.getScroungingRatLevel() > 0 && (
                            <button
                                className="camp-action-btn"
                                onClick={this.handleScroungeForFood}
                                disabled={this.isScroungeActive()}
                            >
                                <span
                                    className="camp-btn-icon"
                                    style={{
                                        backgroundImage: `url(${images.scrounging_rat})`,
                                        backgroundSize: 'contain',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'center',
                                        display: 'inline-block',
                                        width: '20px',
                                        height: '20px',
                                        verticalAlign: 'middle'
                                    }}
                                />
                                <span>{this.getScroungeButtonLabel()}</span>
                            </button>
                        )}
                        <button className="camp-action-btn" onClick={this.handleOpenTraining}>
                            <span className="camp-btn-icon"><span role="img" aria-label="crossed swords">⚔️</span></span>
                            <span>Train</span>
                        </button>
                        {hasMagicUser && (
                            <button className="camp-action-btn" onClick={this.handleOpenSpells}>
                                <span className="camp-btn-icon"><span role="img" aria-label="sparkles">✨</span></span>
                                <span>Spells</span>
                            </button>
                        )}
                    </div>

                    {/* BOTTOM: trophies / card deck / shards tiles */}
                    <div className="camp-bottom-tiles">
                        <div className="camp-bottom-tile">
                            <div className="camp-bottom-tile-icon"><span role="img" aria-label="trophy">🏆</span></div>
                            <div className="camp-bottom-tile-label">Trophies</div>
                        </div>
                        <div className="camp-bottom-tile" style={{cursor:'pointer'}} onClick={() => this.setState({ showCardForge: true })}>
                            <div className="camp-bottom-tile-icon" style={{backgroundImage:`url(${images.pyre_echo_card || images.grimoire})`, backgroundSize:'contain', backgroundRepeat:'no-repeat', backgroundPosition:'center', width:54, height:54}}></div>
                            <div className="camp-bottom-tile-label">Pyre &amp; Echo</div>
                        </div>
                        <div className="camp-bottom-tile" style={{cursor:'pointer'}} onClick={() => this.setState({ showSiegeArmy: true })}>
                            <div className="camp-bottom-tile-icon" style={{backgroundImage:`url(${images.eclipse})`, backgroundSize:'contain', backgroundRepeat:'no-repeat', backgroundPosition:'center', width:54, height:54}}></div>
                            <div className="camp-bottom-tile-label">Siege Army</div>
                        </div>
                    </div>
                </CModalBody>

                {/* Food prep overlay — slides over the modal body */}
                {this.state.showFoodPrepOverlay && (() => {
                    const meta = getMeta() || {};
                    const currentFood = typeof meta.food === 'number' ? meta.food : 0;
                    const isCookingAnything = meta.campCooking && !meta.campCooking.notified;
                    return (
                        <div className="food-prep-overlay">
                            <div className="food-prep-header">
                                <button className="food-prep-back" onClick={this.handleFoodPrepBack}>← Back</button>
                                <div className="food-prep-title"><span role="img" aria-label="meat">🍖</span> Prepare Food</div>
                                <div className="food-prep-supply">Supply: {currentFood} / {this.getFoodLimit()} <span role="img" aria-label="meat">🍖</span></div>
                            </div>
                            <div className="recipe-cards">
                                {Object.values(RECIPES).map((recipe, i) => {
                                    const canAfford = currentFood >= recipe.foodCost;
                                    const isCookingThis = isCookingAnything && meta.campCooking.recipeKey === recipe.key;
                                    const cookTimeLabel = recipe.cookTime >= 3600000
                                        ? `${recipe.cookTime / 3600000}h`
                                        : `${recipe.cookTime / 60000}m`;
                                    return (
                                        <div key={i} className={`recipe-card${!canAfford ? ' unaffordable' : ''}${isCookingThis ? ' cooking' : ''}`}>
                                            <div className="recipe-card-icon">{recipe.icon}</div>
                                            <div className="recipe-card-name">{recipe.name}</div>
                                            <div className="recipe-card-description">{recipe.description}</div>
                                            <div className="recipe-card-meta">
                                                <span className="recipe-cost"><span role="img" aria-label="meat">🍖</span> -{recipe.foodCost}</span>
                                                <span className="recipe-arrow">→</span>
                                                <span className="recipe-yield">+{recipe.foodYield}</span>
                                            </div>
                                            <div className="recipe-card-duration"><span role="img" aria-label="timer">⏱</span> {cookTimeLabel}</div>
                                            {isCookingThis ? (
                                                <div className="recipe-card-btn cooking-badge" style={{ position: 'relative', overflow: 'hidden' }}>
                                                    Cooking…
                                                    {(() => {
                                                        const placeholderId = `po-camp-cooking-${recipe.key}`;
                                                        const start = meta.campCooking ? meta.campCooking.startDate : '';
                                                        const end = meta.campCooking ? meta.campCooking.endDate : '';
                                                        return (
                                                            <div
                                                                id={placeholderId}
                                                                ref={el => this.placeholderRef(el, placeholderId, start, end)}
                                                                className="progress-overlay progress-overlay-placeholder"
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: 0,
                                                                    left: 0,
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    pointerEvents: 'none',
                                                                    opacity: 0
                                                                }}
                                                            ></div>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <div
                                                    className={`recipe-card-btn${canAfford && !isCookingAnything ? ' start-btn' : ' disabled'}`}
                                                    onClick={() => canAfford && !isCookingAnything && this.handleStartRecipe(recipe)}
                                                >
                                                    {isCookingAnything ? 'Busy' : canAfford ? 'Cook' : 'Not enough food'}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                {this.state.showTrainingOverlay && (() => {
                    const meta = getMeta() || {};
                    const currentFood = typeof meta.food === 'number' ? meta.food : 0;
                    const DRILLS = [
                        { stat: 'str', label: 'Conditioning', emoji: '💪', color: '#c94040', desc: 'Build raw strength through rigorous physical endurance.', safeDesc: '+1 STR progress', riskDesc: '+2 progress — exhausted next combat' },
                        { stat: 'dex', label: 'Footwork',     emoji: '🦶', color: '#d48a30', desc: 'Sprint drills and evasion practice sharpen reflexes.', safeDesc: '+1 DEX progress', riskDesc: '+2 progress — 25% chance: 50% endurance next fight' },
                        { stat: 'fort', label: 'Hardening',   emoji: '🛡',  color: '#4a86c8', desc: 'Toughening the body through punishment and resistance.', safeDesc: '+1 FORT progress', riskDesc: '+2 progress — bleed risk next combat' },
                        { stat: 'int', label: 'Meditation',   emoji: '🧘', color: '#9b64c9', desc: 'Deep focus and mental discipline unlock hidden insight.', safeDesc: '+1 INT progress', riskDesc: '75% chance +2, 25% chance +0' },
                    ];
                    const STAT_COLORS = { str: '#c94040', dex: '#d48a30', fort: '#4a86c8', int: '#9b64c9' };
                    const STAT_LABELS = { str: 'STR', dex: 'DEX', fort: 'FORT', int: 'INT' };
                    const THRESHOLD = 10;

                    return (
                        <div className="training-overlay">
                            <div className="training-header">
                                <button className="training-back" onClick={this.handleTrainingBack}>← Back</button>
                                <div className="training-title"><span role="img" aria-label="crossed swords">⚔️</span> Training Grounds</div>
                                <div className="training-food-badge"><span role="img" aria-label="food">🍖</span> {currentFood} food &nbsp;·&nbsp; <span style={{color: '#aaa'}}>Drill cost: 1 + current progress (1-10 food)</span></div>
                            </div>

                            <div className="training-subtitle">Choose a drill for each crew member. Drills consume food and build toward permanent stat gains.</div>

                            <div className="training-crew-cards">
                                {crew.map((member) => {
                                    // canAfford is now calculated per drill in TrainingDrillPicker
                                    const progress = member.trainingProgress || { str: 0, dex: 0, fort: 0, int: 0 };
                                    const memberId = member.id || member.name;
                                    const result = (this.state.trainingResults || {})[memberId];
                                    
                                    const COOLDOWN_MS = 24 * 60 * 60 * 1000;
                                    const lastTrainedTime = member.lastTrained ? new Date(member.lastTrained).getTime() : 0;
                                    const remainingMs = Math.max(0, COOLDOWN_MS - (Date.now() - lastTrainedTime));
                                    const hasCooldown = remainingMs > 0;
                                    
                                    const alreadyTrained = !!result || hasCooldown || !!member.trainingActive;
                                    // canAfford is now calculated inside TrainingDrillPicker

                                    return (
                                        <div key={memberId} className={`training-crew-card${alreadyTrained ? ' trained' : ''}`} style={{ position: 'relative', overflow: 'hidden' }}>
                                            {member.trainingActive && (() => {
                                                const start = member.trainingActive.startDate;
                                                const end = member.trainingActive.endDate;
                                                const placeholderId = `train-progress-${memberId}`;
                                                return (
                                                    <div
                                                        id={placeholderId}
                                                        ref={el => this.placeholderRef(el, placeholderId, start, end)}
                                                        className="progress-overlay camp-anim"
                                                        data-start={start}
                                                        data-end={end}
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            pointerEvents: 'none',
                                                            zIndex: 10,
                                                            backgroundColor: 'rgba(249, 177, 21, 0.15)',
                                                            borderRadius: 8
                                                        }}
                                                    ></div>
                                                );
                                            })()}
                                            {/* Portrait + Name */}
                                            <div className="training-card-portrait-row">
                                                <div className="training-card-portrait">
                                                    <img
                                                        src={typeof member.portrait === 'string' ? member.portrait : (member.portrait?.default || '')}
                                                        alt={member.name}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }}
                                                        onError={e => { e.target.style.display = 'none'; }}
                                                    />
                                                </div>
                                                <div className="training-card-identity">
                                                    <div className="training-card-name">{member.name}</div>
                                                    <div className="training-card-class">{(member.type || '').toUpperCase()}</div>
                                                </div>
                                            </div>

                                            {/* Stat progress bars */}
                                            <div className="training-stat-bars">
                                                {['str','dex','fort','int'].map(stat => {
                                                    const pct = Math.min(100, ((progress[stat] || 0) / THRESHOLD) * 100);
                                                    const justGained = result && result.stat === stat && result.statGained;
                                                    return (
                                                        <div key={stat} className="training-stat-row">
                                                            <div className="training-stat-label" style={{ color: STAT_COLORS[stat] }}>{STAT_LABELS[stat]}</div>
                                                            <div className="training-stat-track">
                                                                <div
                                                                    className={`training-stat-fill${justGained ? ' just-gained' : ''}`}
                                                                    style={{ width: `${pct}%`, background: STAT_COLORS[stat] }}
                                                                />
                                                            </div>
                                                            <div className="training-stat-val" style={{ color: STAT_COLORS[stat] }}>
                                                                {progress[stat] || 0}<span style={{opacity:0.4}}>/{THRESHOLD}</span>
                                                            </div>
                                                            <div className="training-stat-base" style={{ color: '#666' }}>
                                                                [{member.stats?.[stat] || 0}]
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Result / Cooldown status */}
                                            {result ? (
                                                <div className={`training-result-toast${result.statGained ? ' gained' : result.delta === 0 ? ' failed' : ''}`}>
                                                    {result.message}
                                                </div>
                                            ) : member.trainingActive ? (
                                                <div className="training-result-toast" style={{ background: 'rgba(249, 177, 21, 0.12)', color: '#f9b115', border: '1px solid rgba(249, 177, 21, 0.25)' }}>
                                                    <span role="img" aria-label="crossed-swords">⚔️</span> Training {member.trainingActive.stat.toUpperCase()}… {(() => {
                                                        const remainingMs = Math.max(0, new Date(member.trainingActive.endDate).getTime() - Date.now());
                                                        const hours = Math.floor(remainingMs / 3600000);
                                                        const minutes = Math.floor((remainingMs % 3600000) / 60000);
                                                        const seconds = Math.floor((remainingMs % 60000) / 1000);
                                                        if (hours > 0) return `${hours}h ${minutes}m`;
                                                        if (minutes > 0) return `${minutes}m ${seconds}s`;
                                                        return `${seconds}s`;
                                                    })()}
                                                </div>
                                            ) : hasCooldown ? (
                                                <div className="training-result-toast" style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#aaa', border: '1px dashed #444', animation: 'none' }}>
                                                    <span role="img" aria-label="hourglass">⏳</span> Cooldown: {(() => {
                                                        const hours = Math.floor(remainingMs / 3600000);
                                                        const minutes = Math.floor((remainingMs % 3600000) / 60000);
                                                        return `${hours}h ${minutes}m remaining`;
                                                    })()}
                                                </div>
                                            ) : null}

                                            {/* Drill selector (hidden if already trained or on cooldown) */}
                                            {!alreadyTrained && (
                                                <TrainingDrillPicker
                                                    member={member}
                                                    drills={DRILLS}
                                                    currentFood={currentFood}
                                                    onConfirm={(stat, risk) => this.handleConfirmDrill(member, stat, risk)}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                {this.state.showSpellsOverlay && (() => {
                    const normalizeImgUrl = (value) => {
                        if (!value) return '';
                        const resolved = typeof value === 'string' ? value : (value.default || '');
                        if (!resolved) return '';
                        return `url("${encodeURI(resolved)}")`;
                    };

                    return (
                        <div className="spells-overlay">
                            <div className="spells-overlay-header">
                                <button className="spells-overlay-back" onClick={this.handleSpellsBack}>← Back</button>
                                <div className="spells-overlay-title"><span role="img" aria-label="sparkles">✨</span> Dungeon Spells</div>
                                <div className="spells-overlay-subtitle">Combat spells are excluded here. Rituals and prep magic only.</div>
                            </div>

                            <div className="spells-user-list">
                                {magicUsers.map((member) => {
                                    const knownRitualKeys = member.knownRituals || [];
                                    const preparedRituals = (member.specialActions || [])
                                        .filter(action => action && action.type === 'ritual' && action.available)
                                        .map(action => action.ritualKey || action.subtype);
                                    const inProgressRituals = (member.specialActions || [])
                                        .filter(action => action && action.type === 'ritual' && !action.available)
                                        .map(action => action.ritualKey || action.subtype);

                                    return (
                                        <div key={member.id || member.name} className="spells-user-block">
                                            <div className="spells-user-portrait-wrap">
                                                <Tile
                                                    id={member.id || member.name}
                                                    tileSize={108}
                                                    image={member.image || null}
                                                    imageOverride={member.portrait || null}
                                                    contains={member.type}
                                                    data={member}
                                                    color={member.color}
                                                    editMode={false}
                                                    type={'crew-tile'}
                                                    handleClick={() => {}}
                                                    handleHover={() => {}}
                                                />
                                                <div className="spells-user-name">{member.name}</div>
                                                <div className="spells-user-class">{member.type}</div>
                                            </div>

                                            <div className="spells-tiles-grid">
                                                {knownRitualKeys.length === 0 && (
                                                    <div className="spells-empty">No dungeon spells learned yet.</div>
                                                )}

                                                {Object.values(RITUALS)
                                                    .filter(ritual => knownRitualKeys.includes(ritual.key))
                                                    .map((ritual) => {
                                                        const isReady = preparedRituals.includes(ritual.key);
                                                        const isPreparing = inProgressRituals.includes(ritual.key);
                                                        const isActive = member.unlockSpellActive && ritual.key === 'unlock';
                                                        const iconUrl = images[ritual.icon];

                                                        return (
                                                            <div key={`${member.id || member.name}-${ritual.key}`} className={`spell-tile ${isReady ? 'ready' : ''} ${isPreparing ? 'preparing' : ''}`} style={isActive ? { borderColor: 'rgba(0, 188, 212, 0.8)', boxShadow: 'inset 0 0 0 1px rgba(0, 188, 212, 0.25)' } : {}}>
                                                                <div
                                                                    className="spell-tile-icon"
                                                                    style={{ backgroundImage: normalizeImgUrl(iconUrl) }}
                                                                ></div>
                                                                <div className="spell-tile-name">{ritual.name}</div>
                                                                <div className="spell-tile-description">{ritual.description}</div>
                                                                <div className="spell-tile-status" style={isActive ? { color: '#00bcd4' } : {}}>
                                                                    {isActive ? 'Active' : (isReady ? 'Ready' : isPreparing ? 'Preparing' : 'Known')}
                                                                </div>
                                                                {ritual.key === 'unlock' && (
                                                                    <div className="spell-tile-actions" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                        {!isReady && !isPreparing && !isActive && (
                                                                            <button 
                                                                                className="spell-action-btn"
                                                                                style={{
                                                                                    background: 'rgba(247, 206, 104, 0.2)',
                                                                                    border: '1px solid rgba(247, 206, 104, 0.5)',
                                                                                    color: '#f7ce68',
                                                                                    padding: '4px 8px',
                                                                                    borderRadius: '4px',
                                                                                    fontSize: '10px',
                                                                                    fontWeight: 'bold',
                                                                                    cursor: 'pointer'
                                                                                }}
                                                                                onClick={() => this.handleSpellAction(member, ritual, 'prepare')}
                                                                            >
                                                                                Prepare
                                                                            </button>
                                                                        )}
                                                                        {isReady && !isActive && (
                                                                            <button 
                                                                                className="spell-action-btn"
                                                                                style={{
                                                                                    background: 'rgba(121, 216, 146, 0.2)',
                                                                                    border: '1px solid rgba(121, 216, 146, 0.5)',
                                                                                    color: '#79d892',
                                                                                    padding: '4px 8px',
                                                                                    borderRadius: '4px',
                                                                                    fontSize: '10px',
                                                                                    fontWeight: 'bold',
                                                                                    cursor: 'pointer'
                                                                                }}
                                                                                onClick={() => this.handleSpellAction(member, ritual, 'cast')}
                                                                            >
                                                                                Cast
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                {this.state.showMapOverlay && (() => {
                    // ── Shared data prep (used by both original and Redux map) ──────
                    const tracker = this.state.levelTracker || [];
                    const trackerIds = tracker.map((entry) => Number(entry.id)).filter((id) => !Number.isNaN(id));
                    const dungeonIds = ((this.props.boardManager && this.props.boardManager.dungeon && this.props.boardManager.dungeon.levels) || [])
                        .map((level) => Number(level.id))
                        .filter((id) => !Number.isNaN(id));
                    const sourceLevelIds = trackerIds.length ? trackerIds : dungeonIds;
                    const levelIds = Array.from(new Set(sourceLevelIds)).sort((a, b) => b - a);
                    const activeLevel = tracker.find((entry) => entry && entry.active);
                    const currentLevelId = activeLevel ? Number(activeLevel.id) : Number((getMeta() || {}).location?.levelId || 0);
                    const selectedLevelId = this.state.mapSelectedLevelId === null || typeof this.state.mapSelectedLevelId === 'undefined'
                        ? currentLevelId
                        : Number(this.state.mapSelectedLevelId);
                    const activeMinimapIndex = Array.isArray(this.state.minimap) ? this.state.minimap.findIndex((entry) => entry && entry.active) : -1;

                    // ── FLAGS.mapRedux — render new Navigator's Chart design ─────
                    if (FLAGS.mapRedux) {
                        const boardHighlightImage = this.getMapBoardHighlightSvg(activeMinimapIndex);
                        const normalizeMapImgUrl = (value) => {
                            if (!value) return '';
                            const resolved = typeof value === 'string' ? value : (value.default || '');
                            if (!resolved) return '';
                            return `url("${encodeURI(resolved)}")`;  
                        };
                        const zoomedLevelId = this.state.mapZoomedLevelId;
                        const hasZoomedLevel = zoomedLevelId !== null && typeof zoomedLevelId !== 'undefined';
                        const canEnterZone = hasZoomedLevel && activeMinimapIndex >= 0;
                        const toBoardDetailPercent = (coordVal) => {
                            const raw = (((coordVal - 15) + 0.5) / 14) * 100;
                            return Math.max(0, Math.min(100, raw));
                        };

                        // board detail data (same logic as original)
                        const boardDetailDiscoveryDots = (() => {
                            try {
                                const bm = this.props.boardManager;
                                const currentOrientation = (bm && bm.currentOrientation) || 'A';
                                const dots = [];
                                this._breadcrumbs.forEach((val) => {
                                    if (!val) return;
                                    if (val.boardIndex !== activeMinimapIndex) return;
                                    if (val.levelId !== currentLevelId) return;
                                    if (val.orientation !== currentOrientation) return;
                                    const xPct = toBoardDetailPercent(val.col);
                                    const yPct = toBoardDetailPercent(val.row);
                                    dots.push({ key: `bc_${val.seq}_${val.row}_${val.col}`, left: `${xPct.toFixed(2)}%`, top: `${yPct.toFixed(2)}%`, xPct, yPct, row: val.row, col: val.col, seq: Number(val.seq) || 0 });
                                });
                                dots.sort((a, b) => a.seq - b.seq);
                                return dots;
                            } catch (e) { return []; }
                        })();

                        const boardDetailPathSegments = (() => {
                            if (!Array.isArray(boardDetailDiscoveryDots) || boardDetailDiscoveryDots.length < 2) return [];
                            const segments = [];
                            let seg = [boardDetailDiscoveryDots[0]];
                            for (let idx = 1; idx < boardDetailDiscoveryDots.length; idx++) {
                                const prev = boardDetailDiscoveryDots[idx - 1];
                                const cur  = boardDetailDiscoveryDots[idx];
                                const manhattan = Math.abs(cur.row - prev.row) + Math.abs(cur.col - prev.col);
                                if (manhattan === 1) { seg.push(cur); } else { if (seg.length > 1) segments.push(seg); seg = [cur]; }
                            }
                            if (seg.length > 1) segments.push(seg);
                            return segments.map(s => s.map(d => `${d.xPct.toFixed(2)},${d.yPct.toFixed(2)}`).join(' '));
                        })();

                        const boardDetailPlayerTile = (() => {
                            try {
                                const bm = this.props.boardManager;
                                if (!bm || !bm.playerTile || !Array.isArray(bm.playerTile.location)) return null;
                                let playerBoardIndex = bm.playerTile.boardIndex;
                                if ((playerBoardIndex === null || playerBoardIndex === undefined) && typeof bm.getBoardIndexFromBoard === 'function' && bm.currentBoard) {
                                    playerBoardIndex = bm.getBoardIndexFromBoard(bm.currentBoard);
                                }
                                if (typeof playerBoardIndex !== 'number' || playerBoardIndex !== activeMinimapIndex) return null;
                                const loc = bm.playerTile.location;
                                return { left: `${toBoardDetailPercent(loc[1]).toFixed(2)}%`, top: `${toBoardDetailPercent(loc[0]).toFixed(2)}%` };
                            } catch (e) { return null; }
                        })();

                        const boardDetailEnemyTiles = (() => {
                            try {
                                const bm = this.props.boardManager;
                                if (!bm || typeof bm.getCoordinatesFromIndex !== 'function') return [];
                                if (activeMinimapIndex < 0 || !Array.isArray(this.state.minimapIndicators)) return [];
                                const group = this.state.minimapIndicators[activeMinimapIndex] || {};
                                const orientation = (bm && bm.currentOrientation) || 'A';
                                const byTileId = new Map();
                                (Array.isArray(group.enemies) ? group.enemies : []).forEach((marker) => { if (marker && typeof marker.tileId === 'number') byTileId.set(marker.tileId, marker); });
                                this.getMonsterSightingsForBoard(currentLevelId, orientation, activeMinimapIndex).forEach((marker) => { if (marker && typeof marker.tileId === 'number' && !byTileId.has(marker.tileId)) byTileId.set(marker.tileId, marker); });
                                return Array.from(byTileId.values()).map((marker) => {
                                    const coords = bm.getCoordinatesFromIndex(marker.tileId);
                                    if (!Array.isArray(coords) || coords.length < 2) return null;
                                    return { key: `enemy_tile_${marker.tileId}`, left: `${toBoardDetailPercent(coords[1]).toFixed(2)}%`, top: `${toBoardDetailPercent(coords[0]).toFixed(2)}%` };
                                }).filter(Boolean);
                            } catch (e) { return []; }
                        })();

                        const boardDetailMarkers2D = (() => {
                            try {
                                const bm = this.props.boardManager;
                                if (!bm || typeof bm.getCoordinatesFromIndex !== 'function') return [];
                                if (activeMinimapIndex < 0 || !Array.isArray(this.state.minimapIndicators)) return [];
                                const group = this.state.minimapIndicators[activeMinimapIndex] || {};
                                const markers = [];
                                const pushMarker = (marker, defaultType) => {
                                    if (!marker || typeof marker.tileId !== 'number') return;
                                    const coords = bm.getCoordinatesFromIndex(marker.tileId);
                                    if (!Array.isArray(coords) || coords.length < 2) return;
                                    const markerType = (marker.type || defaultType || 'location').toLowerCase();
                                    const iconKey = markerType === 'alchemist' ? 'alchemist' : (markerType === 'merchant' ? 'merchant' : null);
                                    markers.push({ key: `${markerType}_${marker.tileId}`, left: `${toBoardDetailPercent(coords[1]).toFixed(2)}%`, top: `${toBoardDetailPercent(coords[0]).toFixed(2)}%`, icon: iconKey ? normalizeMapImgUrl(images[iconKey]) : '', markerType });
                                };
                                (Array.isArray(group.merchant) ? group.merchant : []).forEach(m => pushMarker(m, 'merchant'));
                                (Array.isArray(group.stairs) ? group.stairs : []).forEach(m => pushMarker(m, 'stairs'));
                                (Array.isArray(group.gates) ? group.gates : []).forEach(m => pushMarker(m, 'gate'));
                                return markers;
                            } catch (e) { return []; }
                        })();

                        const playerSlabDot = null; // not needed in flat grid view
                        const slabVendorMarkers = [];

                        return (
                            <MapRedux
                                levelIds={levelIds}
                                currentLevelId={currentLevelId}
                                selectedLevelId={selectedLevelId}
                                zoomedLevelId={zoomedLevelId}
                                activeMinimapIndex={activeMinimapIndex}
                                boardCells={[]}
                                boardHighlightImage={boardHighlightImage}
                                playerSlabDot={playerSlabDot}
                                boardDetailPlayerTile={boardDetailPlayerTile}
                                boardDetailDiscoveryDots={boardDetailDiscoveryDots}
                                boardDetailPathSegments={boardDetailPathSegments}
                                boardDetailEnemyTiles={boardDetailEnemyTiles}
                                boardDetailMarkers2D={boardDetailMarkers2D}
                                slabVendorMarkers={slabVendorMarkers}
                                minimapIndicators={this.state.minimapIndicators || []}
                                orientation={this.props.boardManager?.currentOrientation || 'F'}
                                meta={getMeta() || {}}
                                breadcrumbs={this._breadcrumbs}
                                canEnterZone={canEnterZone}
                                onBack={this.handleMapOverlayBack}
                                onClose={() => this.setState({ showMapOverlay: false, mapZoomedLevelId: null, mapSelectedLevelId: null, mapBoardDetailStage: null, mapBoardDetailBoardIndex: null })}
                                onLevelSelect={this.handleMapLevelSelect}
                                onZoomIn={(lvlId) => this.handleMapZoomInStart(lvlId, levelIds.length, levelIds.findIndex(id => id === lvlId))}
                                onZoomOut={this.handleMapZoomClose}
                                onNodeClick={(boardIndex) => this.handleMapCurrentBoardLayerOpen(boardIndex)}
                                onOrientationChange={(o) => { if (this.props.boardManager) { this.props.boardManager.currentOrientation = o; this.forceUpdate(); } }}
                                onSendScoutCrow={this.handleSendScoutCrow}
                                getFastidiousCrowLevel={this.getFastidiousCrowLevel}
                                breadcrumbNavigate={this.handleMapBreadcrumbNavigate}
                            />
                        );
                    }

                    // ── FLAGS.mapRedux === false: original code follows ───────────
                    const boardHighlightImage = this.getMapBoardHighlightSvg(activeMinimapIndex);

                    const normalizeMapImgUrl = (value) => {
                        if (!value) return '';
                        const resolved = typeof value === 'string' ? value : (value.default || '');
                        if (!resolved) return '';
                        return `url("${encodeURI(resolved)}")`;
                    };
                    const projectedIndexByMinimapIndex = [6, 3, 0, 7, 4, 1, 8, 5, 2];
                    const pointForUv = (u, v) => {
                        const x = 50 + (50 * (u - v));
                        const y = 50 * (u + v);
                        return { x, y };
                    };
                    const boardCells = Array.from({ length: 9 }, (_, boardIndex) => {
                        const projectedIndex = projectedIndexByMinimapIndex[boardIndex];
                        const row = Math.floor(projectedIndex / 3);
                        const col = projectedIndex % 3;
                        const a0 = col / 3;
                        const a1 = (col + 1) / 3;
                        const b0 = row / 3;
                        const b1 = (row + 1) / 3;
                        const pts = [
                            pointForUv(a0, b0),
                            pointForUv(a1, b0),
                            pointForUv(a1, b1),
                            pointForUv(a0, b1),
                        ];
                        const points = pts.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' ');
                        const center = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
                        return {
                            boardIndex,
                            points,
                            center: {
                                x: center.x / pts.length,
                                y: center.y / pts.length
                            }
                        };
                    });
                    const playerSlabDot = (() => {
                        try {
                            const bm = this.props.boardManager;
                            if (!bm || !bm.playerTile || !bm.playerTile.location) return null;
                            if (activeMinimapIndex < 0 || activeMinimapIndex > 8) return null;
                            // Determine which 1/3 cell of the diamond this board occupies.
                            const projectedIndex = projectedIndexByMinimapIndex[activeMinimapIndex];
                            const cellRow = Math.floor(projectedIndex / 3);
                            const cellCol = projectedIndex % 3;
                            const a0 = cellCol / 3;       // u start
                            const a1 = (cellCol + 1) / 3; // u end
                            const b0 = cellRow / 3;       // v start
                            const b1 = (cellRow + 1) / 3; // v end
                            // Match minimap convention exactly:
                            // minimap left  = (loc[1]-15)/14  → col → this is isometric U axis
                            // minimap top   = (loc[0]-15)/14  → row → this is isometric V axis
                            const loc = bm.playerTile.location;
                            const pu = (loc[1] - 15) / 14; // col normalized 0→1 (left-right across diamond)
                            const pv = (loc[0] - 15) / 14; // row normalized 0→1 (top-bottom down diamond)
                            // Map player position into the cell's portion of the diamond
                            const u = a0 + pu * (a1 - a0);
                            const v = b0 + pv * (b1 - b0);
                            // Isometric projection: diamond viewBox 0-100 x 0-100
                            // x increases right as col increases, left as row increases
                            // y increases down as both col and row increase
                            const xPct = (50 + 50 * (u - v)).toFixed(2);
                            const yPct = (50 * (u + v)).toFixed(2);
                            return {
                                left: `${xPct}%`,
                                top: `${yPct}%`
                            };
                        } catch (e) { return null; }
                    })();
                    const slabVendorMarkers = (() => {
                        try {
                            const bm = this.props.boardManager;
                            const indicatorGroups = Array.isArray(this.state.minimapIndicators) ? this.state.minimapIndicators : [];
                            if (!bm || typeof bm.getCoordinatesFromIndex !== 'function' || !indicatorGroups.length) return [];

                            const markers = [];

                            indicatorGroups.forEach((group, boardIndex) => {
                                const projectedIndex = projectedIndexByMinimapIndex[boardIndex];
                                if (typeof projectedIndex !== 'number') return;

                                const cellRow = Math.floor(projectedIndex / 3);
                                const cellCol = projectedIndex % 3;
                                const a0 = cellCol / 3;
                                const a1 = (cellCol + 1) / 3;
                                const b0 = cellRow / 3;
                                const b1 = (cellRow + 1) / 3;
                                const vendors = Array.isArray(group?.merchant) ? group.merchant : [];

                                vendors.forEach((indicator, vendorIndex) => {
                                    if (!indicator || typeof indicator.tileId !== 'number') return;
                                    const coords = bm.getCoordinatesFromIndex(indicator.tileId);
                                    if (!Array.isArray(coords) || coords.length < 2) return;

                                    const pu = (coords[1] - 15) / 14;
                                    const pv = (coords[0] - 15) / 14;
                                    const u = a0 + pu * (a1 - a0);
                                    const v = b0 + pv * (b1 - b0);
                                    const xPct = 50 + 50 * (u - v);
                                    const yPct = 50 * (u + v);

                                    const markerType = (indicator.type || 'merchant').toLowerCase();
                                    const markerIconKey = markerType === 'alchemist' ? 'alchemist' : 'merchant';

                                    markers.push({
                                        key: `${indicator.vendorGroupId || `${boardIndex}_${indicator.tileId}`}_${vendorIndex}`,
                                        left: `${xPct.toFixed(2)}%`,
                                        top: `${yPct.toFixed(2)}%`,
                                        icon: normalizeMapImgUrl(images[markerIconKey]),
                                        markerType,
                                    });
                                });
                            });

                            return markers;
                        } catch (e) {
                            return [];
                        }
                    })();
                    const zoomedLevelId = this.state.mapZoomedLevelId;
                    const unzoomingLevelId = this.state.mapUnzoomingLevelId;
                    const revealAfterUnzoom = !!this.state.mapRevealAfterUnzoom;
                    const pendingZoomLevelId = this.state.mapPendingZoomLevelId;
                    const mapBoardDetailStage = this.state.mapBoardDetailStage;
                    const mapBoardDetailBoardIndex = this.state.mapBoardDetailBoardIndex;
                    const hasZoomedLevel = zoomedLevelId !== null && typeof zoomedLevelId !== 'undefined';
                    const hasUnzoomingLevel = unzoomingLevelId !== null && typeof unzoomingLevelId !== 'undefined';
                    const hasPendingZoomLevel = pendingZoomLevelId !== null && typeof pendingZoomLevelId !== 'undefined';
                    const currentMapZoomLevel = mapBoardDetailStage === 'detail' ? 'zone' : (hasZoomedLevel ? 'plane' : 'dungeon');
                    const selectedLevelIndex = levelIds.findIndex((id) => id === selectedLevelId);
                    const effectiveSelectedIndex = selectedLevelIndex >= 0 ? selectedLevelIndex : 0;
                    const canEnterZone = hasZoomedLevel && activeMinimapIndex >= 0;
                    const isPreUnzoom = hasUnzoomingLevel && !revealAfterUnzoom;
                    const toBoardDetailPercent = (coordVal) => {
                        const raw = (((coordVal - 15) + 0.5) / 14) * 100;
                        return Math.max(0, Math.min(100, raw));
                    };
                    const boardDetailMarkers2D = (() => {
                        try {
                            const bm = this.props.boardManager;
                            if (!bm || typeof bm.getCoordinatesFromIndex !== 'function') return [];
                            if (activeMinimapIndex < 0 || !Array.isArray(this.state.minimapIndicators)) return [];
                            const group = this.state.minimapIndicators[activeMinimapIndex] || {};
                            const markers = [];

                            const pushMarker = (marker, defaultType) => {
                                if (!marker || typeof marker.tileId !== 'number') return;
                                const coords = bm.getCoordinatesFromIndex(marker.tileId);
                                if (!Array.isArray(coords) || coords.length < 2) return;
                                const markerType = (marker.type || defaultType || 'location').toLowerCase();
                                const iconKey = markerType === 'alchemist' ? 'alchemist' : (markerType === 'merchant' ? 'merchant' : null);
                                const xPct = toBoardDetailPercent(coords[1]);
                                const yPct = toBoardDetailPercent(coords[0]);
                                markers.push({
                                    key: `${markerType}_${marker.tileId}_${marker.vendorGroupId || ''}`,
                                    left: `${xPct.toFixed(2)}%`,
                                    top: `${yPct.toFixed(2)}%`,
                                    icon: iconKey ? normalizeMapImgUrl(images[iconKey]) : '',
                                    markerType,
                                });
                            };

                            (Array.isArray(group.merchant) ? group.merchant : []).forEach((marker) => pushMarker(marker, 'merchant'));
                            (Array.isArray(group.stairs) ? group.stairs : []).forEach((marker) => pushMarker(marker, 'stairs'));
                            (Array.isArray(group.gates) ? group.gates : []).forEach((marker) => pushMarker(marker, 'gate'));
                            return markers;
                        } catch (e) {
                            return [];
                        }
                    })();
                    const boardDetailEnemyTiles = (() => {
                        try {
                            const bm = this.props.boardManager;
                            if (!bm || typeof bm.getCoordinatesFromIndex !== 'function') return [];
                            if (activeMinimapIndex < 0 || !Array.isArray(this.state.minimapIndicators)) return [];

                            const group = this.state.minimapIndicators[activeMinimapIndex] || {};
                            const orientation = (bm && bm.currentOrientation) || 'A';
                            const byTileId = new Map();

                            (Array.isArray(group.enemies) ? group.enemies : []).forEach((marker) => {
                                if (!marker || typeof marker.tileId !== 'number') return;
                                if (!byTileId.has(marker.tileId)) byTileId.set(marker.tileId, marker);
                            });

                            this.getMonsterSightingsForBoard(currentLevelId, orientation, activeMinimapIndex).forEach((marker) => {
                                if (!marker || typeof marker.tileId !== 'number') return;
                                if (!byTileId.has(marker.tileId)) byTileId.set(marker.tileId, marker);
                            });

                            return Array.from(byTileId.values()).map((marker) => {
                                const coords = bm.getCoordinatesFromIndex(marker.tileId);
                                if (!Array.isArray(coords) || coords.length < 2) return null;
                                const xPct = toBoardDetailPercent(coords[1]);
                                const yPct = toBoardDetailPercent(coords[0]);
                                return {
                                    key: `enemy_tile_${marker.tileId}`,
                                    left: `${xPct.toFixed(2)}%`,
                                    top: `${yPct.toFixed(2)}%`,
                                };
                            }).filter(Boolean);
                        } catch (e) {
                            return [];
                        }
                    })();
                    const boardDetailDiscoveryDots = (() => {
                        try {
                            const bm = this.props.boardManager;
                            const currentOrientation = (bm && bm.currentOrientation) || 'A';
                            const dots = [];
                            this._breadcrumbs.forEach((val) => {
                                if (!val) return;
                                if (val.boardIndex !== activeMinimapIndex) return;
                                if (val.levelId !== currentLevelId) return;
                                if (val.orientation !== currentOrientation) return;
                                const xPct = toBoardDetailPercent(val.col);
                                const yPct = toBoardDetailPercent(val.row);
                                dots.push({
                                    key: `bc_${val.seq}_${val.row}_${val.col}`,
                                    left: `${xPct.toFixed(2)}%`,
                                    top: `${yPct.toFixed(2)}%`,
                                    xPct,
                                    yPct,
                                    row: val.row,
                                    col: val.col,
                                    seq: Number(val.seq) || 0,
                                });
                            });
                            dots.sort((a, b) => a.seq - b.seq);
                            return dots;
                        } catch (e) {
                            return [];
                        }
                    })();
                    const boardDetailPathSegments = (() => {
                        if (!Array.isArray(boardDetailDiscoveryDots) || boardDetailDiscoveryDots.length < 2) return [];
                        const segments = [];
                        let currentSegment = [boardDetailDiscoveryDots[0]];

                        for (let idx = 1; idx < boardDetailDiscoveryDots.length; idx++) {
                            const prev = boardDetailDiscoveryDots[idx - 1];
                            const cur = boardDetailDiscoveryDots[idx];
                            const manhattan = Math.abs(cur.row - prev.row) + Math.abs(cur.col - prev.col);
                            if (manhattan === 1) {
                                currentSegment.push(cur);
                            } else {
                                if (currentSegment.length > 1) segments.push(currentSegment);
                                currentSegment = [cur];
                            }
                        }
                        if (currentSegment.length > 1) segments.push(currentSegment);

                        return segments.map((segment) =>
                            segment.map((dot) => `${dot.xPct.toFixed(2)},${dot.yPct.toFixed(2)}`).join(' ')
                        );
                    })();
                    const boardDetailPlayerTile = (() => {
                        try {
                            const bm = this.props.boardManager;
                            if (!bm || !bm.playerTile || !Array.isArray(bm.playerTile.location)) return null;
                            let playerBoardIndex = bm.playerTile.boardIndex;
                            if ((playerBoardIndex === null || playerBoardIndex === undefined) && typeof bm.getBoardIndexFromBoard === 'function' && bm.currentBoard) {
                                playerBoardIndex = bm.getBoardIndexFromBoard(bm.currentBoard);
                            }
                            if (typeof playerBoardIndex !== 'number' || playerBoardIndex !== activeMinimapIndex) return null;

                            const loc = bm.playerTile.location;
                            const xPct = toBoardDetailPercent(loc[1]);
                            const yPct = toBoardDetailPercent(loc[0]);
                            return {
                                left: `${xPct.toFixed(2)}%`,
                                top: `${yPct.toFixed(2)}%`,
                            };
                        } catch (e) {
                            return null;
                        }
                    })();

                    return (
                        <div className="camp-map-overlay" onClick={hasZoomedLevel ? this.handleMapZoomClose : undefined}>
                            <div className="camp-map-header">
                                <button className="camp-map-back" onClick={this.handleMapOverlayBack}>Back</button>
                                <div className="camp-map-title-wrap">
                                    <div className="camp-map-title">Dungeon Tower</div>
                                    <div className="camp-map-breadcrumbs" role="navigation" aria-label="Map zoom breadcrumbs">
                                        <button
                                            className={`camp-map-crumb ${currentMapZoomLevel === 'dungeon' ? 'active' : ''}`}
                                            onClick={() => this.handleMapBreadcrumbNavigate('dungeon')}
                                        >
                                            dungeon
                                        </button>
                                        <span className="camp-map-crumb-sep">/</span>
                                        <button
                                            className={`camp-map-crumb ${currentMapZoomLevel === 'plane' ? 'active' : ''}`}
                                            onClick={() => this.handleMapBreadcrumbNavigate('plane', {
                                                levelId: selectedLevelId,
                                                levelCount: levelIds.length,
                                                selectedIndex: effectiveSelectedIndex
                                            })}
                                        >
                                            plane
                                        </button>
                                        <span className="camp-map-crumb-sep">/</span>
                                        <button
                                            className={`camp-map-crumb ${currentMapZoomLevel === 'zone' ? 'active' : ''}`}
                                            onClick={() => this.handleMapBreadcrumbNavigate('zone', {
                                                levelId: selectedLevelId,
                                                boardIndex: activeMinimapIndex
                                            })}
                                            disabled={!canEnterZone}
                                        >
                                            zone
                                        </button>
                                    </div>
                                </div>
                                {/* Front / Back orientation toggle */}
                                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: '8px' }}>
                                    {this.getFastidiousCrowLevel() > 0 && (() => {
                                        const meta = getMeta() || {};
                                        const now = new Date();
                                        const scout = meta.scoutActive;
                                        const isOnCooldown = scout && now < new Date(scout.cooldownUntil);
                                        const isScouting = scout && now < new Date(scout.endDate);
                                        
                                        let btnText = "Scout with Crow";
                                        let disabled = false;
                                        if (isScouting) {
                                            const remMin = Math.ceil((new Date(scout.endDate) - now) / 60000);
                                            btnText = `Scouting... (${remMin}m)`;
                                            disabled = true;
                                        } else if (isOnCooldown) {
                                            const remMs = new Date(scout.cooldownUntil) - now;
                                            const remHrs = Math.floor(remMs / 3600000);
                                            const remMins = Math.ceil((remMs % 3600000) / 60000);
                                            btnText = `Crow Cooldown (${remHrs}h ${remMins}m)`;
                                            disabled = true;
                                        }

                                        return (
                                            <button
                                                className="orientation-btn scout-btn"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    border: '1px solid rgba(155, 199, 255, 0.25)',
                                                    borderRadius: '999px',
                                                    background: 'rgba(8, 16, 28, 0.7)',
                                                    color: disabled ? 'rgba(180, 205, 230, 0.35)' : 'rgba(180, 205, 230, 0.85)',
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    letterSpacing: '0.5px',
                                                    textTransform: 'uppercase',
                                                    padding: '4px 14px',
                                                    cursor: disabled ? 'not-allowed' : 'pointer'
                                                }}
                                                onClick={this.handleSendScoutCrow}
                                                disabled={disabled}
                                                title="Send the Fastidious Crow to scout a random board"
                                            >
                                                <span style={{ fontSize: '14px' }} role="img" aria-label="eagle">🦅</span> {btnText}
                                            </button>
                                        );
                                    })()}

                                    <div className="camp-map-orientation-toggle" style={{ marginCenteringOverride: 'none', marginLeft: 0 }}>
                                        <button
                                            className={`orientation-btn ${(this.props.boardManager?.currentOrientation || 'F') === 'F' ? 'active' : ''}`}
                                            onClick={() => {
                                                if (this.props.boardManager) {
                                                    this.props.boardManager.currentOrientation = 'F';
                                                    this.forceUpdate();
                                                }
                                            }}
                                        >
                                            <span className="orientation-icon">◈</span> Front
                                        </button>
                                        <button
                                            className={`orientation-btn ${(this.props.boardManager?.currentOrientation || 'F') === 'B' ? 'active' : ''}`}
                                            onClick={() => {
                                                if (this.props.boardManager) {
                                                    this.props.boardManager.currentOrientation = 'B';
                                                    this.forceUpdate();
                                                }
                                            }}
                                        >
                                            <span className="orientation-icon">◇</span> Back
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {(() => {
                                const meta = getMeta() || {};
                                if (!meta.scoutActive) return null;
                                const now = new Date();
                                const start = new Date(meta.scoutActive.endDate);
                                const end = new Date(meta.scoutActive.scoutedArea?.revealUntil || meta.scoutActive.endDate);
                                const isScouting = now < start;
                                const isRevealed = now >= start && now < end;
                                
                                if (isScouting) {
                                    const remMin = Math.ceil((start - now) / 60000);
                                    return (
                                        <div style={{ background: 'rgba(235,178,54,0.15)', border: '1px solid #ebb236', borderRadius: '4px', padding: '6px 10px', fontSize: '12px', color: '#ffd67a', marginBottom: '8px', textAlign: 'center', fontWeight: '500' }}>
                                            <span role="img" aria-label="eagle">🦅</span> Fastidious Crow is scouting a random board... ({remMin}m remaining)
                                        </div>
                                    );
                                } else if (isRevealed) {
                                    const remMs = end - now;
                                    const remHours = Math.floor(remMs / 3600000);
                                    const remMin = Math.floor((remMs % 3600000) / 60000);
                                    return (
                                        <div style={{ background: 'rgba(82,163,255,0.15)', border: '1px solid #52a3ff', borderRadius: '4px', padding: '6px 10px', fontSize: '12px', color: '#a3d1ff', marginBottom: '8px', textAlign: 'center', fontWeight: '500' }}>
                                            <span role="img" aria-label="eagle">🦅</span> Fastidious Crow has scouted a 10x10 area on Level {meta.scoutActive.scoutedArea.levelId}, Board {meta.scoutActive.scoutedArea.boardIndex + 1} ({remHours}h {remMin}m remaining)
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            <div className="camp-map-scene-wrap" onClick={(e) => e.stopPropagation()}>
                                <div className={`camp-map-scene ${hasZoomedLevel ? 'zoomed' : ''} ${hasPendingZoomLevel ? 'pre-zoom' : ''} ${isPreUnzoom ? 'pre-unzoom' : ''} ${revealAfterUnzoom ? 'reveal-others' : ''}`} role="list" aria-label="Dungeon tower floors">
                                    {levelIds.map((levelId, index) => {
                                        const isCurrent = levelId === currentLevelId;
                                        const isSelected = levelId === selectedLevelId;
                                        const isZoomed = zoomedLevelId === levelId;
                                        const showBoardHighlight = isCurrent && isZoomed && !!boardHighlightImage;
                                        const isUnzooming = unzoomingLevelId === levelId;
                                        const isPendingZoom = pendingZoomLevelId === levelId;
                                        const isBoardDetailFading = showBoardHighlight && mapBoardDetailStage === 'fading' && mapBoardDetailBoardIndex === activeMinimapIndex;
                                        const isBoardDetailActive = showBoardHighlight && mapBoardDetailStage === 'detail' && mapBoardDetailBoardIndex === activeMinimapIndex;
                                        const holdOthersHidden = hasZoomedLevel || hasPendingZoomLevel || (hasUnzoomingLevel && !revealAfterUnzoom);
                                        const depthOffset = index * 52;
                                        const slabZIndex = (isZoomed || isUnzooming) ? 1000 : (levelIds.length - index);
                                        return (
                                            <button
                                                key={levelId}
                                                role="listitem"
                                                className={`tower-floor-slab ${isSelected ? 'active' : ''} ${isZoomed ? 'zoomed-in' : ''} ${showBoardHighlight ? 'show-board-highlight' : ''} ${isUnzooming ? 'zooming-out' : ''} ${isPendingZoom ? 'pending-zoom' : ''} ${isBoardDetailFading ? 'board-detail-fading' : ''} ${isBoardDetailActive ? 'board-detail-active' : ''} ${holdOthersHidden && !isZoomed && !isUnzooming && !isPendingZoom ? 'faded' : ''}`}
                                                style={{
                                                    '--tower-offset': `${depthOffset}px`,
                                                    '--tower-zoom-shift': `${124 - depthOffset}px`,
                                                    '--fade-in-delay': `${index * 90}ms`,
                                                    '--fade-out-delay': `${index * 90}ms`,
                                                    animationDelay: `${index * 70}ms`,
                                                    zIndex: slabZIndex
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // If this level is already selected in map view
                                                    if (isSelected) {
                                                        // If already zoomed, unzoom
                                                        if (isZoomed) {
                                                            this.handleMapZoomClose();
                                                        } else {
                                                            // If selected but not zoomed, zoom in
                                                            this.handleMapZoomInStart(levelId, levelIds.length, index);
                                                        }
                                                    } else {
                                                        // If not selected, select this level in map view only
                                                        this.handleMapLevelSelect(levelId);
                                                    }
                                                }}
                                                title={`Go to level ${levelId}`}
                                            >
                                                <span className="slab-shadow"></span>
                                                <span className="slab-face slab-top"></span>
                                                <span className="slab-face slab-grid"></span>
                                                <span
                                                    className="slab-face slab-board-highlight"
                                                    style={showBoardHighlight ? { backgroundImage: boardHighlightImage } : undefined}
                                                    onClick={(event) => {
                                                        if (!showBoardHighlight) return;
                                                        event.preventDefault();
                                                        event.stopPropagation();
                                                        if (!isBoardDetailFading) this.handleMapCurrentBoardLayerOpen(activeMinimapIndex);
                                                    }}
                                                >
                                                    {showBoardHighlight && slabVendorMarkers.map((marker) => (
                                                        <span
                                                            key={marker.key}
                                                            className={`slab-vendor-icon ${marker.markerType}`}
                                                            style={{ left: marker.left, top: marker.top, backgroundImage: marker.icon }}
                                                        />
                                                    ))}
                                                    {showBoardHighlight && playerSlabDot && (
                                                        <span className="slab-player-dot" style={playerSlabDot} />
                                                    )}
                                                    {showBoardHighlight && (isBoardDetailFading || isBoardDetailActive) && (
                                                        <span className={`slab-board-plane-layer ${isBoardDetailFading ? 'is-fading' : ''} ${isBoardDetailActive ? 'is-detail' : ''}`}>
                                                            <svg className="slab-board-cells-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                                                {boardCells.map((cell) => {
                                                                    const isCurrentBoardCell = cell.boardIndex === activeMinimapIndex;
                                                                    const isFadedCell = (isBoardDetailFading || isBoardDetailActive) && !isCurrentBoardCell;
                                                                    let isScouted = false;
                                                                    try {
                                                                        const meta = getMeta() || {};
                                                                        if (meta.scoutActive && meta.scoutActive.scoutedArea) {
                                                                            const now = new Date();
                                                                            const start = new Date(meta.scoutActive.endDate);
                                                                            const end = new Date(meta.scoutActive.scoutedArea.revealUntil);
                                                                            if (now >= start && now < end &&
                                                                                levelId === meta.scoutActive.scoutedArea.levelId &&
                                                                                cell.boardIndex === meta.scoutActive.scoutedArea.boardIndex) {
                                                                                isScouted = true;
                                                                            }
                                                                        }
                                                                    } catch (e) {}

                                                                    return (
                                                                        <polygon
                                                                            key={`cell_${cell.boardIndex}`}
                                                                            points={cell.points}
                                                                            className={`board-cell ${isCurrentBoardCell ? 'current' : ''} ${isFadedCell ? 'faded' : ''}`}
                                                                            style={isScouted ? { fill: 'rgba(92, 194, 255, 0.35)', stroke: '#52a3ff', strokeWidth: 1.2 } : undefined}
                                                                        />
                                                                    );
                                                                })}
                                                            </svg>
                                                            {(() => {
                                                                try {
                                                                    const meta = getMeta() || {};
                                                                    if (meta.scoutActive && meta.scoutActive.scoutedArea) {
                                                                        const now = new Date();
                                                                        const start = new Date(meta.scoutActive.endDate);
                                                                        const end = new Date(meta.scoutActive.scoutedArea.revealUntil);
                                                                        if (now >= start && now < end && levelId === meta.scoutActive.scoutedArea.levelId) {
                                                                            const scoutedIdx = meta.scoutActive.scoutedArea.boardIndex;
                                                                            const cell = boardCells.find(c => c.boardIndex === scoutedIdx);
                                                                            if (cell) {
                                                                                return (
                                                                                    <span
                                                                                        className="slab-scout-marker"
                                                                                        role="img"
                                                                                        aria-label="eagle"
                                                                                        style={{
                                                                                            position: 'absolute',
                                                                                            left: `${cell.center.x}%`,
                                                                                            top: `${cell.center.y}%`,
                                                                                            transform: 'translate(-50%, -50%)',
                                                                                            fontSize: '15px',
                                                                                            zIndex: 10,
                                                                                            pointerEvents: 'none'
                                                                                        }}
                                                                                    >
                                                                                        🦅
                                                                                    </span>
                                                                                );
                                                                            }
                                                                        }
                                                                    }
                                                                } catch (e) {}
                                                                return null;
                                                            })()}
                                                            <span className={`slab-board-detail-2d ${isBoardDetailActive ? 'visible' : ''}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}>
                                                                <span className="board-detail-grid"></span>
                                                                {boardDetailPathSegments.length > 0 && (
                                                                    <svg className="board-detail-path-svg" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                                                                        {boardDetailPathSegments.map((segmentPoints, segmentIdx) => (
                                                                            <polyline key={`bd_path_${segmentIdx}`} points={segmentPoints} />
                                                                        ))}
                                                                    </svg>
                                                                )}
                                                                {boardDetailEnemyTiles.map((marker) => (
                                                                    <span
                                                                        key={marker.key}
                                                                        className="board-detail-enemy-tile"
                                                                        style={{ left: marker.left, top: marker.top }}
                                                                    />
                                                                ))}
                                                                {boardDetailPlayerTile && (
                                                                    <span
                                                                        className="board-detail-player-tile"
                                                                        style={{ left: boardDetailPlayerTile.left, top: boardDetailPlayerTile.top }}
                                                                    />
                                                                )}
                                                                {boardDetailDiscoveryDots.map((dot) => (
                                                                    <span
                                                                        key={dot.key}
                                                                        className="board-detail-discovery-dot"
                                                                        style={{ left: dot.left, top: dot.top }}
                                                                    />
                                                                ))}
                                                                {boardDetailMarkers2D.map((marker) => (
                                                                    <span
                                                                        key={marker.key}
                                                                        className={`board-detail-location-icon ${marker.markerType}`}
                                                                        style={{ left: marker.left, top: marker.top, backgroundImage: marker.icon }}
                                                                    />
                                                                ))}
                                                            </span>
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="slab-face slab-left"></span>
                                                <span className="slab-face slab-right"></span>
                                                <span className="slab-label">L{levelId}</span>
                                                {isCurrent && <span className="slab-active-badge">Current</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </CModal>

            {/* Skill Tree popup */}
            <CModal size="xl" className="skill-tree-modal" alignment="center" visible={this.state.showSkillTreePopup} onClose={this.handleCloseSkillTree} backdrop={true}>
                {this.state.selectedSkillTreeCrewMember && (
                    <SkillTree crewMember={this.state.selectedSkillTreeCrewMember} onClose={this.handleCloseSkillTree} />
                )}
            </CModal>
            {/* <ExpositionPane></ExpositionPane> */}
            {this.props.boardManager.currentOrientation === 'B' && <div className="dark-mask"></div>}
            <div className={`left-side-panel ${this.state.leftPanelExpanded ? 'expanded' : ''}`}>
                <div className="expand-collapse-button icon-container" onClick={this.toggleLeftSidePanel}>
                    <CIcon icon={cilCaretRight} className={`expand-icon ${this.state.leftPanelExpanded ? 'expanded' : ''}`} size="sm"/>
                </div>
                {/* <div className="minimap-container">

                </div> */}
                {/* crew-container moved to right-side panel */}
                {this.state.selectedCrewMember.name && <div className="crew-info-section">
                        <div className="portrait-wrapper">
                            <div className="status-container">
                                <div className="member-level-indicator">Lvl {this.state.selectedCrewMember.level}</div>
                            </div>
                            {(() => {
                                let portraitUrl = this.state.selectedCrewMember.portrait;
                                if (portraitUrl && typeof portraitUrl === 'object') {
                                    portraitUrl = portraitUrl.default || portraitUrl;
                                }
                                if (portraitUrl && typeof portraitUrl === 'object') {
                                    portraitUrl = portraitUrl.default || '';
                                }
                                return <div className="portrait" style={{backgroundImage: `url(${portraitUrl})`}}></div>;
                            })()}
                            <div className="cooldowns-container">
                                {/* Group special actions by type (flat structure) */}
                                {(() => {
                                    const actions = this.state.selectedCrewMember.specialActions || [];
                                    // Group by a key that distinguishes glyph tiers — for type:'glyph' use 'glyph:minor' etc.
                                    const grouped = {};
                                    actions.forEach(action => {
                                        const key = action.type === 'glyph' && action.glyphTier
                                            ? `glyph:${action.glyphTier}`
                                            : action.type;
                                        if (!grouped[key]) grouped[key] = [];
                                        grouped[key].push(action);
                                    });
                                    return Object.keys(grouped).map((groupKey, i) => {
                                        const group = grouped[groupKey];
                                        const action = group[0]; // representative
                                        const count = group.filter(a => a.available).length;
                                        // Prefer an in-progress action (one whose start/end bracket 'now') for the circular progress UI.
                                        const now = new Date();
                                        const inProgressAction = group.find(a => {
                                            if (!a || !a.startDate || !a.endDate) return false;
                                            const s = new Date(a.startDate);
                                            const e = new Date(a.endDate);
                                            return now >= s && now < e;
                                        });
                                        const progressPct = inProgressAction ? this.getActionCooldownPercentage(inProgressAction) : 0;
                                        
                                        // Resolve icon: new-format glyphs use tier icon; legacy magic missile uses its icon
                                        let iconUrl = action.iconUrlInverted || action.iconUrl;
                                        if (!iconUrl && action.glyphTier && typeof images !== 'undefined') {
                                            iconUrl = images[`${action.glyphTier}_glyph`] || '';
                                        }
                                        if (!iconUrl && action.subtype === 'magic missile' && typeof images !== 'undefined') {
                                            iconUrl = images['magic_missile_icon'] || images['magic_missile_inverted'] || images['magic_missile'];
                                        }
                                        if (!iconUrl && typeof images !== 'undefined') {
                                            iconUrl = images['glyph_inverted'] || '';
                                        }
                                        if (iconUrl && typeof iconUrl === 'object') {
                                            iconUrl = iconUrl.default || iconUrl;
                                        }
                                        if (iconUrl && typeof iconUrl === 'object') {
                                            iconUrl = iconUrl.default || '';
                                        }
                                        const resolvedIconString = typeof iconUrl === 'string' ? iconUrl : '';
                                        return (
                                            <div key={groupKey} className="special-action-wrapper" style={{position: 'relative'}}>
                                                <div className="special-action-icon" style={{backgroundImage: resolvedIconString ? `url("${encodeURI(resolvedIconString)}")` : 'none'}}></div>
                                                {inProgressAction && progressPct < 50 && <div className="progress-overlay"></div>}
                                                {inProgressAction && <div className="left" style={{transform: `rotate(${this.getRotateDegreesLeft(progressPct)}deg)`}}></div>}
                                                {inProgressAction && <div className="right" style={{transform: `rotate(${this.getRotateDegreesRight(progressPct)}deg)`}}></div>}
                                                {count >= 1 && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: 6,
                                                        right: -16,
                                                        color: 'white',
                                                        fontWeight: 'bold',
                                                        borderRadius: '50%',
                                                        minWidth: 18,
                                                        minHeight: 18,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: 10,
                                                        zIndex: 99,
                                                    }}>
                                                        {this.getSubtypeNumeralElement({count})}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                        <div className="name-line">{this.state.selectedCrewMember.name} the {this.uppercaseFirstLetter(this.state.selectedCrewMember.type || this.state.selectedCrewMember.image)}</div>
                        
                        {/* Global Skills row */}
                        {(() => {
                            const member = this.state.selectedCrewMember;
                            const globalSkills = member.globalSkills || [];
                            if (globalSkills.length === 0) return null;
                            
                            const skillDetails = {
                                keen_eye: { name: 'Keen Eye', desc: 'L1: Reveals +2 fog tiles. L2: Reveals nearby traps. L3: +3 DEX to trap saves.' },
                                scrounging_rat: { name: 'Scrounging Rat', desc: 'Allows scrounging for food in camp: 15-30 food (3h) / 30-50 food (2h) / 50-80 food (1h).' },
                                fastidious_crow: { name: 'Fastidious Crow', desc: 'Scouts a random board (10x10 fog reveal) for 24 hours. Process takes 20m. Cooldown and gold/gem reward based on level.' },
                                hunters_quarry: { name: "Hunter's Quarry", desc: '+10% food drop on monster defeat' },
                                read_the_land: { name: 'Read the Land', desc: 'Adjacent tile types hinted on entry' },
                                trailblaze: { name: 'Trailblaze', desc: 'Visual breadcrumb to last camp spot' },
                                herbalism: { name: 'Herbalism', desc: 'Camp costs 1 less food per member' },
                                mend: { name: 'Mend', desc: 'Out-of-combat potions restore +15% HP' },
                                ritual_efficiency: { name: 'Ritual Efficiency', desc: 'Ritual prep time -25%' },
                                revive: { name: 'Revive', desc: 'Once per run: fallen member revived at 25% HP' },
                                fortify: { name: 'Fortify', desc: 'Resolve does not decay while camping' },
                                breacher: { name: 'Breacher', desc: 'Force open a Minor Key gate once per level' },
                                rally: { name: 'Rally', desc: '+5 bonus Resolve on combat victory' },
                                iron_will: { name: 'Iron Will', desc: 'Party Resolve never drops below 20 from deaths' },
                                arcane_sense: { name: 'Arcane Sense', desc: 'Identifies chest tier before opening' },
                                ley_tap: { name: 'Ley Tap', desc: 'Draw energy at Magic Nexus — recover 15% endurance' },
                                dimensional_pocket: { name: 'Dimensional Pocket', desc: '+2 shared inventory slots' },
                                scry: { name: 'Scry', desc: 'Reveals all chests and monsters for 30s once per run' },
                                iron_gut: { name: 'Iron Gut', desc: 'Barbarian does not count toward camping food cost' },
                                savage_haul: { name: 'Savage Haul', desc: 'Grants +2/+4/+6 Strength and +10/+20/+30 Max HP' },
                                bloodhound: { name: 'Bloodhound', desc: 'Reveals all monsters on miniboard entry' },
                                endure: { name: 'Endure', desc: 'Zero-food camp: no Resolve penalty, crew heals to 50%' },
                                swift_step: { name: 'Swift Step', desc: 'Movement animation 30% faster' },
                                focused_rest: { name: 'Focused Rest', desc: 'Camping duration -30% (same healing)' },
                                pressure_points: { name: 'Pressure Points', desc: '15% vendor discount once per vendor' },
                                astral_map: { name: 'Astral Map', desc: 'Full fog reveal for 60s once per run' },
                                spirit_sight: { name: 'Spirit Sight', desc: 'Narrative tiles glow through fog' },
                                plunder: { name: 'Plunder', desc: 'Open a chest a second time once per run' },
                                soul_tithe: { name: 'Soul Tithe', desc: '+1 Shimmering Dust per combat victory' },
                                dark_pact: { name: 'Dark Pact', desc: 'Trade Shimmering Dust at vendors (1 Dust = 25g)' },
                                awake_refreshed: { name: 'Awake Refreshed', desc: 'Camp recuperation grants an additional +10/+20/+40 Resolve.' },
                                strong_resolve: { name: 'Strong Resolve', desc: 'Reduces Resolve penalties by 40%/75%/90%.' }
                            };

                            const getGlobalSkillIcon = (memberType, skillKey) => {
                                const type = (memberType || '').toLowerCase();
                                const key = (skillKey || '').toLowerCase();
                                if (key === 'awake_refreshed') {
                                    if (type === 'sage') return images.awake_refreshed_sage;
                                    if (type === 'soldier') return images.awake_refreshed_soldier;
                                }
                                if (key === 'strong_resolve' && type === 'soldier') {
                                    return images.strong_resolve_soldier;
                                }
                                return images.glyph_inverted || images.avatar;
                            };

                            return (
                                <div className="global-skills-row" style={{ display: 'flex', flexDirection: 'row', gap: '8px', margin: '8px 0 12px 0', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    {globalSkills.map((s, sIdx) => {
                                        const key = typeof s === 'string' ? s : s.key;
                                        const level = typeof s === 'string' ? 1 : (s.level || 1);
                                        const details = skillDetails[key] || { name: key, desc: '' };
                                        const iconUrl = getGlobalSkillIcon(member.type, key);
                                        return (
                                            <div
                                                key={key + '-' + sIdx}
                                                className="global-skill-icon-wrapper"
                                                style={{
                                                    position: 'relative',
                                                    width: '32px',
                                                    height: '32px',
                                                    border: '1px solid rgba(212,168,68,0.4)',
                                                    borderRadius: '4px',
                                                    background: 'rgba(0,0,0,0.6)',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 0 6px rgba(212,168,68,0.2)'
                                                }}
                                                onMouseEnter={() => this.setState({ descriptionText: `${details.name} (Level ${level}): ${details.desc}` })}
                                                onMouseLeave={() => this.setState({ descriptionText: '' })}
                                            >
                                                <img
                                                    src={iconUrl}
                                                    alt={details.name}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '3px' }}
                                                />
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: '-5px',
                                                    right: '-5px',
                                                    backgroundColor: '#d4a844',
                                                    color: 'black',
                                                    fontWeight: 'bold',
                                                    fontSize: '9px',
                                                    borderRadius: '50%',
                                                    minWidth: '13px',
                                                    height: '13px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: '1px solid black',
                                                    padding: '1px',
                                                    lineHeight: 1
                                                }}>
                                                    {level}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                        {/* HP bar (hp-line-container) - shows current HP proportion */}
                        {(() => {
                            const selected = this.state.selectedCrewMember || {};
                            const maxHp = (selected.stats && selected.stats.hp) ? selected.stats.hp : 0;
                            const currentHp = (typeof selected.hp !== 'undefined') ? selected.hp : maxHp;
                            const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, Math.ceil((currentHp / maxHp) * 100))) : 0;
                            return (
                                <div className="hp-line-container" style={{width: '100%'}}>
                                    <div className="hp-line" style={{width: `${hpPct}%`}}></div>
                                </div>
                            )
                        })()}

                        <div className="experience-line-container">
                            <div className="experience-line" style={{width: `${this.props.crewManager.calculateExpPercentage(this.state.selectedCrewMember)}%`}}></div>
                        </div>

                        {/* hitpoints stat-line under the experience container */}
                        {(() => {
                            const selected = this.state.selectedCrewMember || {};
                            const maxHp = (selected.stats && selected.stats.hp) ? selected.stats.hp : 0;
                            const currentHp = (typeof selected.hp !== 'undefined') ? selected.hp : maxHp;
                            return (
                                <div className="stat-line"> <span className="stat-name">hitpoints</span>  <span className='stat-value'>{currentHp}/{maxHp}</span> </div>
                            )
                        })()}
                        <div className="stat-line"> <span className="stat-name">Strength</span>  <span className='stat-value'>{this.state.selectedCrewMember.stats?.str} </span> </div>
                        <div className="stat-line">Dexterity <span className='stat-value'> {this.state.selectedCrewMember.stats?.dex} </span></div>
                        <div className="stat-line">Intelligence <span className='stat-value'>{this.state.selectedCrewMember.stats?.int} </span></div>
                        {/* Vitality removed */}
                        <div className="stat-line">Fortitude <span className='stat-value'> {this.state.selectedCrewMember.stats?.fort} </span></div>
                        <div className="icon-container menu" onClick={this.toggleActionsTray}>
                            <CIcon icon={cilMenu} className={`menu-icon ${this.state.leftPanelExpanded ? 'expanded' : ''}`} size="sm"/>
                            Actions
                        </div>
                        <div className={`actions-tray ${this.state.actionsTrayExpanded && (Array.isArray(this.state.actionMenuTypeExpanded) ? this.state.actionMenuTypeExpanded.length > 0 : !!this.state.actionMenuTypeExpanded) ? 'double-expanded' : 
                        (this.state.actionsTrayExpanded ? 'expanded' : '')}`}>
                            {this.getCharacterActions(this.state.selectedCrewMember)}
                        </div>
                        <div className="equipment-panel">
                            {/* Replaced with a direct copy of the `.crew-body` from the inventory popup */}
                            <div className='crew-body' style={{marginTop: '-16px'}}>
                                <div className='crew-body-image' style={{backgroundImage: `url(${images.body_male})`}} />
                                {/* equip slots: chest, right-hand, left-hand, head, ancillary-left, ancillary-right */}
                                {(() => {
                                    const selected = this.state.selectedCrewMember || {};
                                    const findEquipped = (slot) => {
                                        const slotsToCheck = (slot === 'pet' || slot === 'bottom-left') ? ['pet','bottom-left'] : [slot];
                                        return (selected.inventory || []).find(i => slotsToCheck.includes(i.equippedSlot));
                                    };
                                    const chest = findEquipped('chest');
                                    const right = findEquipped('right');
                                    const left = findEquipped('left');
                                    const head = findEquipped('head');
                                    const boots = findEquipped('boots');
                                    const bottomLeft = findEquipped('pet');
                                    const ancillaryLeft = findEquipped('ancillary-left');
                                    const ancillaryRight = findEquipped('ancillary-right');
                                    // Read-only slot — no click, just a name tooltip on hover
                                    const ReadOnlySlot = ({ item, slotClass }) => {
                                        const slotKey = slotClass.replace('slot-', '');
                                        const info = SLOT_INFO[slotKey] || { name: 'Equipment Slot', desc: '' };
                                        const slotName = slotClass === 'slot-left' ? 'left' : (slotClass === 'slot-right' ? 'right' : null);
                                        return (
                                            <div 
                                                className={`equip-slot ${slotClass} ep-slot-wrapper`}
                                                title={!item ? info.name : undefined}
                                                onMouseEnter={() => !item ? this.setState({ descriptionText: `${info.name}: ${info.desc}` }) : null}
                                                onMouseLeave={() => this.setState({ descriptionText: '' })}
                                                onContextMenu={(e) => slotName ? this.handleSlotContextMenu(e, slotName) : null}
                                            >
                                                {item && (
                                                    <>
                                                        <Tile
                                                            id={item.id}
                                                            data={item}
                                                            tileSize={this.state.tileSize}
                                                            image={item.icon}
                                                            contains={item.name ? item.name.replace(' ', '_') : null}
                                                            color={item.color}
                                                            editMode={false}
                                                            type={'inventory-tile'}
                                                            handleClick={() => {}}
                                                            handleHover={() => this.setState({ descriptionText: this.buildItemSummaryDescription(item) })}
                                                        />
                                                        <div className="ep-slot-name">{item.name}</div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    };
                                    return (
                                        <>
                                            <ReadOnlySlot item={chest}        slotClass="slot-chest" />
                                            <ReadOnlySlot item={right}        slotClass="slot-right" />
                                            <ReadOnlySlot item={left}         slotClass="slot-left" />
                                            <ReadOnlySlot item={head}         slotClass="slot-head" />
                                            <ReadOnlySlot item={boots}        slotClass="slot-boots" />
                                            <ReadOnlySlot item={ancillaryLeft}  slotClass="slot-ancillary-left" />
                                            <ReadOnlySlot item={ancillaryRight} slotClass="slot-ancillary-right" />
                                            <ReadOnlySlot item={bottomLeft}   slotClass="slot-pet" />
                                        </>
                                    )
                                })()}
                            </div>
                            {/* left-body-preview mirror (kept for legacy styling hooks) */}
                            <div className='left-body-preview' style={{backgroundImage: `url(${images.body_male})`, backgroundSize: '130%'}}></div>
                            {/* stats display area removed from left panel (kept only in inventory popup) */}
                        </div>
                        <div className="description-panel">
                            {this.state.descriptionText}
                        </div>
                </div>}
            </div>
            {/* Dev console panel (toggled with Shift+Space) */}
            {this.state.devConsoleOpen && (
                <div className="dev-console">
                    <div className="dev-console-inner">
                        <div className="dev-console-left">
                            <input
                                ref={this.devConsoleInputRef}
                                className="dev-console-input"
                                value={this.state.devConsoleInput}
                                onChange={this.handleDevConsoleInputChange}
                                onKeyDown={this.handleDevConsoleKeyDown}
                                placeholder="type command..."
                            />
                            <div className="dev-console-typed">{this.state.devConsoleInput}</div>
                        </div>
                        <div className="dev-console-divider" />
                        <div className="dev-console-right">
                            <div className="dev-console-output" ref={this.devConsoleOutputRef}>
                                {this.state.devConsoleOutput.map((line, idx) => (
                                    <div key={idx} className="dev-console-line">{line}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className={`right-side-panel ${this.state.rightPanelExpanded ? 'expanded' : ''}`}>
                <div className="minimap-container">
                    <div className="map-wrapper">
                        <div className="level-indicator">
                            {this.state.levelTracker && this.state.levelTracker.map((e,i)=>{
                                return <div key={i} className={`floor-level ${e.active ? 'active' : ''} `}></div>
                            })}
                        </div>
                        {this.state.minimap.map((e,i)=>{
                            // Build breadcrumb SVG trail for this board tile
                            const bcTrail = (() => {
                                try {
                                    const now = Date.now();
                                    const DIM_MS  = 20 * 60 * 1000; // 20 min → dim
                                    const TILE_PX = 50; // matches .minimap-tile height/width
                                    // Current plane — must match what recordBreadcrumb stored
                                    const currentLevelId = (this.state.levelTracker.find(e => e.active) || {}).id;
                                    const currentOrientation = (this.props.boardManager && this.props.boardManager.currentOrientation) || 'A';
                                    // Gather all crumbs for this board on this plane, sorted by visit order
                                    const crumbs = [];
                                    this._breadcrumbs.forEach(val => {
                                        if (
                                            val.boardIndex === i &&
                                            val.levelId === currentLevelId &&
                                            val.orientation === currentOrientation
                                        ) crumbs.push(val);
                                    });
                                    if (crumbs.length === 0) return null;
                                    crumbs.sort((a, b) => a.seq - b.seq);
                                    // Convert row/col (15–29) to SVG pixel coords within 50px tile
                                    const toXY = c => ({
                                        x: ((c.col - 15) / 14) * TILE_PX,
                                        y: ((c.row - 15) / 14) * TILE_PX,
                                    });
                                    const splitIntoAdjacentSegments = (crumbList) => {
                                        if (!Array.isArray(crumbList) || crumbList.length < 2) return [];
                                        const segments = [];
                                        let currentSegment = [crumbList[0]];

                                        for (let idx = 1; idx < crumbList.length; idx++) {
                                            const prev = crumbList[idx - 1];
                                            const cur = crumbList[idx];
                                            const manhattan = Math.abs(cur.row - prev.row) + Math.abs(cur.col - prev.col);
                                            if (manhattan === 1) {
                                                currentSegment.push(cur);
                                            } else {
                                                if (currentSegment.length > 1) segments.push(currentSegment);
                                                currentSegment = [cur];
                                            }
                                        }
                                        if (currentSegment.length > 1) segments.push(currentSegment);

                                        return segments.map((segment) =>
                                            segment.map((crumb) => {
                                                const { x, y } = toXY(crumb);
                                                return `${x.toFixed(1)},${y.toFixed(1)}`;
                                            }).join(' ')
                                        );
                                    };

                                    const freshCrumbs = crumbs.filter((crumb) => (now - crumb.ts) <= DIM_MS);
                                    const dimCrumbs = crumbs.filter((crumb) => (now - crumb.ts) > DIM_MS);
                                    const freshSegments = splitIntoAdjacentSegments(freshCrumbs);
                                    const dimSegments = splitIntoAdjacentSegments(dimCrumbs);

                                    return { freshSegments, dimSegments };
                                } catch(e) { return null; }
                            })();
                            return <div className={`minimap-tile 
                            ${this.state.minimap[i].active ? 'active' : ''}
                            ${this.props.boardManager && this.props.boardManager.currentOrientation === 'B' && this.state.minimap[i].active ? 'backside' : ''}
                            ${this.state.minimapZoomedTile === i ? 'zoomed' : ''}
                            ${this.state.minimapZoomedTile === i && i === 0 ? 'topLeft' : ''}
                            ${this.state.minimapZoomedTile === i && i === 1 ? 'topMid' : ''}
                            ${this.state.minimapZoomedTile === i && i === 2 ? 'topRight' : ''}
                            ${this.state.minimapZoomedTile === i && i === 3 ? 'midLeft' : ''}
                            ${this.state.minimapZoomedTile === i && i === 5 ? 'midRight' : ''}
                            ${this.state.minimapZoomedTile === i && i === 6 ? 'botLeft' : ''}
                            ${this.state.minimapZoomedTile === i && i === 7 ? 'botMid' : ''}
                            ${this.state.minimapZoomedTile === i && i === 8 ? 'botRight' : ''}
                            `} key={i} onClick={() => this.minimapTileClicked(i)}>

                                {/* Breadcrumb trail SVG — rendered below the player dot */}
                                {bcTrail && (bcTrail.freshSegments.length > 0 || bcTrail.dimSegments.length > 0) && (
                                    <svg className="breadcrumb-trail-svg" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                                        {bcTrail.dimSegments.map((segmentPoints, segmentIdx) => (
                                            <polyline
                                                key={`bc_dim_${segmentIdx}`}
                                                points={segmentPoints}
                                                className="bc-dim"
                                            />
                                        ))}
                                        {bcTrail.freshSegments.map((segmentPoints, segmentIdx) => (
                                            <polyline
                                                key={`bc_fresh_${segmentIdx}`}
                                                points={segmentPoints}
                                                className="bc-fresh"
                                            />
                                        ))}
                                    </svg>
                                )}

                                {/* // player // */}
                                {this.state.minimap[i].active && <div className="player-position-indicator"
                                style={{
                                    left: this.calcPlayerIndicatorLeft(),
                                    top: this.calcPlayerIndicatorTop()
                                }}></div>}

                                {this.props.boardManager && this.props.boardManager.currentOrientation === 'B' && this.state.minimap[i].active && (
                                    <div className="backside-badge" title="Backside of map">B</div>
                                )}

                                {/* // enemies // */}
                                {(() => {
                                    const currentLevelId = (this.state.levelTracker.find(levelEntry => levelEntry.active) || {}).id;
                                    const currentOrientation = (this.props.boardManager && this.props.boardManager.currentOrientation) || 'A';
                                    const baseEnemies = (this.state.minimapIndicators[i] && Array.isArray(this.state.minimapIndicators[i].enemies))
                                        ? this.state.minimapIndicators[i].enemies
                                        : [];
                                    const sightingEnemies = this.getMonsterSightingsForBoard(currentLevelId, currentOrientation, i);
                                    const mergedByTile = new Map();
                                    baseEnemies.forEach((indicator) => {
                                        if (!indicator || typeof indicator.tileId !== 'number') return;
                                        if (!mergedByTile.has(indicator.tileId)) mergedByTile.set(indicator.tileId, indicator);
                                    });
                                    sightingEnemies.forEach((indicator) => {
                                        if (!indicator || typeof indicator.tileId !== 'number') return;
                                        if (!mergedByTile.has(indicator.tileId)) mergedByTile.set(indicator.tileId, indicator);
                                    });

                                    return Array.from(mergedByTile.values()).map((indicator, idx) => (
                                        <div
                                            key={`${indicator.tileId}_${idx}`}
                                            className="minimap-indicator enemy"
                                            style={{
                                                left: this.calcIndicator(indicator.tileId).left,
                                                top: this.calcIndicator(indicator.tileId).top
                                            }}
                                        >
                                        </div>
                                    ));
                                })()}

                                {/* // stairs // */}
                                {this.state.minimapIndicators[i] && this.state.minimapIndicators[i].stairs.map((indicator,idx)=>{
                                    return <div key={idx} className={`minimap-indicator stairs`}
                                    style={{
                                        left: this.calcIndicator(indicator.tileId).left,
                                        top: this.calcIndicator(indicator.tileId).top
                                    }}>
                                    </div>
                                })}

                                {/* // gates // */}
                                {this.state.minimapIndicators[i] && this.state.minimapIndicators[i].gates.map((indicator,idx)=>{
                                    return <div key={idx} className={`minimap-indicator gate`}
                                    style={{
                                        left: this.calcIndicator(indicator.tileId).left,
                                        top: this.calcIndicator(indicator.tileId).top
                                    }}>
                                    </div>
                                })}

                                {/* // merchants // */}
                                {this.state.minimapIndicators[i] && this.state.minimapIndicators[i].merchant.map((indicator,idx)=>{
                                    const footprintPct = `${(2 / 15) * 100}%`;
                                    return <div key={idx} className={`minimap-indicator merchant`}
                                    style={{
                                        left: this.calcIndicator(indicator.tileId).left,
                                        top: this.calcIndicator(indicator.tileId).top,
                                        width: footprintPct,
                                        height: footprintPct,
                                        borderRadius: '2px'
                                    }}>
                                    </div>
                                })}

                            </div>
                        })}
                    </div>
                    {this.props.boardManager && this.props.boardManager.currentOrientation === 'B' && (
                        <div className="backside-indicator">
                            <span style={{ color: '#f9b115', marginRight: '6px' }}>☯</span> backside orientation
                        </div>
                    )}
                </div>
                <div className="crew-container">
                    {/* <div className="title">Crew</div> */}

                    {/* Death tracker: shows skull icons for recent group deaths (meta.deathTracker) */}
                    {(() => {
                        try {
                            const meta = getMeta() || {};
                            const deaths = meta.deathTracker || 0;
                            const tooltip = 'Your crew has met death and been spared. If this happens thrice, your journey is over';
                            // Always render the container (so the portal ref exists and the UI is inspectable)
                            // but only render skulls when deaths > 0
                                if (!deaths || deaths <= 0) return null;
                                return (
                                <div className="death-tracker" aria-label={tooltip}>
                                    {new Array(deaths).fill(0).map((_, idx) => (
                                        <div
                                            key={idx}
                                            className="death-skull-wrapper"
                                            tabIndex={0}
                                            title={tooltip}
                                            aria-label={tooltip}
                                            role="button"
                                            onClick={() => this.openCardDuel(idx)}
                                            style={{cursor: 'pointer'}}
                                        >
                                            <div className="death-skull" style={{backgroundImage: `url(${images['whiteskull']})`}}></div>
                                        </div>
                                    ))}
                                </div>
                            );
                        } catch (e) { return null; }
                    })()}
                    {this.state.toastMessage && <div className="dungeon-toast" style={{marginTop:8, padding:8, background:'#2b1b1b', color:'#f0d', borderRadius:4}}>{this.state.toastMessage}</div>}
                    {/* Quicklook Panel: crew-wide stats summary */}
                    {(() => {
                        const meta = getMeta() || {};
                        const crew = this.props.crewManager.crew || [];
                        const totalAtk = crew.reduce((sum, m) => sum + (m && m.stats && typeof m.stats.atk === 'number' ? m.stats.atk : 0), 0);
                        const totalDef = crew.reduce((sum, m) => sum + (m && m.stats && typeof m.stats.def === 'number' ? m.stats.def : 0), 0);
                        const food = typeof meta.food === 'number' ? meta.food : 55;
                        const foodLimit = this.getFoodLimit();
                        const isOverLimit = food > foodLimit;
                        const resolve = typeof meta.resolve === 'number' ? meta.resolve : 100;
                        return (
                            <div className="quicklook-panel">
                                <div className="ql-row"><span className="ql-label"><span role="img" aria-label="crossed swords">⚔</span> Attack</span><span className="ql-value">{totalAtk}</span></div>
                                <div className="ql-row"><span className="ql-label"><span role="img" aria-label="shield">🛡</span> Defense</span><span className="ql-value">{totalDef}</span></div>
                                <div className="ql-row"><span className="ql-label"><span role="img" aria-label="meat">🍖</span> Food</span><span className="ql-value" style={isOverLimit ? { color: '#e74c3c', fontWeight: 'bold' } : {}}>{food} / {foodLimit}</span></div>
                                <div className="ql-row"><span className="ql-label"><span role="img" aria-label="fist">✊</span> Resolve</span><span className="ql-value">{resolve}</span></div>
                            </div>
                        );
                    })()}
                    <div className="crew-tile-container">
                        {   this.props.crewManager.crew &&
                            this.props.crewManager.crew.map((member, i) => {
                                const isSelectedTile = this.state.selectedCrewMember && this.state.selectedCrewMember.id === member.id;
                                return <div className="sub-container" key={i}>
                                            { this.state.crewHoverMatrix[i] && <div className="hover-message">{this.state.crewHoverMatrix[i]}</div>}
                                            <Tile 
                                            key={i}
                                            id={i}
                                            tileSize={this.state.tileSize}
                                            image={member.image ? member.image : null}
                                            imageOverride={member.portrait ? member.portrait : null}
                                            contains={member.type}
                                            data={member}
                                            color={member.color}
                                            backgroundColor={hexToRgba(member.color, 0.5)}
                                            editMode={false}
                                            type={'crew-tile'}
                                            handleClick={this.handleMemberClick}
                                            handleHover={this.handleCrewTileHover}
                                            className={`crew-tile ${isSelectedTile ? 'selected' : 'unselected'}`}
                                            >
                                            </Tile>
                                        </div>
                            })
                        }
                    </div>
                    {/* Quick Actions — always-visible strip */}
                    <div className="quick-actions-strip">
                        {(() => {
                            const meta = getMeta() || {};
                            const camping = meta.camping;
                            if (camping) {
                                const start = meta.campingStart || '';
                                const end = meta.campingEnd || '';
                                const placeholderId = 'camp-progress-placeholder';
                                return (
                                    <div className="quick-actions-camping-container" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div className="crew-action-item action-row" style={{position:'relative', margin: 0}}>
                                            <div className="camp-label">
                                                <span style={{position: 'relative', zIndex: 2}}>Recuperating in Camp...</span>
                                                <div
                                                    id={placeholderId}
                                                    ref={el => this.placeholderRef(el, placeholderId, start, end)}
                                                    className={`progress-overlay camp-anim`}
                                                    data-start={start}
                                                    data-end={end}
                                                ></div>
                                                <div
                                                    onClick={() => this.endCamp()}
                                                    role="button"
                                                    aria-label="Close camp"
                                                    style={{position: 'absolute', right: 6, top: 2, cursor: 'pointer', fontWeight: 700, zIndex: 3}}
                                                >
                                                    ×
                                                </div>
                                            </div>
                                        </div>
                                        <div className="quick-actions-btns" style={{ gap: '2px' }}>
                                            <button
                                                className="quick-action-btn"
                                                onClick={() => this.handleOpenCampPopup()}
                                                title="Go to Camp"
                                            >
                                                <span><span role="img" aria-label="camp">🏕</span> Go To Camp</span>
                                                <span className="hotkey-indicator">C</span>
                                            </button>
                                            <button
                                                className="quick-action-btn"
                                                onClick={() => this.setState({ showCodex: true })}
                                                title="Open the Codex"
                                            >
                                                <span><span role="img" aria-label="codex">📖</span> Codex</span>
                                                <span className="hotkey-indicator">X</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            }
                            return (
                                <div className="quick-actions-btns">
                                    <button
                                        className="quick-action-btn"
                                        onClick={() => this.handleOpenCampPopup()}
                                        title="Go to Camp"
                                    >
                                        <span><span role="img" aria-label="camp">🏕</span> Go To Camp</span>
                                        <span className="hotkey-indicator">C</span>
                                    </button>
                                    <button
                                        className="quick-action-btn"
                                        onClick={() => this.setUpCamp()}
                                        title="Immediately begin recuperating"
                                    >
                                        <span><span role="img" aria-label="recuperate">🛌</span> Recuperate</span>
                                        <span className="hotkey-indicator">R</span>
                                    </button>
                                    <button
                                        className="quick-action-btn"
                                        onClick={() => {
                                            this.setState({ isCardScrimmage: true }, () => {
                                                this.openCardDuel(null);
                                            });
                                        }}
                                        title="Play a practice card duel (no penalty)"
                                    >
                                        <span><span role="img" aria-label="card">🃏</span> Card Scrimmage</span>
                                        <span className="hotkey-indicator">S</span>
                                    </button>
                                    <button
                                        className="quick-action-btn"
                                        onClick={() => this.setState({ showCodex: true })}
                                        title="Open the Codex"
                                    >
                                        <span><span role="img" aria-label="codex">📖</span> Codex</span>
                                        <span className="hotkey-indicator">X</span>
                                    </button>
                                    {this.state.campWarningMessage && (
                                        <div style={{paddingLeft: 4, fontSize: 11, color: '#e74c3c', lineHeight: 1.4}}>
                                            {this.state.campWarningMessage}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    {/* ── Points of Interest panel ─────────────────────────────── */}
                    <div className="poi-panel">
                        {/* Toggle button: open eye = visible, closed eye = collapsed */}
                        <button
                            className="poi-toggle-btn"
                            onClick={() => this.setState(s => ({ poiPanelExpanded: !s.poiPanelExpanded }))}
                            title={this.state.poiPanelExpanded ? 'Hide nearby points of interest' : 'Show nearby points of interest'}
                        >
                            <img
                                src={this.state.poiPanelExpanded ? images['eye_open'] : images['eye_closed']}
                                alt={this.state.poiPanelExpanded ? 'Hide POI' : 'Show POI'}
                                className="poi-eye-icon"
                            />
                        </button>

                        {this.state.poiPanelExpanded && (() => {
                            // Use the live boardManager tiles (indexed array, not state copy)
                            const bm = this.props.boardManager;
                            const liveTiles = (bm && bm.tiles) ? bm.tiles : (this.state.tiles || []);

                            // Resolve player position from live board manager location (falling back to meta)
                            const meta = getMeta() || {};
                            const playerTileIndex = (bm && bm.playerTile && bm.playerTile.location)
                                ? bm.getIndexFromCoordinates(bm.playerTile.location)
                                : (meta.location && meta.location.tileIndex != null ? meta.location.tileIndex : null);
                            const playerCoords = (playerTileIndex !== null && bm && typeof bm.getCoordinatesFromIndex === 'function')
                                ? bm.getCoordinatesFromIndex(playerTileIndex)
                                : null; // [x, y]

                            // Gate type names — boardManager returns the subtype directly for gates
                            const GATE_TYPES = new Set([
                                'gate', 'dungeon_door', 'gryphon_gate', 'bat_gate', 'evil_gate',
                                'minor_gate', 'major_gate', 'treasury_gate', 'imperial_gate',
                                'necrotic_gate', 'master_necrotic_gate', 'dimensional_gate',
                                'cyan_gate', 'violet_gate', 'rubicund_gate',
                            ]);

                            // Chests are stored as type='item' with a chest subtype
                            const CHEST_SUBTYPES = new Set([
                                'silver_chest', 'gold_chest', 'ornate_chest',
                                'wooden_chest', 'iron_chest', 'steel_chest',
                                'gilded_casket', 'ancient_casket', 'treasury_chest', 'cryptic_chest',
                            ]);

                            const NOTABLE_TYPES = new Set([
                                'monster', 'chest', 'item', 'shop', 'vendor', 'shrine', 'portal',
                                'boss', 'npc', 'well', 'altar', 'trap', 'treasure',
                                'campfire', 'camp', 'artifact', 'event', 'dungeon_entrance',
                                'spawn', 'narrative', 'lore_tablet', 'spell',
                                'dungeon_portal', 'dungeon portal',
                                ...GATE_TYPES,
                            ]);

                            const MAX_DIST = 6; // Chebyshev distance in grid units

                            // ── Codex deep-link lookup ─────────────────────────
                            // Maps a POI type (or subtype) to a { tab, entryId, search } object.
                            // Add an entry here whenever a new INTERACTABLE id is added to CodexModal.
                            const POI_CODEX_MAP = {
                                // vendors
                                vendor: { tab: 'interactables', entryId: 'merchant', search: 'merchant' },
                                shop:   { tab: 'interactables', entryId: 'merchant', search: 'merchant' },
                                merchant:  { tab: 'interactables', entryId: 'merchant', search: 'merchant' },
                                alchemist: { tab: 'interactables', entryId: 'alchemist', search: 'alchemist' },
                                // gates
                                minor_gate:        { tab: 'interactables', entryId: 'minor_gate',        search: 'minor gate' },
                                major_gate:        { tab: 'interactables', entryId: 'major_gate',        search: 'major gate' },
                                treasury_gate:     { tab: 'interactables', entryId: 'treasury_gate',     search: 'treasury gate' },
                                necrotic_gate:     { tab: 'interactables', entryId: 'necrotic_gate',     search: 'necrotic gate' },
                                dimensional_gate:  { tab: 'interactables', entryId: 'dimensional_gate',  search: 'dimensional gate' },
                                // chests
                                silver_chest:  { tab: 'interactables', entryId: 'chest_silver', search: 'silver chest' },
                                gold_chest:    { tab: 'interactables', entryId: 'chest_gold',   search: 'gold chest' },
                                ornate_chest:  { tab: 'interactables', entryId: 'chest_ornate', search: 'ornate chest' },
                                wooden_chest:  { tab: 'interactables', entryId: 'chest_silver', search: 'chest' },
                                iron_chest:    { tab: 'interactables', entryId: 'chest_silver', search: 'chest' },
                                steel_chest:   { tab: 'interactables', entryId: 'chest_gold',   search: 'chest' },
                                gilded_casket: { tab: 'interactables', entryId: 'chest_ornate', search: 'ornate chest' },
                                ancient_casket:{ tab: 'interactables', entryId: 'chest_ornate', search: 'ornate chest' },
                                treasury_chest:{ tab: 'interactables', entryId: 'chest_ornate', search: 'ornate chest' },
                                cryptic_chest: { tab: 'interactables', entryId: 'chest_ornate', search: 'ornate chest' },
                                // navigation
                                stairs:       { tab: 'interactables', entryId: 'stairs_down', search: 'stairs' },
                                dungeon_portal:  { tab: 'interactables', entryId: 'dungeon_portal', search: 'teleporter' },
                                'dungeon portal':{ tab: 'interactables', entryId: 'dungeon_portal', search: 'teleporter' },
                                // lore / narrative
                                narrative:    { tab: 'interactables', entryId: 'narrative',    search: 'narrative' },
                                lore_tablet:  { tab: 'interactables', entryId: 'lore_tablet',  search: 'lore tablet' },
                                // spawn
                                spawn:        { tab: 'interactables', entryId: 'spawn_point',  search: 'spawn' },
                                // misc
                                camp:     { tab: 'interactables', entryId: 'camp',     search: 'camp' },
                                campfire: { tab: 'interactables', entryId: 'camp',     search: 'camp' },

                                shrine:   { tab: 'interactables', entryId: 'shrine',   search: 'shrine' },
                            };

                            // Returns codex entry params for a given type+subtype, or null
                            const getCodexEntry = (type, subtype) => {
                                // Monsters → navigate to Monsters tab and search by name
                                if (type === 'monster' && subtype) {
                                    return { tab: 'monsters', entryId: null, search: subtype };
                                }
                                if (type === 'monster') {
                                    return { tab: 'monsters', entryId: null, search: '' };
                                }
                                // For types where the type alone is enough (spawn, shrines, etc.)
                                // check type first to avoid accidental subtype collision
                                if (POI_CODEX_MAP[type]) {
                                    // For chests and gates, subtype is more specific — prefer subtype
                                    if ((type === 'item' || type === 'chest' || GATE_TYPES.has(type)) && POI_CODEX_MAP[subtype]) {
                                        return POI_CODEX_MAP[subtype];
                                    }
                                    return POI_CODEX_MAP[type];
                                }
                                return POI_CODEX_MAP[subtype] || null;
                            };

                            const openPoiCodex = (type, subtype) => {
                                const entry = getCodexEntry(type, subtype);
                                if (entry) {
                                    this.setState({
                                        showCodex: true,
                                        codexEntry: entry,
                                    });
                                } else {
                                    this.setState({ noCodexEntry: true });
                                }
                            };

                            // Mirror boardManager.getContainsType: for gate objects, return the subtype
                            const getType = (contains) => {
                                if (!contains) return null;
                                if (typeof contains === 'object') {
                                    if (contains.type === 'gate' && contains.subtype) return contains.subtype;
                                    return contains.type || null;
                                }
                                return contains; // string legacy
                            };
                            const getSubtype = (contains) => {
                                if (!contains) return null;
                                if (typeof contains === 'object') return contains.subtype || null;
                                return null;
                            };

                            const poi = liveTiles.filter((t, idx) => {
                                if (!t) return false;
                                // Skip fogged tiles
                                if (t.color === 'black' || t.fog === true) return false;
                                const type = getType(t.contains);
                                if (!type || !NOTABLE_TYPES.has(type)) return false;
                                // Distance filter using tile index → grid coords
                                if (playerCoords && bm && typeof bm.getCoordinatesFromIndex === 'function') {
                                    const tileId = t.id != null ? t.id : idx;
                                    const tc = bm.getCoordinatesFromIndex(tileId);
                                    const chebyshev = Math.max(
                                        Math.abs(tc[0] - playerCoords[0]),
                                        Math.abs(tc[1] - playerCoords[1])
                                    );
                                    return chebyshev <= MAX_DIST;
                                }
                                return true;
                            });

                            // Deduplicate multi-tile structures (e.g. a 2×2 vendor
                            // occupies 4 tiles all with the same type+subtype+image).
                            // Keep only the first tile for each unique combination.
                            const seenPoi = new Set();
                            const basePoi = poi.filter(t => {
                                const type    = getType(t.contains);
                                const subtype = getSubtype(t.contains);
                                const key = `${type}|${subtype || ''}|${t.image || ''}`;
                                if (seenPoi.has(key)) return false;
                                seenPoi.add(key);
                                return true;
                            });

                            const lootPoiList = (this.state.activeChestLoot || []).map((loot, idx) => {
                                const lootType = loot.type === 'currency' ? 'currency' : 'item';
                                return {
                                    id: loot.id || ('loot_' + idx),
                                    image: loot.icon,
                                    contains: {
                                        type: lootType,
                                        subtype: loot.name
                                    },
                                    color: 'gold',
                                    isLoot: true
                                };
                            });

                            const uniquePoi = [...basePoi, ...lootPoiList];

                            if (uniquePoi.length === 0) {
                                return (
                                    <div className="poi-empty">
                                        <span>Nothing notable nearby</span>
                                    </div>
                                );
                            }

                            return (
                                <div className="poi-list">
                                    {uniquePoi.map((t, i) => {
                                        const type = getType(t.contains);
                                        const subtype = getSubtype(t.contains);
                                        const isShrine = type === 'shrine';

                                        if (isShrine) {
                                            // Shrine: building image + class portrait side-by-side
                                            const shrineImg = images['shrine'] || null;
                                            // subtype is the class key (e.g. 'wizard', 'ranger', 'barbarian')
                                            const classPortrait = subtype
                                                ? (images[subtype + '_portrait'] || images[subtype] || null)
                                                : null;
                                            const label = subtype
                                                ? `${subtype.replace(/_/g, ' ')} Shrine`
                                                : 'Shrine';
                                            return (
                                                <div
                                                    key={i}
                                                    className="poi-portrait-card poi-shrine-card"
                                                    style={{ cursor: 'pointer' }}
                                                    title="Click to open Codex"
                                                    onClick={() => openPoiCodex(type, subtype)}
                                                >
                                                    <div className="poi-shrine-images">
                                                        <div className="poi-shrine-half">
                                                            {shrineImg
                                                                ? <img src={shrineImg} alt="Shrine" className="poi-shrine-img" />
                                                                : <div className="poi-portrait-placeholder" />
                                                            }
                                                        </div>
                                                        <div className="poi-shrine-half">
                                                            {classPortrait
                                                                ? <img src={classPortrait} alt={subtype} className="poi-shrine-img" />
                                                                : <div className="poi-portrait-placeholder" />
                                                            }
                                                        </div>
                                                    </div>
                                                    <div className="poi-portrait-name">{label}</div>
                                                </div>
                                            );
                                        }

                                        // Classify for card theming
                                        const isChest    = type === 'chest' || (type === 'item' && CHEST_SUBTYPES.has(subtype));
                                        const isGate     = GATE_TYPES.has(type);
                                        const isVendor   = type === 'vendor' || type === 'shop';
                                        const isNarrative = type === 'narrative' || type === 'lore_tablet';
                                        const isSpawn    = type === 'spawn';
                                        const isPortal   = type === 'dungeon_portal' || type === 'dungeon portal';
                                        // Image: prefer tile.image (already resolved by boardManager)
                                        const icon = t.image
                                            ? (images[t.image] || t.image)
                                            : (images[subtype] || images[type] || null);
                                        const label = isGate
                                            ? (type || 'Gate').replace(/_/g, ' ')
                                            : isSpawn
                                                ? 'Spawn Point'
                                                : isPortal
                                                    ? 'Teleporter'
                                                    : isNarrative
                                                        ? (subtype ? subtype.replace(/_/g, ' ') : 'Narrative')
                                                        : t.isLoot
                                                            ? subtype
                                                            : subtype
                                                                ? subtype.replace(/_/g, ' ')
                                                                : (type ? type.replace(/_/g, ' ') : 'Unknown');
                                        const cardClass = isChest     ? ' poi-chest-card'
                                            : isGate      ? ' poi-gate-card'
                                            : isVendor    ? ' poi-vendor-card'
                                            : isNarrative ? ' poi-narrative-card'
                                            : isSpawn     ? ' poi-spawn-card'
                                            : isPortal    ? ' poi-portal-card'
                                            : t.isLoot    ? ' poi-loot-card'
                                            : '';
                                        return (
                                            <div
                                                key={t.id || i}
                                                className={`poi-portrait-card${cardClass} ${t.isLoot && this.state.chestLootFadeOut ? 'fade-out' : ''}`}
                                                style={{ cursor: t.isLoot ? 'default' : 'pointer' }}
                                                title={t.isLoot ? undefined : "Click to open Codex"}
                                                onClick={t.isLoot ? undefined : () => openPoiCodex(type, subtype)}
                                            >
                                                <div className="poi-portrait-img-wrap">
                                                    {icon
                                                        ? <img src={icon} alt={label} className="poi-portrait-img" />
                                                        : <div className="poi-portrait-placeholder" />
                                                    }
                                                </div>
                                                <div className="poi-portrait-name">{label}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                    {/* ── /Points of Interest panel ───────────────────────────── */}

                </div>
                <div className="expand-collapse-button icon-container" onClick={this.toggleRightSidePanel}>
                    <CIcon icon={cilCaretLeft} className={`expand-icon ${this.state.rightPanelExpanded ? 'expanded' : ''}`} size="sm"/>
                </div>
            </div>
            {this.state.currentBoard && <div className="info-panel">{this.props.boardManager.currentBoard.name}</div>}
            {this.state.inMonsterBattle === false && <div style={{
                    opacity: this.state.tiles.length > 0 ? 1 : 0,
                    transition: 'opacity 1s'
                    }} className={`center-board-wrapper ${this.state.minimapPlaceMapMarkerStarted ? 'show-map-marker-cursor' : ''}`}>
                <div className="board-hud-row">
                    <div className="respawn-message-container" style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                            <div style={{width: 10, height: 10, borderRadius: 10, background: 'red'}}></div>
                            <div style={{fontSize: 12}}>{this.state.timeToRespawn}</div>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                            <div style={{width: 10, height: 10, borderRadius: 10, background: 'gold'}}></div>
                            <div style={{fontSize: 12}}>{this.state.itemTimeToRespawn}</div>
                        </div>
                    </div>
                    <div className="message-container" style={{opacity: this.state.showMessage ? 1 : 0, transition: 'opacity 0.5s'}}>
                        {this.state.messageToDisplay}
                    </div>
                </div>
                <div className={`dungeon-board-container ${this.state.portalTransitionClass || ''}`} style={{
                    position: 'relative',
                    width: this.state.boardSize + 'px',
                    height: this.state.boardSize + 'px'
                }}>
                    <div  className="overlay-board" style={{
                        width: this.state.boardSize+'px', height: this.state.boardSize+ 'px',
                        backgroundColor: 'transparent',
                        pointerEvents: this.state.minimapPlaceMapMarkerStarted ? 'auto' : 'none'
                        }}>
                        {this.state.overlayTiles && this.state.overlayTiles.map((tile, i) => {
                            let overlayImage = tile.image ? tile.image : null;
                            return <Tile 
                            key={i}
                            id={i}
                            cursor={this.state.minimapPlaceMapMarkerStarted ? 'crosshair' : 'default'}
                            tileSize={this.state.tileSize}
                            image={overlayImage}
                            imageOverride={overlayImage && overlayImage.includes('/') ? overlayImage : null}
                            contains={tile.contains}
                            boardTiles={this.state.tiles}
                            terrain={tile.terrain}
                            color={tile.color && tile.color !== 'null' && tile.color !== 'undefined' ? tile.color : '#6b6057'}
                            borders={tile.borders}
                            partialObscured={!!tile.partialObscured}
                            coordinates={tile.coordinates}
                            index={tile.id}
                            editMode={false}
                            handleHover={this.handleOverlayHover}
                            type={'overlay-tile'}
                            passThrough={!this.state.minimapPlaceMapMarkerStarted}
                            handleClick={(e)=>this.handleOverlayClick}
                            // For overlay tiles we want the background color to reflect overlay state (e.g. edge indicator)
                            backgroundColor={tile.color && tile.color !== 'null' ? tile.color : (this.state.overlayHoveredTileId === i && this.state.minimapPlaceMapMarkerStarted ? 'rgba(100, 100, 38, 0.272)' : 'transparent')}
                            >
                            </Tile>
                        })}
                    </div>
                    <div  className="board" style={{
                        width: this.state.boardSize+'px', height: this.state.boardSize+ 'px',
                        backgroundColor: 'white'
                        }}>
                        {this.state.tiles && this.state.tiles.map((tile, i) => {
                            let boardImage = tile.image ? tile.image : (tile.icon ? tile.icon : null);
                            return <Tile 
                            key={i}
                            cursor={this.state.minimapPlaceMapMarkerStarted ? 'crosshair' : 'default'}
                            tileSize={this.state.tileSize}
                            image={boardImage}
                            imageOverride={boardImage && boardImage.includes ? (boardImage.includes('/') ? boardImage : null) : null}
                            contains={tile.contains}
                            boardTiles={this.state.tiles}
                            terrain={tile.terrain}
                            color={tile.color && tile.color !== 'null' && tile.color !== 'undefined' ? tile.color : '#6b6057'}
                            borders={tile.borders}
                            inscriptions={tile.inscriptions}
                            partialObscured={!!tile.partialObscured}
                            trapRevealed={!!tile.trapRevealed}
                            coordinates={tile.coordinates}
                            index={tile.id}
                            showCoordinates={this.props.showCoordinates}
                            editMode={false}
                            handleHover={this.handleHover}
                            type={tile.type}
                            handleClick={this.handleClick}
                            >
                            </Tile>
                        })}
                    </div>
                    {/* Floating player overlay element - positioned absolutely within board wrapper */}
                    {this.state.playerFloatVisible && (
                        <div
                            ref={this.playerFloatRef}
                            className="floating-player"
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                left: this.state.playerFloatStyle.left,
                                top: this.state.playerFloatStyle.top,
                                width: this.state.tileSize,
                                height: this.state.tileSize,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                pointerEvents: 'none',
                                transform: this.state.playerFloatStyle.transform,
                                zIndex: 5,
                                backgroundImage: this.state.playerFloatStyle.backgroundImage
                            }}
                        />
                    )}
                    {/* Chest loot radial arc overlay */}
                    {this.state.chestLootVisible && this.state.activeChestLoot.length > 0 && (
                        <div
                            className="chest-loot-overlay"
                            style={{
                                position: 'absolute',
                                left: this.state.chestLootStyle ? this.state.chestLootStyle.left : this.state.playerFloatStyle.left,
                                top: this.state.chestLootStyle ? this.state.chestLootStyle.top : this.state.playerFloatStyle.top,
                                width: this.state.tileSize,
                                height: this.state.tileSize,
                                transform: this.state.chestLootStyle ? this.state.chestLootStyle.transform : this.state.playerFloatStyle.transform,
                                pointerEvents: 'none',
                                zIndex: 6
                            }}
                        >
                            {this.state.activeChestLoot.map((loot, idx) => {
                                const total = this.state.activeChestLoot.length;
                                const radius = this.state.tileSize * 0.9;
                                let angle = -90;
                                if (total > 1) {
                                    const arcSpan = 100;
                                    const startAngle = -90 - arcSpan / 2;
                                    const step = arcSpan / (total - 1);
                                    angle = startAngle + idx * step;
                                }
                                const rad = (angle * Math.PI) / 180;
                                const x = Math.cos(rad) * radius;
                                const y = Math.sin(rad) * radius;
                                
                                const centerOffset = this.state.tileSize / 2;
                                const lootSize = this.state.tileSize * 0.6;
                                
                                const left = centerOffset + x - lootSize / 2;
                                const top = centerOffset + y - lootSize / 2;
                                
                                let iconUrl = loot.icon;
                                if (iconUrl && typeof iconUrl === 'object') {
                                    iconUrl = iconUrl.default || iconUrl;
                                }
                                if (iconUrl && typeof iconUrl === 'object') {
                                    iconUrl = iconUrl.default || '';
                                }
                                if (typeof iconUrl !== 'string') {
                                    iconUrl = '';
                                }
                                
                                return (
                                    <div
                                        key={loot.id}
                                        className={`chest-loot-item ${this.state.chestLootFadeOut ? 'fade-out' : 'fade-in'}`}
                                        style={{
                                            position: 'absolute',
                                            left: left,
                                            top: top,
                                            width: lootSize,
                                            height: lootSize,
                                            backgroundImage: `url("${iconUrl}")`,
                                            backgroundSize: '70% 70%',
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'center',
                                            filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))'
                                        }}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>}
            
            
            {/* /// ANIMATION GRID ///  */}
            {/* { this.state.keysLocked && 
                <AnimationGrid
                        animationManager={this.props.animationManager}
                        tileProps={{
                            TILE_SIZE,
                            MAX_DEPTH,
                            SHOW_TILE_BORDERS,
                            MAX_ROWS
                        }}
                ></AnimationGrid>
            } */}


            { this.state.keysLocked && this.state.inMonsterBattle &&
            <MonsterBattle
                ref={this.monsterBattleComponentRef}
                combatManager={this.reduxCombatManager || this.props.combatManager}
                overlayManager={this.props.overlayManager}
                inventoryManager={this.props.inventoryManager}
                animationManager={this.props.animationManager}
                crewManager={this.props.crewManager}
                crew={this.props.crewManager.crew}
                monster={this.state.monster}
                minions={this.state.minions}
                battleOver={this.battleOver}
                paused={this.state.paused}
                setNarrativeSequence={this.props.setNarrativeSequence}
                useConsumableFromInventory={this.useConsumableFromInventory}
                onFighterUpdate={this.handleFighterUpdateFromBattle}
                onDeathTrackerChanged={this.handleDeathTrackerChanged}
                onTriggerLootArc={this.triggerLootRadialArc}
                saveUserData={this.props.saveUserData}
            ></MonsterBattle>}

            {this.state.inTowerSiege && (
                <TowerSiege
                    combatManager={this.reduxCombatManager}
                    animationManager={this.props.animationManager}
                    overlayManager={this.props.overlayManager}
                    crew={this.props.crewManager.crew}
                    monsterManager={this.props.monsterManager}
                    onSiegeComplete={this.onSiegeComplete}
                    paused={this.state.paused}
                />
            )}

            {/* Shrine Screen — full-screen cinematic shrine encounter */}
            {this.state.inShrineScreen && this.state.shrineData && (
                <ShrineScreen
                    shrineData={this.state.shrineData}
                    crew={(this.props.crewManager && this.props.crewManager.crew) || []}
                    monsterManager={this.props.monsterManager}
                    onShrineComplete={this.onShrineComplete}
                    overlayManager={this.props.overlayManager}
                    animationManager={this.props.animationManager}
                />
            )}

            <CModal className={`inventory-modal ${this.state.isInventoryExpanded ? 'expanded' : ''}`} alignment='center' visible={this.state.showInventoryPopup} onClose={() => this.setState({ showInventoryPopup: false, isInventoryExpanded: false })}>
                <div className='inventory-content'>
                    <div className='inventory-header'>
                        <div className='inventory-title'>Inventory</div>
                        {this.props.inventoryManager && this.props.inventoryManager.gold > 0 && (
                            <div className='inventory-gold'>
                                <div className='gold-readout'>Gold: {this.props.inventoryManager.gold}</div>
                            </div>
                        )}
                    </div>
                    <div className={`inventory-body-container ${this.state.isInventoryExpanded ? 'expanded' : ''}`}>
                        <div className="inventory-main-column">
                            <div className='crew-panels'>
                                {(() => {
                                    // In expanded mode show only the selected crew member so the
                                    // body diagram fills and centres the left column.
                                    // Tab cycling (cycleSelectedCrewMember) already updates
                                    // this.state.selectedCrewMember, so the view follows automatically.
                                    const allCrew = (this.props.crewManager && this.props.crewManager.crew) || [];
                                    const visibleCrew = this.state.isInventoryExpanded
                                        ? (() => {
                                            const sel = allCrew.find(
                                                m => m && this.state.selectedCrewMember && m.id === this.state.selectedCrewMember.id
                                            );
                                            return sel ? [sel] : allCrew.slice(0, 1);
                                          })()
                                        : allCrew;
                                    return visibleCrew;
                                })().map((member, idx) => {
                                    let rawPortrait = member.portrait;
                                    if (rawPortrait && typeof rawPortrait === 'object') {
                                        rawPortrait = rawPortrait.default || rawPortrait;
                                    }
                                    if (rawPortrait && typeof rawPortrait === 'object') {
                                        rawPortrait = rawPortrait.default || '';
                                    }
                                    const portraitUrl = (typeof rawPortrait === 'string' && images && images[rawPortrait])
                                        ? (images[rawPortrait].default || images[rawPortrait])
                                        : rawPortrait;
                                    const isSelected = this.state.selectedCrewMember && this.state.selectedCrewMember.id === member.id;
                                    return (
                                        <div className='crew-panel' key={member.id || idx}>
                                            <div
                                                className='crew-portrait'
                                                style={{
                                                    backgroundImage: `url(${portraitUrl})`,
                                                    border: isSelected ? '3px solid lightgreen' : '3px solid transparent',
                                                    boxSizing: 'border-box',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                {/* HP Bar overlay at the bottom of the portrait */}
                                                <div 
                                                    style={{
                                                        position: 'absolute',
                                                        bottom: 0,
                                                        left: 0,
                                                        width: '100%',
                                                        height: '6px',
                                                        background: 'rgba(0,0,0,0.5)',
                                                        zIndex: 5
                                                    }}
                                                >
                                                    <div 
                                                        style={{
                                                            width: `${Math.max(0, Math.min(100, ((member.hp || 0) / ((member.stats && typeof member.stats.hp === 'number' ? member.stats.hp : member.hp) || 1)) * 100))}%`,
                                                            height: '100%',
                                                            background: 'linear-gradient(90deg, #10b981, #34d399)',
                                                            transition: 'width 1.1s linear'
                                                        }}
                                                    />
                                                </div>

                                                {/* Dead unit dark overlay with smooth fade out during camping */}
                                                {member.dead && (
                                                    <div 
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            background: 'black',
                                                            opacity: (() => {
                                                                const meta = getMeta() || {};
                                                                if (meta.camping && typeof meta.campElapsedSeconds === 'number' && typeof meta.campTotalSeconds === 'number') {
                                                                    const ratio = 1 - (meta.campElapsedSeconds / meta.campTotalSeconds);
                                                                    return Math.max(0, Math.min(0.8, 0.8 * ratio));
                                                                }
                                                                return 0.8;
                                                            })(),
                                                            transition: 'opacity 1.1s linear',
                                                            zIndex: 4,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: '#ef4444',
                                                            fontWeight: 'bold',
                                                            fontSize: '12px',
                                                            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                                                            pointerEvents: 'none'
                                                        }}
                                                    >
                                                        DEAD
                                                    </div>
                                                )}
                                            </div>
                                            <div className='crew-body' style={{
                                                pointerEvents: isSelected ? 'auto' : 'none',
                                                marginTop: '-16px'
                                            }}>
                                                <div className='crew-body-image' style={{backgroundImage: `url(${images.body_male})`}} />
                                                {/* equip slots: chest, right-hand, left-hand, head, and ancillary */}
                                                {(() => {
                                                    const findEquipped = (m, slot) => {
                                                        const slotsToCheck = (slot === 'pet' || slot === 'bottom-left') ? ['pet', 'bottom-left'] : [slot];
                                                        return (m.inventory || []).find(i => slotsToCheck.includes(i.equippedSlot));
                                                    };
                                                    const chest = findEquipped(member, 'chest');
                                                    const right = findEquipped(member, 'right');
                                                    const left = findEquipped(member, 'left');
                                                    const head = findEquipped(member, 'head');
                                                    const boots = findEquipped(member, 'boots');
                                                    const bottomLeft = findEquipped(member, 'pet');
                                                    const ancillaryLeft = findEquipped(member, 'ancillary-left');
                                                    const ancillaryRight = findEquipped(member, 'ancillary-right');
                                                    const regularSlotBorder = '2px solid rgba(205, 202, 202, 0.68)';
                                                    const selectedSlotBorder = '2px solid rgba(205, 202, 202, 1)';
                                                    const selectedEquippedSlotBorder = '2px solid rgb(164 234 199)';
                                                    const getSlotBorder = (equippedItem) => {
                                                        if (!isSelected) return regularSlotBorder;
                                                        return equippedItem ? selectedEquippedSlotBorder : selectedSlotBorder;
                                                    };
                                                    return (
                                                        <>
                                                            <div 
                                                                className='equip-slot slot-chest' 
                                                                style={{border: getSlotBorder(chest)}}
                                                                title={!chest ? SLOT_INFO['chest'].name : undefined}
                                                                onMouseEnter={() => !chest && isSelected ? this.setState({ hoveredSlotInfo: { name: SLOT_INFO['chest'].name, description: SLOT_INFO['chest'].desc } }) : null}
                                                                onMouseLeave={() => !chest && isSelected ? this.setState({ hoveredSlotInfo: null }) : null}
                                                            >
                                                                {chest && (
                                                                    <Tile
                                                                        id={chest.id}
                                                                        data={chest}
                                                                        tileSize={this.state.tileSize}
                                                                        image={chest.icon}
                                                                        contains={chest.name ? chest.name.replace(' ', '_') : null}
                                                                        color={chest.color}
                                                                        editMode={false}
                                                                        type={'inventory-tile'}
                                                                        handleClick={() => isSelected ? this.handleEquipmentItemClick(chest) : null}
                                                                        handleHover={this.handleInventoryTileHover}
                                                                    />
                                                                )}
                                                            </div>
                                                            <div 
                                                                className='equip-slot slot-right' 
                                                                style={{border: getSlotBorder(right)}}
                                                                title={!right ? SLOT_INFO['right'].name : undefined}
                                                                onMouseEnter={() => !right && isSelected ? this.setState({ hoveredSlotInfo: { name: SLOT_INFO['right'].name, description: SLOT_INFO['right'].desc } }) : null}
                                                                onMouseLeave={() => !right && isSelected ? this.setState({ hoveredSlotInfo: null }) : null}
                                                            >
                                                                {right && (
                                                                    <Tile
                                                                        id={right.id}
                                                                        data={right}
                                                                        tileSize={this.state.tileSize}
                                                                        image={right.icon}
                                                                        contains={right.name ? right.name.replace(' ', '_') : null}
                                                                        color={right.color}
                                                                        editMode={false}
                                                                        type={'inventory-tile'}
                                                                        handleClick={() => isSelected ? this.handleEquipmentItemClick(right) : null}
                                                                        handleHover={this.handleInventoryTileHover}
                                                                    />
                                                                )}
                                                            </div>
                                                            <div 
                                                                className='equip-slot slot-left' 
                                                                style={{border: getSlotBorder(left)}}
                                                                title={!left ? SLOT_INFO['left'].name : undefined}
                                                                onMouseEnter={() => !left && isSelected ? this.setState({ hoveredSlotInfo: { name: SLOT_INFO['left'].name, description: SLOT_INFO['left'].desc } }) : null}
                                                                onMouseLeave={() => !left && isSelected ? this.setState({ hoveredSlotInfo: null }) : null}
                                                            >
                                                                {left && (
                                                                    <Tile
                                                                        id={left.id}
                                                                        data={left}
                                                                        tileSize={this.state.tileSize}
                                                                        image={left.icon}
                                                                        contains={left.name ? left.name.replace(' ', '_') : null}
                                                                        color={left.color}
                                                                        editMode={false}
                                                                        type={'inventory-tile'}
                                                                        handleClick={() => isSelected ? this.handleEquipmentItemClick(left) : null}
                                                                        handleHover={this.handleInventoryTileHover}
                                                                    />
                                                                )}
                                                            </div>
                                                            <div 
                                                                className='equip-slot slot-head' 
                                                                style={{border: getSlotBorder(head)}}
                                                                title={!head ? SLOT_INFO['head'].name : undefined}
                                                                onMouseEnter={() => !head && isSelected ? this.setState({ hoveredSlotInfo: { name: SLOT_INFO['head'].name, description: SLOT_INFO['head'].desc } }) : null}
                                                                onMouseLeave={() => !head && isSelected ? this.setState({ hoveredSlotInfo: null }) : null}
                                                            >
                                                                {head && (
                                                                    <Tile
                                                                        id={head.id}
                                                                        data={head}
                                                                        tileSize={this.state.tileSize}
                                                                        image={head.icon}
                                                                        contains={head.name ? head.name.replace(' ', '_') : null}
                                                                        color={head.color}
                                                                        editMode={false}
                                                                        type={'inventory-tile'}
                                                                        handleClick={() => isSelected ? this.handleEquipmentItemClick(head) : null}
                                                                        handleHover={this.handleInventoryTileHover}
                                                                    />
                                                                )}
                                                            </div>
                                                            <div 
                                                                className='equip-slot slot-boots' 
                                                                style={{border: getSlotBorder(boots)}}
                                                                title={!boots ? SLOT_INFO['boots'].name : undefined}
                                                                onMouseEnter={() => !boots && isSelected ? this.setState({ hoveredSlotInfo: { name: SLOT_INFO['boots'].name, description: SLOT_INFO['boots'].desc } }) : null}
                                                                onMouseLeave={() => !boots && isSelected ? this.setState({ hoveredSlotInfo: null }) : null}
                                                            >
                                                                {boots && (
                                                                    <Tile
                                                                        id={boots.id}
                                                                        data={boots}
                                                                        tileSize={this.state.tileSize}
                                                                        image={boots.icon}
                                                                        contains={boots.name ? boots.name.replace(' ', '_') : null}
                                                                        color={boots.color}
                                                                        editMode={false}
                                                                        type={'inventory-tile'}
                                                                        handleClick={() => isSelected ? this.handleEquipmentItemClick(boots) : null}
                                                                        handleHover={this.handleInventoryTileHover}
                                                                    />
                                                                )}
                                                            </div>
                                                            <div 
                                                                className='equip-slot slot-ancillary-left' 
                                                                style={{border: getSlotBorder(ancillaryLeft)}}
                                                                title={!ancillaryLeft ? SLOT_INFO['ancillary-left'].name : undefined}
                                                                onMouseEnter={() => !ancillaryLeft && isSelected ? this.setState({ hoveredSlotInfo: { name: SLOT_INFO['ancillary-left'].name, description: SLOT_INFO['ancillary-left'].desc } }) : null}
                                                                onMouseLeave={() => !ancillaryLeft && isSelected ? this.setState({ hoveredSlotInfo: null }) : null}
                                                            >
                                                                {ancillaryLeft && (
                                                                    <Tile
                                                                        id={ancillaryLeft.id}
                                                                        data={ancillaryLeft}
                                                                        tileSize={this.state.tileSize}
                                                                        image={ancillaryLeft.icon}
                                                                        contains={ancillaryLeft.name ? ancillaryLeft.name.replace(' ', '_') : null}
                                                                        color={ancillaryLeft.color}
                                                                        editMode={false}
                                                                        type={'inventory-tile'}
                                                                        handleClick={() => isSelected ? this.handleEquipmentItemClick(ancillaryLeft) : null}
                                                                        handleHover={this.handleInventoryTileHover}
                                                                    />
                                                                )}
                                                            </div>
                                                            <div 
                                                                className='equip-slot slot-ancillary-right' 
                                                                style={{border: getSlotBorder(ancillaryRight)}}
                                                                title={!ancillaryRight ? SLOT_INFO['ancillary-right'].name : undefined}
                                                                onMouseEnter={() => !ancillaryRight && isSelected ? this.setState({ hoveredSlotInfo: { name: SLOT_INFO['ancillary-right'].name, description: SLOT_INFO['ancillary-right'].desc } }) : null}
                                                                onMouseLeave={() => !ancillaryRight && isSelected ? this.setState({ hoveredSlotInfo: null }) : null}
                                                            >
                                                                {ancillaryRight && (
                                                                    <Tile
                                                                        id={ancillaryRight.id}
                                                                        data={ancillaryRight}
                                                                        tileSize={this.state.tileSize}
                                                                        image={ancillaryRight.icon}
                                                                        contains={ancillaryRight.name ? ancillaryRight.name.replace(' ', '_') : null}
                                                                        color={ancillaryRight.color}
                                                                        editMode={false}
                                                                        type={'inventory-tile'}
                                                                        handleClick={() => isSelected ? this.handleEquipmentItemClick(ancillaryRight) : null}
                                                                        handleHover={this.handleInventoryTileHover}
                                                                    />
                                                                )}
                                                            </div>
                                                            <div 
                                                                className='equip-slot slot-pet' 
                                                                style={{border: getSlotBorder(bottomLeft)}}
                                                                title={!bottomLeft ? SLOT_INFO['pet'].name : undefined}
                                                                onMouseEnter={() => !bottomLeft && isSelected ? this.setState({ hoveredSlotInfo: { name: SLOT_INFO['pet'].name, description: SLOT_INFO['pet'].desc } }) : null}
                                                                onMouseLeave={() => !bottomLeft && isSelected ? this.setState({ hoveredSlotInfo: null }) : null}
                                                            >
                                                                {bottomLeft && (
                                                                    <>
                                                                        <Tile
                                                                            id={bottomLeft.id}
                                                                            data={bottomLeft}
                                                                            tileSize={this.state.tileSize}
                                                                            image={bottomLeft.icon}
                                                                            contains={bottomLeft.name ? bottomLeft.name.replace(' ', '_') : null}
                                                                            color={bottomLeft.color}
                                                                            editMode={false}
                                                                            type={'inventory-tile'}
                                                                            handleClick={() => isSelected ? this.handleEquipmentItemClick(bottomLeft) : null}
                                                                            handleHover={this.handleInventoryTileHover}
                                                                        />
                                                                        <div className="pet-overlay" aria-hidden="true">🐾</div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </>
                                                    )
                                                })()}
                                            </div>
                                            <div className="stats-display" style={{width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '8px', boxSizing: 'border-box', marginTop: '-38px', opacity: isSelected ? 1 : 0.5}}>
                                                {[
                                                    'attack',
                                                    'defense',
                                                    'speed',
                                                    'luck',
                                                    'willpower',
                                                    'hp',
                                                    'energy max',
                                                    'energy regeneration'
                                                ].map((key) => {
                                                    let value = 0;
                                                    try {
                                                        if (key === 'attack') value = (member && member.stats && typeof member.stats.atk === 'number') ? member.stats.atk : 0;
                                                        else if (key === 'defense') value = (member && member.stats && typeof member.stats.def === 'number') ? member.stats.def : 0;
                                                        else if (key === 'hp') value = (member && member.stats && typeof member.stats.hp === 'number') ? member.stats.hp : 0;
                                                    } catch (e) {}

                                                    // compute equipped weapon percent bonus (sum of equipped weapons)
                                                    let weaponPercent = 0;
                                                    let magicalWeaponBonus = 0;
                                                    // compute equipped armor percent bonus (sum of equipped armor pieces)
                                                    let armorPercent = 0;
                                                    try {
                                                        if (member && Array.isArray(member.inventory)) {
                                                            if (key === 'attack') {
                                                                const equippedWeapons = member.inventory.filter(i => i && i.type === 'weapon' && (i.equippedSlot === 'right' || i.equippedSlot === 'left' || i.equippedBy === member.id));
                                                                if (equippedWeapons.length) {
                                                                    weaponPercent = equippedWeapons.reduce((acc, w) => acc + (typeof w.damage === 'number' ? w.damage : 0), 0);
                                                                }
                                                                // Calculate magical weapon bonus (wands and staves multiply base attack)
                                                                const equippedMagicalWeapons = member.inventory.filter(i => 
                                                                    i && i.type === 'magical' && 
                                                                    (i.subtype === 'wand' || i.subtype === 'staff') && 
                                                                    (i.equippedSlot === 'right' || i.equippedSlot === 'left' || i.equippedBy === member.id)
                                                                );
                                                                if (equippedMagicalWeapons.length && value > 0) {
                                                                    magicalWeaponBonus = equippedMagicalWeapons.reduce((acc, w) => 
                                                                        acc + (typeof w.power === 'number' ? value * w.power : 0), 0
                                                                    );
                                                                }
                                                            }
                                                            if (key === 'defense') {
                                                                const equippedArmor = member.inventory.filter(i => i && i.type === 'armor' && (i.equippedSlot || i.equippedBy === member.id));
                                                                if (equippedArmor.length) {
                                                                    armorPercent = equippedArmor.reduce((acc, a) => acc + (typeof a.armor === 'number' ? a.armor : 0), 0);
                                                                }
                                                            }
                                                        }
                                                    } catch (e) { weaponPercent = 0; armorPercent = 0; magicalWeaponBonus = 0; }

                                                    return (
                                                        <div key={key} className="stat-line" style={{display: 'flex', justifyContent: 'space-between', width: '100%', padding: '2px 0'}}>
                                                            <span className="stat-name">{key === 'hp' ? 'hp max' : key}</span>
                                                            {key === 'attack' ? (
                                                                (() => {
                                                                    const percent = weaponPercent;
                                                                    const boosted = percent > 0 ? (value * (1 + percent / 100)) : null;
                                                                    const totalWithMagic = value + magicalWeaponBonus;
                                                                    return (
                                                                        <span className="stat-value" style={{display: 'flex', alignItems: 'center', gap: 6}}>
                                                                            {percent > 0 && (
                                                                                <span className="stat-percent">{`+${percent}%`}</span>
                                                                            )}
                                                                            <span className="stat-base">{value}</span>
                                                                            {magicalWeaponBonus > 0 && (
                                                                                <span className="stat-magical" style={{color: 'skyblue'}}>{`(+${magicalWeaponBonus})`}</span>
                                                                            )}
                                                                            {boosted !== null && (
                                                                                <span className="stat-boosted" style={{color: 'lightgreen'}}>{boosted.toFixed(2)}</span>
                                                                            )}
                                                                            {magicalWeaponBonus > 0 && (
                                                                                <span className="stat-total" style={{color: 'gold', fontWeight: 'bold'}}>{totalWithMagic}</span>
                                                                            )}
                                                                        </span>
                                                                    )
                                                                })()
                                                            ) : key === 'defense' ? (
                                                                (() => {
                                                                    const percent = armorPercent;
                                                                    const boosted = percent > 0 ? (value * (1 + percent / 100)) : null;
                                                                    return (
                                                                        <span className="stat-value" style={{display: 'flex', alignItems: 'center', gap: 6}}>
                                                                            {percent > 0 && (
                                                                                <span className="stat-percent">{`+${percent}%`}</span>
                                                                            )}
                                                                            <span className="stat-base">{value}</span>
                                                                            {boosted !== null && (
                                                                                <span className="stat-boosted" style={{color: 'lightgreen'}}>{boosted.toFixed(2)}</span>
                                                                            )}
                                                                        </span>
                                                                    )
                                                                })()
                                                            ) : (
                                                                <span className="stat-value">{value}</span>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="inventory-descriptor-panel">
                                {(() => {
                                    const item = this.state.hoveredInventoryItem;
                                    const slotInfo = this.state.hoveredSlotInfo;
                                    const iconImg = (() => {
                                        if (!item) return null;
                                        const raw = item.icon || item.iconUrl || item.image;
                                        if (!raw) return null;
                                        if (typeof raw === 'string' && (raw.startsWith('/') || raw.startsWith('http') || raw.startsWith('data:'))) {
                                            return raw;
                                        }
                                        return images[raw] || null;
                                    })();
                                    return (
                                        <div className="idp-content">
                                            {item && (
                                                <div className="idp-icon" style={{ position: 'relative', overflow: 'hidden' }}>
                                                    {item.type === 'soul_shard' ? (() => {
                                                        const monsterType = item.monsterType || '';
                                                        const mTypeLower = monsterType.toLowerCase();
                                                        const portraitUrl = images[monsterType] || images[mTypeLower] || images[`${mTypeLower}_portrait`] || images[`${mTypeLower}_portrait2`] || null;
                                                        return (
                                                            <>
                                                                {portraitUrl && (
                                                                    <div style={{
                                                                        position: 'absolute',
                                                                        top: 0, left: 0, right: 0, bottom: 0,
                                                                        backgroundImage: `url(${portraitUrl.default || portraitUrl})`,
                                                                        backgroundSize: 'cover',
                                                                        backgroundPosition: 'center',
                                                                        opacity: 0.5,
                                                                        zIndex: 1
                                                                    }} />
                                                                )}
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    top: 0, left: 0, right: 0, bottom: 0,
                                                                    backgroundImage: `url(${images['sould_shards'] || iconImg})`,
                                                                    backgroundSize: '80% 80%',
                                                                    backgroundPosition: 'center',
                                                                    backgroundRepeat: 'no-repeat',
                                                                    zIndex: 2
                                                                }} />
                                                            </>
                                                        );
                                                    })() : (
                                                        iconImg && <img src={iconImg} alt={item.name || ''} style={{ zIndex: 2 }} />
                                                    )}
                                                </div>
                                            )}
                                            <div className="idp-details">
                                                {!item && !slotInfo
                                                    ? <span className="idp-placeholder">Hover over an item to see details</span>
                                                    : slotInfo
                                                        ? <>
                                                            <div className="idp-name">{slotInfo.name}</div>
                                                            <div className="idp-description">{slotInfo.description}</div>
                                                          </>
                                                        : <>
                                                            <div className="idp-name">{item.name || '—'}</div>
                                                            <div className="idp-meta">
                                                                {item.subtype && <span className="idp-tag idp-subtype">{item.subtype}</span>}
                                                                {item.range && <span className="idp-tag idp-range">{item.range}</span>}
                                                            </div>
                                                            {this.buildItemSummaryDescription(item) && <div className="idp-description">{this.buildItemSummaryDescription(item)}</div>}
                                                        </>
                                                }
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                            {!this.state.isInventoryExpanded && (
                                <div className='inventory-strip-wrapper'>
                                    <div className='inventory-strip'>
                                        {(() => {
                                            const inv = this.getCombinedInventory();
                                            const grouped = {};
                                            inv.forEach((item, idx) => {
                                                const key = item.name || item.type || `item_${idx}`;
                                                if (!grouped[key]) grouped[key] = { items: [], firstIndex: idx };
                                                grouped[key].items.push(item);
                                            });

                                            return Object.keys(grouped).map((key, gIdx) => {
                                                const group = grouped[key];
                                                const count = group.items.length;
                                                const item = group.items[0];
                                                const isShardStack = item && item.shard === true && (item.type === 'jewel' || item.type === 'rune');
                                                const firstIndex = group.firstIndex;
                                                const stripKey = `${key}__${firstIndex}__${item?.icon || 'no_icon'}`;
                                                return (
                                                    <div className={`strip-item sub-container ${item.animation === 'consumed' ? 'consumed' : ''}`} key={stripKey} style={{position: 'relative'}}>
                                                        <div className="hover-message-container">
                                                            <div className="hover-message">{this.state.inventoryHoverMatrix[firstIndex] ? this.state.inventoryHoverMatrix[firstIndex].replaceAll('_', ' ') : '\u00A0'}</div>
                                                        </div>
                                                        <Tile
                                                            key={stripKey}
                                                            id={firstIndex}
                                                            data={item}
                                                            tileSize={this.state.tileSize}
                                                            image={item.icon && typeof item.icon === 'string' && !item.icon.includes('/') && !item.icon.startsWith('http') && !item.icon.startsWith('data:') ? item.icon : null}
                                                            imageOverride={item.icon && typeof item.icon === 'string' && (item.icon.includes('/') || item.icon.startsWith('http') || item.icon.startsWith('data:')) ? item.icon : null}
                                                            contains={item.name ? item.name.replace(' ', '_') : null}
                                                            color={item.color}
                                                            editMode={false}
                                                            type={'inventory-tile'}
                                                            handleClick={() => this.handleItemClick(item, firstIndex)}
                                                            handleHover={this.handleInventoryTileHover}
                                                            className={`inventory-tile ${this.state.activeInventoryItem?.id === firstIndex ? 'active' : ''}`}
                                                            isActiveInventory={this.state.activeInventoryItem?.id === firstIndex}
                                                        />
                                                        {(count > 1 || isShardStack) && item.type !== 'soul_shard' && (
                                                            <div className='stack-count-badge'>
                                                                {count}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })
                                        })()}
                                    </div>
                                    <button 
                                        className="inventory-toggle-expand-btn" 
                                        onClick={() => this.setState({ isInventoryExpanded: true })}
                                        title="Expand Inventory"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>

                        {this.state.isInventoryExpanded && (() => {
                            const inv = this.getCombinedInventory();
                            const categorized = {
                                'Weapons': {},
                                'Armor': {},
                                'Consumables': {},
                                'Magical': {},
                                'Materials & Jewels': {},
                                'Keys & Misc': {}
                            };

                            inv.forEach((item, idx) => {
                                if (!item) return;
                                const cat = this.getItemCategory(item);
                                const key = item.name || item.type || `item_${idx}`;
                                if (!categorized[cat][key]) {
                                    categorized[cat][key] = { items: [], firstIndex: idx };
                                }
                                categorized[cat][key].items.push(item);
                            });

                            return (
                                <div className="inventory-expanded-panel">
                                    <div className="expanded-panel-header">
                                        <div className="expanded-panel-title">All Items</div>
                                        <button 
                                            className="inventory-toggle-expand-btn" 
                                            onClick={() => this.setState({ isInventoryExpanded: false })}
                                            title="Collapse Inventory"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/>
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="expanded-categories-container">
                                        {Object.keys(categorized).map(category => {
                                            const categoryStacks = Object.values(categorized[category]);
                                            
                                            const minSlots = 8;
                                            const totalSlots = Math.max(minSlots, Math.ceil(categoryStacks.length / 8) * 8);
                                            const slots = [];
                                            for (let i = 0; i < totalSlots; i++) {
                                                if (i < categoryStacks.length) {
                                                    slots.push(categoryStacks[i]);
                                                } else {
                                                    slots.push(null);
                                                }
                                            }

                                            return (
                                                <div key={category} className="expanded-category-section">
                                                    <div className="category-header">{category}</div>
                                                    <div className="category-grid">
                                                        {slots.map((slotData, sIdx) => {
                                                            if (!slotData) {
                                                                return (
                                                                    <div key={`empty_${category}_${sIdx}`} className="empty-inventory-slot" />
                                                                );
                                                            }
                                                            const { items, firstIndex } = slotData;
                                                            const count = items.length;
                                                            const item = items[0];
                                                            const isShardStack = item && item.shard === true && (item.type === 'jewel' || item.type === 'rune');
                                                            const itemKey = `${item.name || item.type || 'item'}_${firstIndex}_${sIdx}`;
                                                            
                                                            return (
                                                                <div key={itemKey} className="expanded-item-slot-wrapper">
                                                                    <Tile
                                                                        id={firstIndex}
                                                                        data={item}
                                                                        tileSize={55}
                                                                        image={item.icon && typeof item.icon === 'string' && !item.icon.includes('/') && !item.icon.startsWith('http') && !item.icon.startsWith('data:') ? item.icon : null}
                                                                        imageOverride={item.icon && typeof item.icon === 'string' && (item.icon.includes('/') || item.icon.startsWith('http') || item.icon.startsWith('data:')) ? item.icon : null}
                                                                        contains={item.name ? item.name.replace(' ', '_') : null}
                                                                        color={item.color}
                                                                        editMode={false}
                                                                        type={'inventory-tile'}
                                                                        handleClick={() => this.handleItemClick(item, firstIndex)}
                                                                        handleHover={this.handleInventoryTileHover}
                                                                        className={`inventory-tile ${this.state.activeInventoryItem?.id === firstIndex ? 'active' : ''}`}
                                                                        isActiveInventory={this.state.activeInventoryItem?.id === firstIndex}
                                                                    />
                                                                    {(count > 1 || isShardStack) && item.type !== 'soul_shard' && (
                                                                        <div className='stack-count-badge'>
                                                                            {count}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </CModal>

            {/* Card duel fullscreen overlay - Rendered at root for clean stacking context */}
            {this.state.showCardDuelModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 1000000,
                    background: '#000',
                    overflow: 'hidden',
                    pointerEvents: 'auto'
                }}>
                    <CardDuel 
                        onFinish={this.handleCardDuelFinish} 
                        onClose={() => this.setState({ showCardDuelModal: false })}
                        saveUserData={this.props.saveUserData} 
                        inventoryManager={this.props.inventoryManager} 
                        scrimmage={!!this.state.isCardScrimmage}
                        crew={this.props.crewManager ? this.props.crewManager.crew : []}
                        meta={getMeta()}
                        dungeonDepth={(() => { try { const m = getMeta(); const lid = m && m.location && m.location.levelId; return lid != null ? Math.max(1, Number(lid)) : 1; } catch(e) { return 1; } })()}
                        isCombatLoss={this.state.cardDuelTileId === 'combat_loss'}
                    />
                </div>
            )}

            {/* Pyre & Echo Forge overlay */}
            {this.state.showCardForge && (
                <CardForge
                    crew={this.props.crewManager ? this.props.crewManager.crew : []}
                    meta={getMeta()}
                    highlightMonsterType={this.state.forgeHighlightMonsterType}
                    onClose={() => this.setState({ showCardForge: false, forgeHighlightMonsterType: null })}
                    onSave={(updatedMeta) => {
                        try { storeMeta(updatedMeta); } catch(e) {}
                        try { if (this.props.saveUserData) this.props.saveUserData(); } catch(e) {}
                        this.forceUpdate();
                    }}
                />
            )}

            {/* Custom context menu for weapon slots */}
            {this.state.contextMenu && this.state.contextMenu.visible && (
                <>
                    <div 
                        className="context-menu-backdrop"
                        style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            zIndex: 99998,
                            backgroundColor: 'transparent'
                        }}
                        onClick={() => this.setState({ contextMenu: { ...this.state.contextMenu, visible: false } })}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            this.setState({ contextMenu: { ...this.state.contextMenu, visible: false } });
                        }}
                    />
                    <div 
                        className="context-menu"
                        style={{
                            position: 'fixed',
                            top: this.state.contextMenu.y,
                            left: this.state.contextMenu.x,
                            zIndex: 99999,
                            backgroundColor: '#1a1a1a',
                            border: '1px solid #c9cac9',
                            borderRadius: '4px',
                            padding: '4px 0',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.7)',
                            fontFamily: 'Outfit, Inter, sans-serif',
                            fontSize: '13px',
                            color: '#eee',
                            minWidth: '180px',
                            userSelect: 'none'
                        }}
                    >
                        <div 
                            className="context-menu-item"
                            style={{
                                padding: '8px 16px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                                fontWeight: '500'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={() => {
                                this.handleEquipHighestAtkWeapon(this.state.contextMenu.slotName);
                                this.setState({ contextMenu: { ...this.state.contextMenu, visible: false } });
                            }}
                        >
                            Equip highest atk weapon
                        </div>
                    </div>
                </>
            )}

            {this.state.showDebugLevelUpScreen && this.state.debugLevelUpQueue.length > 0 && (
                <LevelUpScreen
                    queue={this.state.debugLevelUpQueue}
                    crewManager={this.props.crewManager}
                    inventoryManager={this.props.inventoryManager}
                    skillsMatrix={skillsMatrix}
                    onComplete={this.handleDebugLevelUpComplete}
                    onSave={() => { try { this.props.saveUserData && this.props.saveUserData(); } catch(e) {} }}
                />
            )}
            {/* Save Indicator */}
            <style>{`
                @keyframes save-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
            <div 
                style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    zIndex: 999999,
                    pointerEvents: 'none',
                    opacity: this.state.showSaveIndicator ? 1 : 0,
                    transform: this.state.showSaveIndicator ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.95)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backgroundColor: 'rgba(20, 20, 20, 0.9)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontFamily: 'Outfit, Inter, sans-serif'
                }}
            >
                {this.state.saveIndicatorText === 'Saving...' && (
                    <svg className="save-spinner" viewBox="0 0 24 24" style={{ width: '18px', height: '18px', animation: 'save-spin 1s linear infinite' }}>
                        <circle cx="12" cy="12" r="10" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="3" fill="none" />
                        <path d="M12 2 C 6.48 2 2 6.48 2 12" stroke="#4dabf7" strokeWidth="3" strokeLinecap="round" fill="none" />
                    </svg>
                )}
                {this.state.saveIndicatorText === 'Saved' && (
                    <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#40c057" />
                    </svg>
                )}
                {this.state.saveIndicatorText === 'Save Failed' && (
                    <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#fa5252" />
                    </svg>
                )}
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#f8f9fa', letterSpacing: '0.2px' }}>
                    {this.state.saveIndicatorText}
                </span>
            </div>
        </div>
        )
    }
}

export default DungeonPage;