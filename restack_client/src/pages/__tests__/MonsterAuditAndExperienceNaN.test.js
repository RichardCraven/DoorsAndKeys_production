import React from 'react';
import { render } from '@testing-library/react';
import { MonsterManager } from '../../utils/monster-manager';
import { CrewManager } from '../../utils/crew-manager';
import { BoardManager } from '../../utils/board-manager';
import { resolveMonsterPools } from '../../utils/cache-cleanup';
import { AnimatedXPBar } from '../sub-views/MonsterBattle';

describe('Monster Integrity and Experience NaN Hardening', () => {
    let mm;
    let cm;
    let bm;

    beforeEach(() => {
        mm = new MonsterManager();
        cm = new CrewManager();
        bm = new BoardManager();
        bm.monsterManager = mm;
        try {
            bm.knownMonsterKeys = Object.keys(mm.monsters || {});
        } catch (e) {
            bm.knownMonsterKeys = [];
        }
    });

    describe('MonsterManager Audit', () => {
        test('audit all monsters in MonsterManager for complete established properties', () => {
            const monsters = mm.monsters;
            const keys = Object.keys(monsters);
            expect(keys.length).toBeGreaterThan(0);

            const issues = [];

            keys.forEach(key => {
                const m = monsters[key];
                if (!m) {
                    issues.push(`Monster ${key} is null or undefined`);
                    return;
                }
                if (!m.type && !m.key) {
                    issues.push(`Monster ${key} is missing type and key`);
                }
                if (typeof m.level !== 'number' || !Number.isFinite(m.level) || m.level <= 0) {
                    issues.push(`Monster ${key} has invalid level: ${m.level}`);
                }
                if (typeof m.tier !== 'number' || !Number.isFinite(m.tier) || m.tier <= 0) {
                    issues.push(`Monster ${key} has invalid tier: ${m.tier}`);
                }
                if (!m.stats || typeof m.stats !== 'object') {
                    issues.push(`Monster ${key} is missing stats object`);
                } else {
                    if (typeof m.stats.hp !== 'number' || !Number.isFinite(m.stats.hp) || m.stats.hp <= 0) {
                        issues.push(`Monster ${key} has invalid stats.hp: ${m.stats.hp}`);
                    }
                    if (typeof m.stats.atk !== 'number' || !Number.isFinite(m.stats.atk)) {
                        issues.push(`Monster ${key} has invalid stats.atk: ${m.stats.atk}`);
                    }
                    if (typeof m.stats.def !== 'number' || !Number.isFinite(m.stats.def)) {
                        issues.push(`Monster ${key} has invalid stats.def: ${m.stats.def}`);
                    }
                    if (typeof m.stats.speed !== 'number' || !Number.isFinite(m.stats.speed)) {
                        issues.push(`Monster ${key} has invalid stats.speed: ${m.stats.speed}`);
                    }
                }
                if (!m.portrait) {
                    issues.push(`Monster ${key} is missing portrait`);
                }
                const hasName = (Array.isArray(m.monster_names) && m.monster_names.length > 0) || (typeof m.name === 'string' && m.name.length > 0) || (typeof m.lordName === 'string');
                if (!hasName) {
                    issues.push(`Monster ${key} is missing name / monster_names`);
                }
                if (!m.isSummoned && (!Array.isArray(m.skills) || m.skills.length === 0)) {
                    issues.push(`Monster ${key} is missing skills array`);
                }
            });

            expect(issues).toEqual([]);
        });

        test('getMonster resolves strings, objects, and tier placeholders with fully established properties', () => {
            // Standard string key
            const goblin = mm.getMonster('goblin');
            expect(goblin).toBeDefined();
            expect(goblin.level).toBeGreaterThan(0);
            expect(goblin.stats.hp).toBeGreaterThan(0);
            expect(goblin.name).toBeTruthy();
            expect(goblin.portrait).toBeDefined();

            // Object format
            const fromObj = mm.getMonster({ type: 'monster', subtype: 'skeleton' });
            expect(fromObj).toBeDefined();
            expect(fromObj.type).toBe('skeleton');
            expect(fromObj.level).toBe(3);

            // Nested object subtype
            const fromNestedObj = mm.getMonster({ type: 'monster', subtype: { type: 'goblin' } });
            expect(fromNestedObj).toBeDefined();
            expect(fromNestedObj.type).toBe('goblin_thief');

            // Tier placeholder string
            const fromTier = mm.getMonster('tier_2_monster');
            expect(fromTier).toBeDefined();
            expect(fromTier.tier).toBe(2);
            expect(fromTier.level).toBeGreaterThan(0);

            // Generic 'monster' fallback
            const fallback = mm.getMonster({ type: 'monster' });
            expect(fallback).toBeDefined();
            expect(fallback.level).toBeGreaterThan(0);
            expect(fallback.stats.hp).toBeGreaterThan(0);
            expect(fallback.name).toBeTruthy();
            expect(fallback.name).not.toBe('Monster');
        });
    });

    describe('Crew Experience and NaN Healing', () => {
        test('calculateExpPercentage returns finite number and heals NaN experience', () => {
            const member = {
                id: 'hero_1',
                name: 'Yu',
                level: 1,
                stats: {
                    experience: NaN
                }
            };
            cm.crew = [member];

            const pct = cm.calculateExpPercentage(member);
            expect(pct).toBe(0);
            expect(Number.isFinite(pct)).toBe(true);
            expect(Number.isNaN(member.stats.experience)).toBe(false);
            expect(member.stats.experience).toBe(0);
        });

        test('addExperience safely ignores NaN / null award and heals corrupted member stats', () => {
            const member = {
                id: 'hero_2',
                name: 'Icaron',
                level: 2,
                stats: {
                    experience: NaN
                }
            };
            cm.crew = [member];

            // Add NaN experience
            cm.addExperience([member], NaN);
            expect(Number.isFinite(member.stats.experience)).toBe(true);
            expect(member.stats.experience).toBeGreaterThanOrEqual(120); // Level 2 base exp in EXP_TABLE is 120

            // Normal add experience after healing
            cm.addExperience([member], 20);
            expect(Number.isFinite(member.stats.experience)).toBe(true);
            expect(member.stats.experience).toBe(140);

            const pct = cm.calculateExpPercentage(member);
            expect(Number.isFinite(pct)).toBe(true);
            expect(pct).toBeGreaterThan(0);
            expect(pct).toBeLessThanOrEqual(100);
        });
    });

    describe('BoardManager and Cache Cleanup Monster Tile Normalization', () => {
        test('resolveTierTile returns string subtype for monster tier placeholder, never an object', () => {
            const tileContains = { type: 'tier_1_monster' };
            const resolved = bm.resolveTierTile(tileContains);
            expect(resolved).toBeDefined();
            expect(resolved.type).toBe('monster');
            expect(typeof resolved.subtype).toBe('string');
            expect(resolved.subtype).not.toBe('[object Object]');
            expect(resolved.subtype).not.toBe('monster');
        });

        test('getContainsSubtype unwraps nested object subtype to string key', () => {
            const contains = { type: 'monster', subtype: { key: 'sobek', type: 'sobek' } };
            const sub = bm.getContainsSubtype(contains);
            expect(sub).toBe('sobek');
        });

        test('cleanupMalformedMonsterTiles fixes unhydrated monster shapes', () => {
            const board = {
                tiles: [
                    { id: 0, contains: 'monster' },
                    { id: 1, contains: { type: 'monster' } },
                    { id: 2, contains: { type: 'monster', subtype: { type: 'witch' } } },
                    { id: 3, contains: { type: 'monster', subtype: 'skeleton' } }
                ]
            };

            const changed = bm.cleanupMalformedMonsterTiles(board);
            expect(changed.length).toBeGreaterThanOrEqual(3);

            board.tiles.forEach(t => {
                expect(t.contains.type).toBe('monster');
                expect(typeof t.contains.subtype).toBe('string');
                expect(t.contains.subtype.length).toBeGreaterThan(0);
                expect(t.contains.subtype).not.toBe('monster');
                expect(t.contains.subtype).not.toBe('[object Object]');
            });
        });

        test('resolveMonsterPools resolves subtype-based tier placeholders and unhydrated monster tiles', () => {
            const dungeon = {
                levels: [
                    {
                        front: {
                            miniboards: [
                                {
                                    tiles: [
                                        { id: 1, contains: { type: 'monster', subtype: 'tier_1_monster' } },
                                        { id: 2, contains: { type: 'monster' } }
                                    ]
                                }
                            ]
                        }
                    }
                ]
            };

            const count = resolveMonsterPools(dungeon, mm.monsters);
            expect(count).toBe(2);

            const tiles = dungeon.levels[0].front.miniboards[0].tiles;
            tiles.forEach(tile => {
                expect(tile.contains.type).toBe('monster');
                expect(typeof tile.contains.subtype).toBe('string');
                expect(mm.monsters[tile.contains.subtype]).toBeDefined();
            });
        });
    });

    describe('AnimatedXPBar Component Rendering', () => {
        test('AnimatedXPBar renders safe percent and never renders NaN% XP with NaN inputs', () => {
            const { getByText, queryByText } = render(
                <AnimatedXPBar percentBefore={NaN} percentAfter={NaN} levelTransition={false} />
            );
            expect(queryByText(/NaN/)).toBeNull();
            expect(getByText('0% XP')).toBeDefined();
        });

        test('AnimatedXPBar renders valid rounded percentage for numeric inputs', () => {
            const { getByText, queryByText } = render(
                <AnimatedXPBar percentBefore={42.4} percentAfter={65.8} levelTransition={false} />
            );
            expect(queryByText(/NaN/)).toBeNull();
            expect(getByText('42% XP')).toBeDefined();
        });
    });
});
