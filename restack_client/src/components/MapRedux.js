/**
 * MapRedux.js
 * Redesigned dungeon map screen (feature-flagged via FLAGS.mapRedux).
 *
 * Design concept: "Navigator's Chart" — replaces the isometric slab tower
 * with an intuitive two-panel layout:
 *
 *   LEFT  – Vertical floor timeline. Each floor is a card. The current floor
 *            expands to reveal a live top-down zone grid with your position,
 *            breadcrumbs, and points of interest.
 *
 *   RIGHT – Zone network panel. When a floor is zoomed, shows all 9 miniboards
 *            as hexagonal / circular nodes on a connection graph. Clicking a
 *            node enters that zone.
 *
 * All data is passed via the same props that the original map overlay uses,
 * so no backend changes are needed.
 */

import React, { Component } from 'react';

// ─── helpers ────────────────────────────────────────────────────────────────

const ZONE_LABELS = ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE'];

// Maps boardIndex (0-8) → a circular layout position (cx%, cy%)
const NODE_POSITIONS = [
    { cx: 30, cy: 20 },  // 0 – NW
    { cx: 50, cy: 15 },  // 1 – N
    { cx: 70, cy: 20 },  // 2 – NE
    { cx: 22, cy: 50 },  // 3 – W
    { cx: 50, cy: 50 },  // 4 – C
    { cx: 78, cy: 50 },  // 5 – E
    { cx: 30, cy: 80 },  // 6 – SW
    { cx: 50, cy: 85 },  // 7 – S
    { cx: 70, cy: 80 },  // 8 – SE
];

// Adjacent pairs that are connected on the zone graph
const NODE_EDGES = [
    [0,1],[1,2],[3,4],[4,5],[6,7],[7,8],  // rows
    [0,3],[3,6],[1,4],[4,7],[2,5],[5,8],  // columns
];

// ─── sub-components ─────────────────────────────────────────────────────────

/** Single floor card in the timeline */
function FloorCard({
    levelId, isCurrent, isSelected, isZoomed,
    onSelect, onZoomIn, onZoomOut,
    discoveryPercent, hasEnemies, hasMerchant,
    boardCells, activeMinimapIndex,
    playerSlabDot, boardDetailPlayerTile,
    boardDetailDiscoveryDots, boardDetailPathSegments,
    boardDetailEnemyTiles, boardDetailMarkers2D,
    slabVendorMarkers, boardHighlightImage,
}) {
    const expanded = isCurrent && isZoomed;

    const handleClick = () => {
        if (isZoomed) {
            onZoomOut();
        } else if (isSelected) {
            onZoomIn(levelId);
        } else {
            onSelect(levelId);
        }
    };

    return (
        <div
            className={`mrx-floor-card ${isCurrent ? 'mrx-current' : ''} ${isSelected ? 'mrx-selected' : ''} ${expanded ? 'mrx-expanded' : ''}`}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleClick()}
            title={`Level ${levelId}${isCurrent ? ' — you are here' : ''}`}
        >
            {/* left accent bar */}
            <div className="mrx-accent-bar" />

            {/* floor badge */}
            <div className={`mrx-floor-badge ${isCurrent ? 'mrx-badge-current' : ''}`}>
                {levelId < 0 ? `B${Math.abs(levelId)}` : `L${levelId}`}
            </div>

            {/* floor info row */}
            <div className="mrx-floor-info">
                <div className="mrx-floor-name">
                    {isCurrent ? 'Current Floor' : `Floor ${levelId}`}
                </div>
                <div className="mrx-floor-meta">
                    {discoveryPercent > 0 && (
                        <div className="mrx-progress-track">
                            <div
                                className={`mrx-progress-fill ${isCurrent ? 'mrx-fill-current' : ''}`}
                                style={{ width: `${Math.min(100, discoveryPercent)}%` }}
                            />
                        </div>
                    )}
                    <span className="mrx-pct">{discoveryPercent}%</span>
                </div>
            </div>

            <div className="mrx-floor-icons">
                {hasEnemies  && <span className="mrx-icon mrx-icon-enemy" title="Enemies spotted">⚔</span>}
                {hasMerchant && <span className="mrx-icon mrx-icon-merchant" title="Merchant">⊛</span>}
            </div>

            {/* chevron */}
            <div className="mrx-chevron">{expanded ? '▲' : '▼'}</div>

            {/* expanded zone grid (shown when this is current + zoomed) */}
            {expanded && (
                <div className="mrx-zone-grid-container" onClick={(e) => e.stopPropagation()}>
                    <div className="mrx-zone-grid">
                        {/* background grid lines */}
                        <div className="mrx-grid-bg" />

                        {/* path svg */}
                        {boardDetailPathSegments.length > 0 && (
                            <svg
                                className="mrx-path-svg"
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                {boardDetailPathSegments.map((pts, i) => (
                                    <polyline key={i} points={pts} className="mrx-path-line" />
                                ))}
                            </svg>
                        )}

                        {/* enemy dots */}
                        {boardDetailEnemyTiles.map((m) => (
                            <span key={m.key} className="mrx-enemy-dot" style={{ left: m.left, top: m.top }} />
                        ))}

                        {/* POI icons */}
                        {boardDetailMarkers2D.map((m) => (
                            <span
                                key={m.key}
                                className={`mrx-poi-icon mrx-poi-${m.markerType}`}
                                style={{ left: m.left, top: m.top, backgroundImage: m.icon }}
                            />
                        ))}

                        {/* player position */}
                        {boardDetailPlayerTile && (
                            <span
                                className="mrx-player-dot"
                                style={{ left: boardDetailPlayerTile.left, top: boardDetailPlayerTile.top }}
                            >
                                <span className="mrx-player-pulse" />
                            </span>
                        )}

                        {/* discovery trail dots */}
                        {boardDetailDiscoveryDots.map((d) => (
                            <span key={d.key} className="mrx-discovery-dot" style={{ left: d.left, top: d.top }} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}


/** Zone network panel — shows 9 nodes for the 9 miniboards */
function ZoneNetwork({
    levelId, activeMinimapIndex, boardCells,
    onNodeClick, scoutedBoardIndex,
}) {
    return (
        <div className="mrx-zone-network">
            <div className="mrx-zone-network-title">Zone Network — L{levelId}</div>
            <svg
                className="mrx-network-svg"
                viewBox="0 0 100 100"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* concentric guide rings */}
                <circle cx="50" cy="50" r="38" className="mrx-guide-ring" />
                <circle cx="50" cy="50" r="20" className="mrx-guide-ring" />

                {/* edges */}
                {NODE_EDGES.map(([a, b], i) => {
                    const pa = NODE_POSITIONS[a];
                    const pb = NODE_POSITIONS[b];
                    return (
                        <line
                            key={i}
                            x1={pa.cx} y1={pa.cy}
                            x2={pb.cx} y2={pb.cy}
                            className="mrx-network-edge"
                        />
                    );
                })}

                {/* nodes */}
                {NODE_POSITIONS.map((pos, idx) => {
                    const isActive  = idx === activeMinimapIndex;
                    const isScouted = idx === scoutedBoardIndex;
                    return (
                        <g
                            key={idx}
                            className={`mrx-network-node-g ${isActive ? 'mrx-node-active' : ''} ${isScouted ? 'mrx-node-scouted' : ''}`}
                            onClick={() => onNodeClick(idx)}
                            style={{ cursor: 'pointer' }}
                        >
                            <circle
                                cx={pos.cx} cy={pos.cy} r={isActive ? 5.5 : 3.8}
                                className={`mrx-network-node ${isActive ? 'mrx-node-current' : ''}`}
                            />
                            {isActive && (
                                <circle cx={pos.cx} cy={pos.cy} r={8} className="mrx-node-pulse-ring" />
                            )}
                            <text x={pos.cx} y={pos.cy + 9.5} className="mrx-node-label">
                                {ZONE_LABELS[idx]}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}


// ─── main component ──────────────────────────────────────────────────────────

class MapRedux extends Component {
    render() {
        const {
            levelIds = [],
            currentLevelId,
            selectedLevelId,
            zoomedLevelId,
            activeMinimapIndex,
            boardCells = [],
            boardHighlightImage,
            playerSlabDot,
            boardDetailPlayerTile,
            boardDetailDiscoveryDots = [],
            boardDetailPathSegments = [],
            boardDetailEnemyTiles = [],
            boardDetailMarkers2D = [],
            slabVendorMarkers = [],
            minimapIndicators = [],
            orientation,
            onBack,
            onLevelSelect,
            onZoomIn,
            onZoomOut,
            onNodeClick,
            onOrientationChange,
            onSendScoutCrow,
            getFastidiousCrowLevel,
            meta = {},
        } = this.props;

        const hasZoomed = zoomedLevelId !== null && zoomedLevelId !== undefined;

        // Scout state
        const scout = meta.scoutActive;
        const now = new Date();
        const isScouting = scout && now < new Date(scout.endDate);
        const isOnCooldown = scout && !isScouting && now < new Date(scout.cooldownUntil);
        const scoutedBoardIndex = (() => {
            if (!scout?.scoutedArea) return -1;
            const end = new Date(scout.scoutedArea.revealUntil);
            if (now >= new Date(scout.endDate) && now < end && scout.scoutedArea.levelId === zoomedLevelId) {
                return scout.scoutedArea.boardIndex;
            }
            return -1;
        })();

        // Scout button label
        let scoutBtnLabel = '🦅 Scout with Crow';
        let scoutDisabled = false;
        if (isScouting) {
            const rem = Math.ceil((new Date(scout.endDate) - now) / 60000);
            scoutBtnLabel = `🦅 Scouting… (${rem}m)`;
            scoutDisabled = true;
        } else if (isOnCooldown) {
            const remMs = new Date(scout.cooldownUntil) - now;
            const h = Math.floor(remMs / 3600000);
            const m = Math.ceil((remMs % 3600000) / 60000);
            scoutBtnLabel = `🦅 Cooldown (${h}h ${m}m)`;
            scoutDisabled = true;
        }

        // Per-floor exploration data (rough heuristic: breadcrumb count per level)
        const getDiscoveryPct = (lvlId) => {
            try {
                const crumbs = (this.props.breadcrumbs || []).filter(
                    b => b && b.levelId === lvlId
                ).length;
                // 14×14 = 196 tiles per board, 9 boards = 1764 max
                return Math.min(99, Math.round((crumbs / 500) * 100));
            } catch { return 0; }
        };

        const getHasEnemies = (lvlId) => {
            try {
                const ind = minimapIndicators || [];
                return ind.some(g => g && g.levelId === lvlId && Array.isArray(g.enemies) && g.enemies.length > 0);
            } catch { return false; }
        };

        const getHasMerchant = (lvlId) => {
            try {
                const ind = minimapIndicators || [];
                return ind.some(g => g && g.levelId === lvlId && Array.isArray(g.merchant) && g.merchant.length > 0);
            } catch { return false; }
        };

        return (
            <div className="mrx-overlay" onClick={hasZoomed ? onZoomOut : undefined}>
                {/* ── header ─────────────────────────────────────────────── */}
                <div className="mrx-header" onClick={(e) => e.stopPropagation()}>
                    <button className="mrx-back-btn" onClick={onBack}>← Back</button>

                    <div className="mrx-title-block">
                        <div className="mrx-dungeon-title">Dungeon Tower</div>
                    </div>

                    <div className="mrx-header-right">
                        {getFastidiousCrowLevel && getFastidiousCrowLevel() > 0 && (
                            <button
                                className={`mrx-scout-btn ${scoutDisabled ? 'mrx-scout-disabled' : ''}`}
                                onClick={onSendScoutCrow}
                                disabled={scoutDisabled}
                            >
                                {scoutBtnLabel}
                            </button>
                        )}
                        <div className="mrx-orient-toggle">
                            <button
                                className={`mrx-orient-btn ${orientation === 'F' ? 'mrx-orient-active' : ''}`}
                                onClick={() => onOrientationChange('F')}
                            >◈ Front</button>
                            <button
                                className={`mrx-orient-btn ${orientation === 'B' ? 'mrx-orient-active' : ''}`}
                                onClick={() => onOrientationChange('B')}
                            >◇ Back</button>
                        </div>
                    </div>
                </div>

                {/* ── scout status banner ─────────────────────────────────── */}
                {isScouting && (
                    <div className="mrx-scout-banner mrx-scout-active" onClick={(e) => e.stopPropagation()}>
                        <span role="img" aria-label="eagle">🦅</span> Fastidious Crow is scouting… ({Math.ceil((new Date(scout.endDate) - now) / 60000)}m remaining)
                    </div>
                )}

                {/* ── main body ───────────────────────────────────────────── */}
                <div className="mrx-body" onClick={(e) => e.stopPropagation()}>
                    {/* LEFT: floor timeline */}
                    <div className="mrx-timeline">
                        <div className="mrx-timeline-rail" />
                        {levelIds.map((lvlId) => {
                            const isCurrent  = lvlId === currentLevelId;
                            const isSelected = lvlId === selectedLevelId;
                            const isZoomed   = lvlId === zoomedLevelId;
                            return (
                                <FloorCard
                                    key={lvlId}
                                    levelId={lvlId}
                                    isCurrent={isCurrent}
                                    isSelected={isSelected}
                                    isZoomed={isZoomed}
                                    onSelect={onLevelSelect}
                                    onZoomIn={onZoomIn}
                                    onZoomOut={onZoomOut}
                                    discoveryPercent={getDiscoveryPct(lvlId)}
                                    hasEnemies={getHasEnemies(lvlId)}
                                    hasMerchant={getHasMerchant(lvlId)}
                                    boardCells={boardCells}
                                    activeMinimapIndex={activeMinimapIndex}
                                    playerSlabDot={playerSlabDot}
                                    boardDetailPlayerTile={isCurrent ? boardDetailPlayerTile : null}
                                    boardDetailDiscoveryDots={isCurrent ? boardDetailDiscoveryDots : []}
                                    boardDetailPathSegments={isCurrent ? boardDetailPathSegments : []}
                                    boardDetailEnemyTiles={isCurrent ? boardDetailEnemyTiles : []}
                                    boardDetailMarkers2D={isCurrent ? boardDetailMarkers2D : []}
                                    slabVendorMarkers={isCurrent ? slabVendorMarkers : []}
                                    boardHighlightImage={boardHighlightImage}
                                />
                            );
                        })}
                    </div>

                    {/* RIGHT: zone network (shown when a level is zoomed/selected) */}
                    <div className="mrx-right-panel">
                        {hasZoomed ? (
                            <ZoneNetwork
                                levelId={zoomedLevelId}
                                activeMinimapIndex={activeMinimapIndex}
                                boardCells={boardCells}
                                onNodeClick={onNodeClick}
                                scoutedBoardIndex={scoutedBoardIndex}
                            />
                        ) : (
                            <div className="mrx-right-hint">
                                <div className="mrx-hint-icon">⬡</div>
                                <div className="mrx-hint-text">Select a floor to explore its zone network</div>
                            </div>
                        )}

                        {/* legend */}
                        <div className="mrx-legend">
                            <span className="mrx-legend-item">
                                <span className="mrx-legend-dot mrx-ld-player" /> Your position
                            </span>
                            <span className="mrx-legend-item">
                                <span className="mrx-legend-dot mrx-ld-enemy" /> Enemy
                            </span>
                            <span className="mrx-legend-item">
                                <span className="mrx-legend-dot mrx-ld-poi" /> Point of interest
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default MapRedux;
