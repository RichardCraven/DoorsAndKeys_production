import * as images from './images';
import { getMeta, storeMeta } from './session-handler';

export const PROGRESSIVE_DEATH_ENEMIES = [
    {
        id: 'the_principalities',
        name: 'The Principalities',
        type: 'the_principalities',
        classification: 'Lesser Entity',
        subtitle: 'Three Ethereal Individuals',
        portrait: images.the_principalities_portrait || images.the_principalities,
        loreText: 'Your crew has fallen in combat. As the mist settles, three ethereal individuals manifest from the void, floating in silent, ominous accord.',
        quote: '"Your mortals\' journey ends here... unless you dare wager your collective souls in a game of cards. Defeat us, and your crew shall draw breath once more and grow in power."',
        hp: 20
    },
    {
        id: 'eshu',
        name: 'Eshu',
        type: 'eshu',
        classification: 'Lesser Entity',
        subtitle: 'Master of Crossroads',
        portrait: images.eshu_portrait || images.the_principalities_portrait,
        loreText: 'Your crew has fallen in combat. At the dark, swirling crossroads of mortality, Eshu steps forth with a mischievous grin.',
        quote: '"You survived the Triumvirate, mortal, but can you match wits with Eshu? Step forward and wager your soul in the duel!"',
        hp: 24
    }
];

export function getDeathEnemyIndex() {
    const meta = getMeta() || {};
    const idx = meta.deathEnemyIndex;
    return typeof idx === 'number' && !isNaN(idx) ? idx : 0;
}

export function getCurrentDeathEnemy() {
    const idx = getDeathEnemyIndex();
    if (idx < PROGRESSIVE_DEATH_ENEMIES.length) {
        return PROGRESSIVE_DEATH_ENEMIES[idx];
    }
    const last = PROGRESSIVE_DEATH_ENEMIES[PROGRESSIVE_DEATH_ENEMIES.length - 1];
    return {
        ...last,
        hp: last.hp + (idx - PROGRESSIVE_DEATH_ENEMIES.length + 1) * 4
    };
}

export function advanceDeathEnemyIndex() {
    const meta = getMeta() || {};
    const currentIdx = getDeathEnemyIndex();
    const nextIdx = currentIdx + 1;
    meta.deathEnemyIndex = nextIdx;
    storeMeta(meta);
    return nextIdx;
}
