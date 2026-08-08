import React from 'react';

describe('Merchant Buyback Mechanics', () => {
    let inventoryManager;
    let buybackStock;
    let feedbackMsg;

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

    beforeEach(() => {
        buybackStock = [];
        feedbackMsg = '';
        inventoryManager = {
            gold: 50,
            inventory: [
                { name: 'Wood', type: 'resource', tier: 1 },
                { name: 'Sunsteel', type: 'weapon', tier: 2 },
            ],
            removeItemByIndex: jest.fn(function (index) {
                this.inventory.splice(index, 1);
            }),
            addItem: jest.fn(function (item) {
                this.inventory.push(item);
            })
        };
    });

    const handleSellItem = (item, invIndex) => {
        const sellPrice = getItemSellPrice(item);
        const buybackPrice = Math.max(sellPrice + 2, Math.ceil(sellPrice * 1.2));
        const buybackItem = {
            ...item,
            price: buybackPrice,
            isBuyback: true,
            buybackId: `buyback_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
        };
        inventoryManager.removeItemByIndex(invIndex);
        inventoryManager.gold += sellPrice;
        buybackStock.push(buybackItem);
        feedbackMsg = `Sold ${item.name} for ${sellPrice} gold!`;
    };

    const handleBuyItem = (item) => {
        if (inventoryManager.gold < item.price) {
            feedbackMsg = 'Not enough gold!';
            return;
        }
        inventoryManager.gold -= item.price;
        const { price, isBuyback, buybackId, ...cleanItem } = item;
        inventoryManager.addItem(cleanItem);
        if (item.isBuyback) {
            buybackStock = buybackStock.filter(i => (i.buybackId && item.buybackId) ? i.buybackId !== item.buybackId : i !== item);
            feedbackMsg = `Bought back ${item.name}!`;
        } else {
            feedbackMsg = `Purchased ${item.name}!`;
        }
    };

    test('Selling an item adds it to merchant buyback stock with a slightly higher price', () => {
        const itemToSell = inventoryManager.inventory[0]; // Wood (Tier 1 -> sell for 25g)
        handleSellItem(itemToSell, 0);

        expect(inventoryManager.gold).toBe(75); // 50 + 25
        expect(inventoryManager.inventory).toHaveLength(1);
        expect(buybackStock).toHaveLength(1);

        const buybackItem = buybackStock[0];
        expect(buybackItem.name).toBe('Wood');
        expect(buybackItem.isBuyback).toBe(true);
        // 25 * 1.2 = 30 gold buyback cost
        expect(buybackItem.price).toBe(30);
    });

    test('Buying back a sold item deducts buyback price, returns item to inventory, and removes it from buyback stock', () => {
        const itemToSell = inventoryManager.inventory[1]; // Sunsteel (Tier 2 -> sell for 75g)
        handleSellItem(itemToSell, 1);

        expect(inventoryManager.gold).toBe(125); // 50 + 75
        const buybackItem = buybackStock[0];
        expect(buybackItem.price).toBe(90); // 75 * 1.2 = 90 gold

        // Now buy it back
        handleBuyItem(buybackItem);

        expect(inventoryManager.gold).toBe(35); // 125 - 90
        expect(buybackStock).toHaveLength(0);
        expect(inventoryManager.inventory).toContainEqual({ name: 'Sunsteel', type: 'weapon', tier: 2 });
        expect(feedbackMsg).toBe('Bought back Sunsteel!');
    });
});
