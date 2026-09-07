import { BoardManager } from '../board-manager';
import { MapMaker } from '../map-maker';

describe('Fractured Monolith Pocket Litter', () => {
    let bm;

    beforeEach(() => {
        bm = new BoardManager();
    });

    test('isImpassableBuildingTile returns false for the 4 corners and true for 5 inner/side cells of Fractured Monolith', () => {
        const cornerCells = ['anchor', 'top_right', 'bottom_left', 'bottom_right'];
        const innerCells = ['top_center', 'middle_left', 'center', 'middle_right', 'bottom_center'];

        cornerCells.forEach(cell => {
            const tile = {
                contains: {
                    type: 'pocket_litter',
                    subtype: 'pocket_litter_fractured_monolith',
                    vendorCell: cell
                }
            };
            expect(bm.isImpassableBuildingTile(tile)).toBe(false);
        });

        innerCells.forEach(cell => {
            const tile = {
                contains: {
                    type: 'pocket_litter',
                    subtype: 'pocket_litter_fractured_monolith',
                    vendorCell: cell
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
