describe('Glitterburn Beam Angle Calculation', () => {
    test('calculates correct angle when target is below source unit', () => {
        const srcPx = { x: 100, y: 100 };
        const tgtPx = { x: 200, y: 200 }; // Enemy is to the right and below

        const dx = tgtPx.x - srcPx.x; // 100
        const dy = tgtPx.y - srcPx.y; // 100
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        expect(angle).toBeCloseTo(45);
        expect(length).toBeCloseTo(141.42, 1);

        const style = {
            left: `${srcPx.x}px`,
            top: `${srcPx.y}px`,
            width: `${length}px`,
            '--beam-angle': `${angle}deg`,
            transform: `rotate(${angle}deg)`
        };

        expect(style['--beam-angle']).toBe('45deg');
        expect(style.transform).toBe('rotate(45deg)');
    });

    test('calculates correct angle when target is above source unit', () => {
        const srcPx = { x: 200, y: 300 };
        const tgtPx = { x: 300, y: 200 }; // Enemy is to the right and above

        const dx = tgtPx.x - srcPx.x; // 100
        const dy = tgtPx.y - srcPx.y; // -100
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        expect(angle).toBeCloseTo(-45);
    });
});
