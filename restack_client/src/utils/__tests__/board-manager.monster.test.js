import { BoardManager } from '../board-manager';

describe('BoardManager monster tile movement -> combat trigger', () => {
  test('moving onto a monster tile triggers setMonster and triggerMonsterBattle after move', () => {
    const bm = new BoardManager();

    // Create a simple tiles array large enough for coordinate mapping
    bm.tiles = new Array(225).fill(null).map((_, i) => ({ id: i, contains: null, image: null, color: 'white' }));
    bm.overlayTiles = bm.tiles.map(t => ({ ...t }));

    // Place the player at coordinates [15,15] (index 0) and monster at [15,16] (index 1)
    bm.playerTile = { location: [15, 15], boardIndex: 0 };

    const playerIdx = bm.getIndexFromCoordinates(bm.playerTile.location);
    expect(playerIdx).toBeGreaterThanOrEqual(0);

    const destCoords = [15, 16];
    const destIdx = bm.getIndexFromCoordinates(destCoords);
    // mark destination as monster
    bm.tiles[destIdx].contains = { type: 'monster', subtype: 'gorgon' };
    bm.tiles[destIdx].image = 'gorgon';

    // Provide mock callbacks for setMonster and triggerMonsterBattle
    bm.setMonster = jest.fn();
    bm.triggerMonsterBattle = jest.fn();

    // Sanity: ensure handleInteraction returns 'monster' for that tile
    const interaction = bm.handleInteraction(bm.tiles[destIdx]);
    expect(interaction).toBe('monster');

    // Execute a right move which should move player to destCoords and then trigger combat
    bm.moveRight();

    // After move, setMonster and triggerMonsterBattle should have been called
    expect(bm.setMonster).toHaveBeenCalled();
    expect(bm.triggerMonsterBattle).toHaveBeenCalledWith(true, bm.tiles[destIdx].id);
  });
});
