import hikaron from '../assets/Hikaron.jpg';

export const NARRATIVE_SEQUENCES = [
    {
        id: 0,
        narratorName: 'Hikaron',
        narratorImage: hikaron,
        text: 'this is a test of narrative sequence. this is narrative sequence 0'
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