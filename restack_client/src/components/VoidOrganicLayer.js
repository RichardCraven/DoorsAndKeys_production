import React from 'react';
import { getOrganicVoidPath } from '../utils/organic-void';

/**
 * VoidOrganicLayer
 * Memoized SVG layer rendering organic rocky boundaries over void/empty space tiles.
 */
const VoidOrganicLayerComponent = ({
    tiles,
    boardManager,
    boardKey = 'dungeon',
    pathD: propPathD,
    boardSize,
    isIsoView,
    enabled = true,
    active = true
}) => {
    const isEnabled = enabled && active;
    if (!isEnabled) return null;

    const pathD = propPathD || (tiles && tiles.length > 0 ? getOrganicVoidPath(boardKey, tiles, boardManager) : '');
    if (!pathD) return null;

    return (
        <svg
            className={`void-organic-layer ${isIsoView ? 'iso-layer' : ''}`}
            viewBox="0 0 15 15"
            preserveAspectRatio="none"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: boardSize ? `${boardSize}px` : '100%',
                height: boardSize ? `${boardSize}px` : '100%',
                pointerEvents: 'none',
                zIndex: 4, // Fits between floor tiles and monsters/walls
                contain: 'strict',
                shapeRendering: 'geometricPrecision'
            }}
        >
            <defs>
                <filter id="voidInnerShadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feGaussianBlur stdDeviation="0.08" result="blur" />
                    <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadow" />
                    <feFlood floodColor="#000000" floodOpacity="0.8" />
                    <feComposite in2="shadow" operator="in" />
                    <feComposite in2="SourceGraphic" operator="over" />
                </filter>
            </defs>

            {/* Base void fill */}
            <path
                d={pathD}
                fill="#000000"
                fillRule="evenodd"
            />

            {/* Dark warm stone rim stroke */}
            <path
                d={pathD}
                fill="none"
                stroke="rgba(42, 32, 20, 0.85)"
                strokeWidth="0.09"
                strokeLinejoin="round"
                strokeLinecap="round"
            />

            {/* Subtle inner gold/stone edge highlight */}
            <path
                d={pathD}
                fill="none"
                stroke="rgba(212, 168, 68, 0.22)"
                strokeWidth="0.03"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
        </svg>
    );
};

export const VoidOrganicLayer = React.memo(VoidOrganicLayerComponent, (prevProps, nextProps) => {
    return (
        prevProps.pathD === nextProps.pathD &&
        prevProps.tiles === nextProps.tiles &&
        prevProps.boardManager === nextProps.boardManager &&
        prevProps.boardKey === nextProps.boardKey &&
        prevProps.boardSize === nextProps.boardSize &&
        prevProps.isIsoView === nextProps.isIsoView &&
        prevProps.enabled === nextProps.enabled &&
        prevProps.active === nextProps.active
    );
});

export default VoidOrganicLayer;
