import cards from '../data/cards.json'

function shuffle(array) {
    const a = array.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function getCard(id){
    return cards.find(c=>c.id === id) || null;
}

export function getAllCards(){
    return cards.slice();
}

export function buildStarterDeck(){
    // naive starter deck: fill with common cards and some stronger ones
    const pool = getAllCards();
    const deck = [];
    // ensure each starter deck is 20 cards; pick by rarity weight
    const weights = {
        common: 6,
        uncommon: 3,
        rare: 1
    }
    while(deck.length < 20){
        const pick = pool[Math.floor(Math.random()*pool.length)];
        const w = weights[pick.rarity] || 1;
        // simple probability: accept if rand % w !== 0 to bias commons
        if(Math.random() < (w/6)) deck.push(pick.id);
    }
    return shuffle(deck);
}

export function buildDeckFromCollection(collection){
    // collection is {id:count}
    const pool = [];
    for(const k in collection){
        for(let i=0;i<collection[k];i++) pool.push(k);
    }
    // pad with random starter picks if not enough
    while(pool.length < 20) {
        const pick = cards[Math.floor(Math.random()*cards.length)];
        pool.push(pick.id)
    }
    return shuffle(pool.slice(0,20));
}

export default {
    getCard,
    getAllCards,
    buildStarterDeck,
    buildDeckFromCollection,
    shuffle
}
