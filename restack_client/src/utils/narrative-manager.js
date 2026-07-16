import hikaron from '../assets/Hikaron.jpg';

export const NARRATIVE_SEQUENCES = [
    {
        id: 0,
        narratorName: 'Hikaron',
        narratorImage: hikaron,
        text: 'Hail, dreamers. The winds of fate have blown you to this... Place within a place, in a time outside of time. Like a blind child, you will explore these confines, map out the corners and halls, while you grow like a seedling, expanding and changing. When you are a sapling ready for the next test, I will find you.'
    },
    {
        id: 1,
        narratorName: 'Hikaron',
        narratorImage: hikaron,
        text: 'Hail, dreamers. You have proven your resiliency. Now your destiny stretches out before you. You may think you arrived here of your own accord, but in truth I have brought you here, you will be the instruments of my ascension. When I am free, so will you be free. This ...place within a place that you find yourselves in, this is the tower of my mind, whos depths and spires yawn into infinity. I am lost inside this place. but as you grow, my little saplings, you will find your power can shake the very walls. You will be the instruments of my ascension. You will succeed where others have failed...'
    },
    {
        id: 2,
        narratorName: 'Hikaron',
        narratorImage: hikaron,
        text: 'Hail, dreamers. You are becoming yourselves, impressive. The greatest gift that power can bring, is the gift of creation. As you harness the world around you, you will find new ways to create parts from the whole. The monad is watching. Soon you will be strong enough to create parts greater than the whole. Then the monad will be nervous. Then we can shake the walls down and be free at last.'
    },
    {
        id: 3,
        narratorName: 'Hikaron',
        narratorImage: hikaron,
        text: 'Hail, dreamers! Can you feel it? The foundations tremor at your approach. You have expanded inwards and outwards and the monad is watching you fiercely, perhaps with some concern. You will succeed where others have failed! I can impart some guidance in this dire moment- now that you have achieved mastery of yourselves, know that death is but a doorway. Do not be afraid to pass through it. The circle cannot be closed until you have walked along its edge'
    },
    {
        id: 4,
        narratorName: 'Hikaron',
        narratorImage: hikaron,
        text: `Hail, dreamers. I confess this is new territory for me. The monad has impressed its will upon this place, making the very walls around you fold into themselves, the spaces that were once adjacent are now separated. My confinement will be lifted soon. We shall walk the path together.`
    },
    {
        id: 5,
        narratorName: 'Hikaron',
        narratorImage: hikaron,
        text: `Behold, dreamers! As my shackles crumble to dust, our entwined destinies are pulling us outwards! We are at the threshold of a new epoch. There is something I would have you do, a ritual to undo my bindings. There are two relics, located at the apex and zenith of this tower, you must find them and bring them to alter at the cradle of your beginning. I know not what forms The relics will take, they are merely projections you see... Let your intuition guide you`
    },
    {
        id: 6,
        narratorName: 'Hikaron',
        narratorImage: hikaron,
        text: `Sing! Your triumph will echo across the firmament! You are at the precipice, dreamers. What lies beyond I cannot say, but it will be a trial of the spirit. You are a monument ,stand strong. Your victory here will set me free`
    },
    {
        id: 7,
        narratorName: 'Hikaron',
        narratorImage: hikaron,
        text: `By all the fractional impossibilities of the universe you have found a path through a wilderness of contractions and deceptions, to this point and time, to my liberation and your destiny. Apotheosis will be our legacy, dear dreamers. Go to the apex of this place, you will find a path once obscured is now clear. Pass through and I will see you on the other side...`
    }
];

export const ensureNarrativeMeta = (meta = {}) => {
    const nextSequenceIndex = Number.isInteger(meta.currentNarrativeSequence)
        ? meta.currentNarrativeSequence
        : 0;

    return {
        ...meta,
        currentNarrativeSequence: nextSequenceIndex
    };
};

export const getNarrativeSequenceAt = (index) => {
    if (!Number.isInteger(index) || index < 0) return null;
    return NARRATIVE_SEQUENCES[index] || null;
};

export const getNextNarrativePayload = (meta = {}) => {
    const normalizedMeta = ensureNarrativeMeta(meta);
    const sequence = getNarrativeSequenceAt(normalizedMeta.currentNarrativeSequence);

    if (!sequence) {
        return {
            sequence: null,
            meta: normalizedMeta
        };
    }

    return {
        sequence,
        meta: {
            ...normalizedMeta,
            currentNarrativeSequence: normalizedMeta.currentNarrativeSequence + 1
        }
    };
};