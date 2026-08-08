import React from 'react';

describe('Merchant Food Buying Mechanics', () => {
    const getFoodLimitForModal = (crew) => {
        const crewList = Array.isArray(crew) ? crew : [];
        const collectiveLevel = crewList.reduce((sum, member) => {
            const level = Number(member && member.level);
            return sum + (Number.isFinite(level) ? level : 0);
        }, 0);
        let limit = 100 + collectiveLevel * 50;
        crewList.forEach(member => {
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
                limit += 50;
            }
        });
        return limit;
    };

    test('Correctly calculates food limit based on crew level and skills', () => {
        const crew = [
            { level: 1, type: 'monk' },
            { level: 2, type: 'sage' }, // +50
            { level: 3, type: 'ranger', skills: ['hunters_quarry'] } // +50 (ranger) +100 (hunters_quarry)
        ];
        // collectiveLevel = 1 + 2 + 3 = 6
        // Base = 100 + 6 * 50 = 400
        // Sage = +50
        // Ranger = +50
        // hunters_quarry = +100
        // Expected = 400 + 50 + 50 + 100 = 600
        expect(getFoodLimitForModal(crew)).toBe(600);
    });

    test('Successfully purchases food, deducts gold, caps food at limit, and sets feedback', () => {
        const crew = [
            { level: 1, type: 'monk' } // Limit: 100 + 50 = 150
        ];
        const foodLimit = getFoodLimitForModal(crew);
        expect(foodLimit).toBe(150);

        let meta = { food: 145 };
        const inventoryManager = {
            gold: 100
        };

        let feedbackMsg = '';
        let feedbackColor = '';

        const handleBuyItem = (item) => {
            if (inventoryManager.gold < item.price) {
                feedbackMsg = 'Not enough gold!';
                feedbackColor = '#ff4d4d';
                return;
            }
            if (item.type === 'food') {
                const currentFood = typeof meta.food === 'number' ? meta.food : 55;
                if (currentFood >= foodLimit) {
                    feedbackMsg = 'Your food supply is already full!';
                    feedbackColor = '#ff4d4d';
                    return;
                }
                inventoryManager.gold -= item.price;
                meta.food = Math.min(foodLimit, currentFood + item.amount);
                feedbackMsg = `Purchased ${item.name} (+${item.amount} Food)!`;
                feedbackColor = '#2ecc71';
            }
        };

        const rationsBundle = {
            name: 'Rations Bundle',
            type: 'food',
            amount: 10,
            price: 20
        };

        handleBuyItem(rationsBundle);

        // Verification
        expect(inventoryManager.gold).toBe(80); // 100 - 20
        expect(meta.food).toBe(150); // Capped at 150 (145 + 10 = 155 capped)
        expect(feedbackMsg).toBe('Purchased Rations Bundle (+10 Food)!');
        expect(feedbackColor).toBe('#2ecc71');
    });

    test('Fails to purchase food and shows error if food supply is already at its limit', () => {
        const crew = [
            { level: 1, type: 'monk' } // Limit: 100 + 50 = 150
        ];
        const foodLimit = getFoodLimitForModal(crew);

        let meta = { food: 150 };
        const inventoryManager = {
            gold: 100
        };

        let feedbackMsg = '';
        let feedbackColor = '';

        const handleBuyItem = (item) => {
            if (inventoryManager.gold < item.price) {
                feedbackMsg = 'Not enough gold!';
                feedbackColor = '#ff4d4d';
                return;
            }
            if (item.type === 'food') {
                const currentFood = typeof meta.food === 'number' ? meta.food : 55;
                if (currentFood >= foodLimit) {
                    feedbackMsg = 'Your food supply is already full!';
                    feedbackColor = '#ff4d4d';
                    return;
                }
                inventoryManager.gold -= item.price;
                meta.food = Math.min(foodLimit, currentFood + item.amount);
                feedbackMsg = `Purchased ${item.name} (+${item.amount} Food)!`;
                feedbackColor = '#2ecc71';
            }
        };

        const rationsBundle = {
            name: 'Rations Bundle',
            type: 'food',
            amount: 10,
            price: 20
        };

        handleBuyItem(rationsBundle);

        // Verification
        expect(inventoryManager.gold).toBe(100); // No change
        expect(meta.food).toBe(150); // No change
        expect(feedbackMsg).toBe('Your food supply is already full!');
        expect(feedbackColor).toBe('#ff4d4d');
    });
});
