import { BoardManager } from '../board-manager';
import { MapMaker } from '../map-maker';

describe('Fractured Monolith Pocket Litter', () => {
    let bm;

    beforeEach(() => {
        bm = new BoardManager();
    });

    test('isImpassableBuildingTile returns true for all cells of Fractured Monolith and all dimension litter types', () => {
        const allCells = ['anchor', 'top_center', 'top_right', 'middle_left', 'center', 'middle_right', 'bottom_left', 'bottom_center', 'bottom_right'];

        allCells.forEach(cell => {
            const tile = {
                contains: {
                    type: 'pocket_litter',
                    subtype: 'pocket_litter_fractured_monolith',
                    vendorCell: cell
                }
            };
            expect(bm.isImpassableBuildingTile(tile)).toBe(true);
        });

        const litterSubtypes = [
            'pocket_litter_mana_crystals',
            'pocket_litter_ruined_arch',
            'pocket_litter_broken_wagon',
            'pocket_litter_forge_remnants',
            'pocket_litter_rift_embers'
        ];

        litterSubtypes.forEach(subtype => {
            const tile = {
                contains: {
                    type: 'pocket_litter',
                    subtype
                }
            };
            expect(bm.isImpassableBuildingTile(tile)).toBe(true);
        });
    });

    test('pocketLitterOptions defines footprintType 3x3 for fractured monolith', () => {
        const mm = new MapMaker();
        const monolith = mm.pocketLitterOptions.find(opt => opt.key === 'pocket_litter_fractured_monolith');
        expect(monolith).toBeDefined();
        expect(monolith.footprintType).toBe('3x3');
        expect(monolith.isMultiTile).toBe(true);
    });
});
