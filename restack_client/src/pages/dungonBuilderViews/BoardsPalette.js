import React from 'react'
import '@coreui/coreui/dist/css/coreui.min.css'
import '../../styles/dungeon-board.scss'
import '../../styles/map-maker.scss'
import Tile from '../../components/tile'
// import { CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem, CCollapse} from '@coreui/react';
// import  CIcon  from '@coreui/icons-react'
// import { cilCaretRight } from '@coreui/icons';
import '../../styles/dungeon-board.scss'
import '../../styles/map-maker.scss'
import * as images from '../../utils/images'

class BoardsPalette extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            hoveredSubItem: null,  // { type: 'monster'|'gate', id: i }
            forestStampSize: 'M',
            forestStampShape: 'rect',
            forestStampTreeType: 'terrain_naked_trees',
            mountainStampSize: 'M',
            mountainStampShape: 'rect',
            mountainStampType: 'terrain_mountain_1'
        }
    }

    getOptionLabel = (optionType) => {
        if (optionType === 'tablet') return 'Tablet';
        if (optionType === 'jewels') return 'Jewels';
        if (optionType === 'runes') return 'Runes';
        if (optionType === 'connecting path') return 'Connecting Path';
        if (optionType === 'territory') return 'Territory';
        if (optionType === 'buildings') return 'Buildings';
        if (optionType === 'pocket buildings') return 'Pocket Buildings';
        if (optionType === 'generators') return 'Generators';
        if (optionType === 'dungeon litter') return 'Dungeon Litter';
        if (optionType === 'terrain') return 'Terrain';
        return optionType;
    }

    render (){
        return (
            <div className="palette right-palette" 
                style={{
                    width: this.props.tileSize*4.5+'px', height: (this.props.boardSize + 35) + 'px',
                    backgroundColor: '#0b0a09',
                    overflow: 'scroll',
                    marginLeft: '20px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
                onMouseLeave={() => {
                    if(this.props.optionClickedIdx === null){
                        return this.props.setPaletteHover(null)
                    }
                }}
            >
                {this.props.mapMaker.paletteTiles && this.props.mapMaker.paletteTiles.map((tile, i) => {
                    if (tile.optionType === 'pocket buildings' && !this.props.superboardZoom) {
                        return null;
                    }
                    return (
                    <div key={i} className={`palette-options-pane${this.props.optionClickedIdx === i ? ' expanded-pane' : ''}`}>
                        <div className="palette-option-container"
                        style={{
                            backgroundImage: this.props.optionClickedIdx === i ? 'linear-gradient(90deg, transparent, rgba(249, 177, 21, 0.15))' : 'none'
                        }}
                        onMouseOver={() => this.props.setPaletteHover(i)}
                        onClick={() => {
                            this.props.handleClick({
                            type: 'palette-tile',
                            id: i
                            })}
                        }>
                            <Tile 
                            id={tile.id}
                            tileSize={this.props.tileSize}
                            image={tile.image ? tile.image : null}
                            imageOverride={tile.image && tile.image.includes('/') ? tile.image : null}
                            color={tile.color && tile.color !== 'null' && tile.color !== 'undefined' ? tile.color : '#2c3036'}
                            borders={tile.borders}
                            coordinates={tile.coordinates}
                            index={tile.id}
                            showCoordinates={false}
                            editMode={true}
                            handleHover={null}
                            handleClick={null}
                            type={tile.type}
                            optionType={tile.optionType}
                            hovered={
                                this.props.hoveredPaletteTileIdx === tile.id ?
                                true :
                                false
                            }>
                            </Tile>
                            <div className={`
                                text-container
                                ${this.props.hoveredPaletteTileIdx === tile.id ? 'hovered' : ''}
                                ${this.props.pinnedOption && this.props.pinnedOption.id === tile.id ? 'pinned' : ''}
                                `
                                }>
                                <span
                                style={{
                                color: this.props.optionClickedIdx === i ? '#f9b115' : '#e0dcd3',
                                fontWeight: this.props.optionClickedIdx === i ? '600' : 'normal'
                                }}
                                >{this.getOptionLabel(tile.optionType)}</span>
                            </div>
                            {this.props.superboardZoom && (tile.optionType === 'empty space' || tile.optionType === 'void') && (
                                <div
                                    style={{ marginLeft: 'auto', marginRight: '10px' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (this.props.toggleSuperboardBrush3x3) {
                                            this.props.toggleSuperboardBrush3x3(e);
                                        }
                                    }}
                                    title="Toggle 3x3 Brush Mode"
                                >
                                    <button style={{
                                        background: this.props.superboardBrush3x3 ? 'rgba(249, 177, 21, 0.3)' : 'transparent',
                                        border: '1px solid #f9b115',
                                        color: '#f9b115',
                                        borderRadius: '4px',
                                        padding: '2px 6px',
                                        fontSize: '11px',
                                        cursor: 'pointer'
                                    }}>
                                        3x3
                                    </button>
                                </div>
                            )}
                            {['monsters', 'passage', 'gate', 'key', 'items', 'treasure', 'jewels', 'runes', 'vendors', 'shrine', 'territory', 'buildings', 'pocket buildings', 'generators', 'dungeon litter', 'terrain'].includes(tile.optionType) && (() => {
                                const isExpanded = this.props.optionClickedIdx === i;
                                return (
                                    <div style={{ marginRight: '15px', display: 'flex', alignItems: 'center', userSelect: 'none' }}>
                                        <svg 
                                            width="12" 
                                            height="12" 
                                            viewBox="0 0 24 24" 
                                            fill="none" 
                                            stroke="#f9b115" 
                                            strokeWidth="3.5" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                            style={{ 
                                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s ease, stroke 0.2s ease'
                                            }}
                                        >
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </div>
                                );
                            })()}
                        </div>
                        {tile.optionType === 'monsters' && <div className={`palette-option-expandable-container ${this.props.optionClickedIdx === i ? 'expanded' : ''}`}>
                            {(this.props.mapMaker.tierOptions || []).map((tierItem, ti) => {
                                if (!tierItem.key.endsWith('_monster')) return null;
                                const isHovered = this.state.hoveredSubItem?.type === 'tier-monster' && this.state.hoveredSubItem?.id === ti;
                                const isSelected = this.props.pinnedOption?.type === 'tier-tile' && this.props.pinnedOption?.id === ti;
                                return <div
                                key={`monster-tier-${ti}`}
                                className={`palette-option-subcontainer${isHovered ? ' sub-hovered' : ''}${isSelected ? ' sub-selected' : ''}`}
                                onMouseEnter={() => this.setState({ hoveredSubItem: { type: 'tier-monster', id: ti } })}
                                onMouseLeave={() => this.setState({ hoveredSubItem: null })}
                                onClick={() => {
                                    this.props.handleClick({
                                        type: 'tier-tile',
                                        id: ti
                                    })
                                }}
                                >
                                    <div className="text-container">
                                        {tierItem.name}
                                    </div>
                                    <Tile
                                    id={ti}
                                    tileSize={this.props.tileSize}
                                    index={ti}
                                    image={images[tierItem.image]}
                                    imageOverride={images[tierItem.image]}
                                    handleHover={null}
                                    handleClick={null}
                                    isPaletteTile={true}
                                    type={'item'}>
                                    </Tile>
                                </div>
                            })}
                            {(typeof this.props.monsterManager?.getPaletteMonsters === 'function' ? this.props.monsterManager.getPaletteMonsters() : Object.values(this.props.monsterManager?.monsters || {})).map((monster,i)=>{
                                const isHovered = this.state.hoveredSubItem?.type === 'monster' && this.state.hoveredSubItem?.id === i;
                                const isSelected = this.props.pinnedOption?.type === 'monster-tile' && (this.props.pinnedOption?.id === i || this.props.pinnedOption?.monsterType === monster.type);
                                return <div 
                                key={i} 
                                className={`palette-option-subcontainer${isHovered ? ' sub-hovered' : ''}${isSelected ? ' sub-selected' : ''}`}
                                onMouseEnter={() => this.setState({ hoveredSubItem: { type: 'monster', id: i } })}
                                onMouseLeave={() => this.setState({ hoveredSubItem: null })}
                                onClick={() => {
                                    this.props.handleClick({
                                        type: 'monster-tile',
                                        id: i,
                                        monsterType: monster.type
                                    })}
                                }
                                >
                                    <div className="text-container">
                                        {monster.key.replaceAll('_', ' ')}
                                    </div>
                                    <Tile 
                                    id={monster.id}
                                    tileSize={this.props.tileSize}
                                    image={monster.portrait}
                                    // color={monster.color ? monster.color : 'white'}
                                    // coordinates={monster.coordinates}
                                    index={monster.id}
                                    // showCoordinates={false}
                                    // editMode={true}
                                    imageOverride={monster.portrait}
                                    handleHover={null}
                                    handleClick={null}
                                    isPaletteTile={true}
                                    type={monster.type}
                                    hovered={
                                        this.props.hoveredPaletteTileIdx === monster.id ?
                                        true :
                                        false
                                    }>
                                    </Tile>
                                    
                                </div> 
                            })}
                        </div>}
                        {tile.optionType === 'passage' && <div className={`palette-option-expandable-container ${this.props.optionClickedIdx === i ? 'expanded' : ''}`}>
                            {(this.props.mapMaker.passageOptions || []).map((passageItem, pi) => {
                                const isHovered = this.state.hoveredSubItem?.type === 'passage-tool' && this.state.hoveredSubItem?.id === pi;
                                const isSelected = this.props.pinnedOption?.type === 'passage-tool-tile' && this.props.pinnedOption?.id === pi;
                                return <div
                                key={`passage-tool-${pi}`}
                                className={`palette-option-subcontainer${isHovered ? ' sub-hovered' : ''}${isSelected ? ' sub-selected' : ''}`}
                                onMouseEnter={() => this.setState({ hoveredSubItem: { type: 'passage-tool', id: pi } })}
                                onMouseLeave={() => this.setState({ hoveredSubItem: null })}
                                onClick={() => {
                                    this.props.handleClick({
                                        type: 'passage-tool-tile',
                                        id: pi
                                    })
                                }}
                                >
                                    <div className="text-container">
                                        {passageItem.name}
                                    </div>
                                    <Tile
                                    id={pi}
                                    tileSize={this.props.tileSize}
                                    index={pi}
                                    image={passageItem.image}
                                    imageOverride={passageItem.image && images[passageItem.image] ? images[passageItem.image] : null}
                                    color={null}
                                    borders={{ top: '2px solid black', left: '2px solid black', right: '2px solid transparent', bottom: '2px solid black' }}
                                    handleHover={null}
                                    handleClick={null}
                                    isPaletteTile={true}
                                    type={'item'}>
                                    </Tile>
                                </div>
                            })}
                        </div>}
                        {tile.optionType === 'gate' && <div className={`palette-option-expandable-container ${this.props.optionClickedIdx === i ? 'expanded' : ''}`}>
                            {this.props.gates.map((gate,i)=>{
                                const isHovered = this.state.hoveredSubItem?.type === 'gate' && this.state.hoveredSubItem?.id === i;
                                const isSelected = this.props.pinnedOption?.type === 'gate-tile' && this.props.pinnedOption?.id === i;
                                return <div 
                                key={i} 
                                className={`palette-option-subcontainer${isHovered ? ' sub-hovered' : ''}${isSelected ? ' sub-selected' : ''}`}
                                onMouseEnter={() => this.setState({ hoveredSubItem: { type: 'gate', id: i } })}
                                onMouseLeave={() => this.setState({ hoveredSubItem: null })}
                                onClick={() => {
                                    this.props.handleClick({
                                    type: 'gate-tile',
                                    id: i
                                    })}
                                }
                                >
                                    <div className="text-container">
                                        {gate.key.replace(/_/g, ' ').replace(/\bgate\b/g, '').trim()}
                                    </div>
                                    <Tile 
                                    id={i}
                                    tileSize={this.props.tileSize}
                                    index={gate.id}
                                    image={images[gate.key]}
                                    // showCoordinates={false}
                                    // editMode={true}
                                    imageOverride={images[gate.key]}
                                    handleHover={null}
                                    handleClick={null}
                                    isPaletteTile={true}
                                    type={'gate'}>
                                    </Tile>
                                    
                                </div> 
                            })}
                        </div>}
                        {tile.optionType === 'key' && <div className={`palette-option-expandable-container ${this.props.optionClickedIdx === i ? 'expanded' : ''}`}>
                            {(this.props.keys || []).map((keyItem, ki) => {
                                const isHovered = this.state.hoveredSubItem?.type === 'key' && this.state.hoveredSubItem?.id === ki;
                                const isSelected = this.props.pinnedOption?.type === 'key-tile' && this.props.pinnedOption?.id === ki;
                                return <div
                                key={ki}
                                className={`palette-option-subcontainer${isHovered ? ' sub-hovered' : ''}${isSelected ? ' sub-selected' : ''}`}
                                onMouseEnter={() => this.setState({ hoveredSubItem: { type: 'key', id: ki } })}
                                onMouseLeave={() => this.setState({ hoveredSubItem: null })}
                                onClick={() => {
                                    this.props.handleClick({
                                        type: 'key-tile',
                                        id: ki
                                    })
                                }}
                                >
                                    <div className="text-container">
                                        {keyItem.name}
                                    </div>
                                    <Tile
                                    id={ki}
                                    tileSize={this.props.tileSize}
                                    index={ki}
                                    image={images[keyItem.key]}
                                    imageOverride={images[keyItem.key]}
                                    handleHover={null}
                                    handleClick={null}
                                    isPaletteTile={true}
                                    type={'item'}>
                                    </Tile>
                                </div>
                            })}
                        </div>}
                        {tile.optionType === 'items' && <div className={`palette-option-expandable-container ${this.props.optionClickedIdx === i ? 'expanded' : ''}`}>
                            {(this.props.mapMaker.tierOptions || []).map((tierItem, ti) => {
                                if (tierItem.key.endsWith('_monster')) return null;
                                const isHovered = this.state.hoveredSubItem?.type === 'tier' && this.state.hoveredSubItem?.id === ti;
                                const isSelected = this.props.pinnedOption?.type === 'tier-tile' && this.props.pinnedOption?.id === ti;
                                return <div
                                key={ti}
                                className={`palette-option-subcontainer${isHovered ? ' sub-hovered' : ''}${isSelected ? ' sub-selected' : ''}`}
                                onMouseEnter={() => this.setState({ hoveredSubItem: { type: 'tier', id: ti } })}
                                onMouseLeave={() => this.setState({ hoveredSubItem: null })}
                                onClick={() => {
                                    this.props.handleClick({
                                        type: 'tier-tile',
                                        id: ti
                                    })
                                }}
                                >
                                    <div className="text-container">
                                        {tierItem.name}
                                    </div>
                                    <Tile
                                    id={ti}
                                    tileSize={this.props.tileSize}
                                    index={ti}
                                    image={images[tierItem.image]}
                                    imageOverride={images[tierItem.image]}
                                    handleHover={null}
                                    handleClick={null}
                                    isPaletteTile={true}
                                    type={'item'}>
                                    </Tile>
                                </div>
                            })}
                        </div>}
                        {tile.optionType === 'treasure' && <div className={`palette-option-expandable-container ${this.props.optionClickedIdx === i ? 'expanded' : ''}`}>
                            {(this.props.mapMaker.treasureOptions || []).map((treasureItem, ti) => {
                                const isHovered = this.state.hoveredSubItem?.type === 'treasure' && this.state.hoveredSubItem?.id === ti;
                                const isSelected = this.props.pinnedOption?.type === 'treasure-tile' && this.props.pinnedOption?.id === ti;
                                return <div
                                key={`treasure-${ti}`}
                                className={`palette-option-subcontainer${isHovered ? ' sub-hovered' : ''}${isSelected ? ' sub-selected' : ''}`}
                                onMouseEnter={() => this.setState({ hoveredSubItem: { type: 'treasure', id: ti } })}
                                onMouseLeave={() => this.setState({ hoveredSubItem: null })}
                                onClick={() => {
                                    this.props.handleClick({
                                        type: 'treasure-tile',
                                        id: ti
                                    })
                                }}
                                >
                                    <div className="text-container">
                                        {treasureItem.name}
                                    </div>
                                    <Tile
                                    id={ti}
                                    tileSize={this.props.tileSize}
                                    index={ti}
                                    image={images[treasureItem.image]}
                                    imageOverride={images[treasureItem.image]}
                                    handleHover={null}
                                    handleClick={null}
                                    isPaletteTile={true}
                                    type={'item'}>
                                    </Tile>
                                </div>
                            })}
                        </div>}
                        {tile.optionType === 'jewels' && <div className={`palette-option-expandable-container ${this.props.optionClickedIdx === i ? 'expanded' : ''}`}>
                            {(this.props.mapMaker.jewelOptions || []).map((jewelItem, ji) => {
                                const isHovered = this.state.hoveredSubItem?.type === 'jewel' && this.state.hoveredSubItem?.id === ji;
                                const isSelected = this.props.pinnedOption?.type === 'jewel-tile' && this.props.pinnedOption?.id === ji;
                                return <div
                                key={`jewel-${ji}`}
                                className={`palette-option-subcontainer${isHovered ? ' sub-hovered' : ''}${isSelected ? ' sub-selected' : ''}`}
                                onMouseEnter={() => this.setState({ hoveredSubItem: { type: 'jewel', id: ji } })}
                                onMouseLeave={() => this.setState({ hoveredSubItem: null })}
                                onClick={() => {
                                    this.props.handleClick({
                                        type: 'jewel-tile',
                                        id: ji
                                    })
                                }}
                                >
                                    <div className="text-container">
                                        {jewelItem.name}
                                    </div>
                                    <Tile
                                    id={ji}
                                    tileSize={this.props.tileSize}
                                    index={ji}
                                    image={images[jewelItem.image]}
                                    imageOverride={images[jewelItem.image]}
                                    handleHover={null}
                                    handleClick={null}
                                    isPaletteTile={true}
                                    type={'item'}>
                                    </Tile>
                                </div>
                            })}
                        </div>}
                        {tile.optionType === 'runes' && <div className={`palette-option-expandable-container ${this.props.optionClickedIdx === i ? 'expanded' : ''}`}>
                            {(this.props.mapMaker.runeOptions || []).map((runeItem, ri) => {
                                const isHovered = this.state.hoveredSubItem?.type === 'rune' && this.state.hoveredSubItem?.id === ri;
                                const isSelected = this.props.pinnedOption?.type === 'rune-tile' && this.props.pinnedOption?.id === ri;
                                return <div
                                key={`rune-${ri}`}
                                className={`palette-option-subcontainer${isHovered ? ' sub-hovered' : ''}${isSelected ? ' sub-selected' : ''}`}
                                onMouseEnter={() => this.setState({ hoveredSubItem: { type: 'rune', id: ri } })}
                                onMouseLeave={() => this.setState({ hoveredSubItem: null })}
                                onClick={() => {
                                    this.props.handleClick({
                                        type: 'rune-tile',
                                        id: ri
                                    })
                                }}
                                >
                                    <div className="text-container">
                                        {runeItem.name}
                                    </div>
                                    <Tile
                                    id={ri}
                                    tileSize={this.props.tileSize}
                                    index={ri}
                                    image={images[runeItem.image]}
                                    imageOverride={images[runeItem.image]}
                                    handleHover={null}
                                    handleClick={null}
                                    isPaletteTile={true}
                                    type={'item'}>
                                    </Tile>
                                </div>
                            })}
                        </div>}
                        {tile.optionType === 'vendors' && <div className={`palette-option-expandable-container ${this.props.optionClickedIdx === i ? 'expanded' : ''}`}>
                            {(this.props.mapMaker.vendorOptions || []).map((vendorItem, vi) => {
                                const isHovered = this.state.hoveredSubItem?.type === 'vendor' && this.state.hoveredSubItem?.id === vi;
                                const isSelected = this.props.pinnedOption?.type === 'vendor-tile' && this.props.pinnedOption?.id === vi;
                                return <div
                                key={`vendor-${vi}`}
                                className={`palette-option-subcontainer${isHovered ? ' sub-hovered' : ''}${isSelected ? ' sub-selected' : ''}`}
                                onMouseEnter={() => this.setState({ hoveredSubItem: { type: 'vendor', id: vi } })}
                                onMouseLeave={() => this.setState({ hoveredSubItem: null })}
                                onClick={() => {
                                    this.props.handleClick({
                                        type: 'vendor-tile',
                                        id: vi
                                    })
                                }}
                                >
                                    <div className="text-container">
                                        {vendorItem.name}
                                    </div>
                                    <Tile
                                    id={vi}
                                    tileSize={this.props.tileSize}
                                    index={vi}
                                    image={images[vendorItem.image]}
                                    imageOverride={images[vendorItem.image]}
                                    handleHover={null}
                                    handleClick={null}
                                    isPaletteTile={true}
                                    type={'item'}>
                                    </Tile>
                                </div>
                            })}
                        </div>}
                        {tile.optionType === 'shrine' && <div className={`palette-option-expandable-container ${this.props.optionClickedIdx === i ? 'expanded' : ''}`}>
                            {(this.props.mapMaker.shrineOptions || []).map((shrineItem, si) => {
                                const isHovered = this.state.hoveredSubItem?.type === 'shrine' && this.state.hoveredSubItem?.id === si;
                                const isSelected = this.props.pinnedOption?.type === 'shrine-tile' && this.props.pinnedOption?.id === si;
                                return <div
                                key={`shrine-${si}`}
                                className={`palette-option-subcontainer${isHovered ? ' sub-hovered' : ''}${isSelected ? ' sub-selected' : ''}`}
                                onMouseEnter={() => this.setState({ hoveredSubItem: { type: 'shrine', id: si } })}
                                onMouseLeave={() => this.setState({ hoveredSubItem: null })}
                                onClick={() => {
                                    this.props.handleClick({
                                        type: 'shrine-tile',
                                        id: si
                                    })
                                }}
                                >
                                    <div className="text-container">{shrineItem.name}</div>
                                    <div style={{
                                        width: this.props.tileSize + 'px',
                                        height: this.props.tileSize + 'px',
                                        backgroundColor: shrineItem.color,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <div style={{
                                            width: '70%',
                                            height: '70%',
                                            backgroundImage: `url(${images.shrine})`,
                                            backgroundSize: 'contain',
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'center'
                                        }} />
                                    </div>
                                </div>
                            })}
                        </div>}
                        {tile.optionType === 'territory' && <div className={`palette-option-expandable-container ${this.props.optionClickedIdx === i ? 'expanded' : ''}`}>
                            {(this.props.mapMaker.territoryOptions || []).map((tItem, ti) => {
                                const isHovered = this.state.hoveredSubItem?.type === 'territory' && this.state.hoveredSubItem?.id === ti;
                                const isSelected = this.props.pinnedOption?.type === 'territory-tile' && this.props.pinnedOption?.id === ti;
                                const isDisabled = !!tItem.disabled;
                                const clanColors = {
                                    mud: '#8b5a2b',
                                    cave: '#646e8c',
                                    woodland: '#228b22',
                                    shadow: '#500078',
                                    paradox: '#b400b4'
                                };
                                return <div
                                key={`territory-${ti}`}
                                className={`palette-option-subcontainer${isHovered ? ' sub-hovered' : ''}${isSelected ? ' sub-selected' : ''}${isDisabled ? ' sub-disabled' : ''}`}
                                style={{ opacity: isDisabled ? 0.45 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                                onMouseEnter={() => !isDisabled && this.setState({ hoveredSubItem: { type: 'territory', id: ti } })}
                                onMouseLeave={() => this.setState({ hoveredSubItem: null })}
                                onClick={() => {
                                    if (isDisabled) return;
                                    this.props.handleClick({
                                        type: 'territory-tile',
                                        id: ti
                                    })
                                }}
                                >
                                    <div className="text-container" style={{ color: isDisabled ? '#777' : undefined }}>
                                        {tItem.name} {isDisabled ? '(Disabled)' : ''}
                                    </div>
                                    <div style={{
                                        width: this.props.tileSize + 'px',
                                        height: this.props.tileSize + 'px',
                                        backgroundColor: clanColors[tItem.clan] || '#444',
                                        borderRadius: '4px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: Math.max(9, this.props.tileSize * 0.35) + 'px',
                                        fontWeight: 'bold', color: '#fff',
                                        opacity: isDisabled ? 0.4 : 0.85,
                                        boxShadow: 'inset 0 0 6px rgba(0,0,0,0.5)',
                                        flexShrink: 0
                                    }}>
                                        {tItem.clan ? tItem.clan.charAt(0).toUpperCase() : '?'}
                                    </div>
                                </div>
                            })}
                        </div>}
                        {tile.optionType === 'buildings' && <div className={`palette-option-expandable-container ${this.props.optionClickedIdx === i ? 'expanded' : ''}`}>
                            {(this.props.mapMaker.buildingOptions || []).map((bItem, bi) => {
                                const isHovered = this.state.hoveredSubItem?.type === 'building' && this.state.hoveredSubItem?.id === bi;
                                const isSelected = this.props.pinnedOption?.type === 'building-tile' && this.props.pinnedOption?.id === bi;
                                return <div
                                key={`building-${bi}`}
                                className={`palette-option-subcontainer${isHovered ? ' sub-hovered' : ''}${isSelected ? ' sub-selected' : ''}`}
                                onMouseEnter={() => this.setState({ hoveredSubItem: { type: 'building', id: bi } })}
                                onMouseLeave={() => this.setState({ hoveredSubItem: null })}
                                onClick={() => {
                                    this.props.handleClick({
                                        type: 'building-tile',
                                        id: bi
                                    })
                                }}
                                >
                                    <div className="text-container">{bItem.name}</div>
                                    <Tile
                                    id={bi}
                                    tileSize={this.props.tileSize}
                                    index={bi}
                                    image={images[bItem.image]}
                                    imageOverride={images[bItem.image]}
                                    handleHover={null}
                                    handleClick={null}
                                    isPaletteTile={true}
                                    type={'item'}>
                                    </Tile>
                                </div>
                            })}
                        </div>}
                        {tile.optionType === 'pocket buildings' && <div className={`palette-option-expandable-container ${this.props.optionClickedIdx === i ? 'expanded' : ''}`}>
                            {(this.props.mapMaker.pocketBuildingOptions || []).map((pbItem, pbi) => {
                                const isHovered = this.state.hoveredSubItem?.type === 'pocket-building' && this.state.hoveredSubItem?.id === pbi;
                                const isSelected = this.props.pinnedOption?.type === 'pocket-building-tile' && this.props.pinnedOption?.id === pbi;
                                return <div
                                key={`pocket-building-${pbi}`}
                                className={`palette-option-subcontainer${isHovered ? ' sub-hovered' : ''}${isSelected ? ' sub-selected' : ''}`}
                                onMouseEnter={() => this.setState({ hoveredSubItem: { type: 'pocket-building', id: pbi } })}
                                onMouseLeave={() => this.setState({ hoveredSubItem: null })}
                                onClick={() => {
                                    this.props.handleClick({
                                        type: 'pocket-building-tile',
                                        id: pbi
                                    })
                                }}
                                >
                                    <div className="text-container">{pbItem.name}</div>
                                    <Tile
                                    id={pbi}
                                    tileSize={this.props.tileSize}
                                    index={pbi}
                                    image={images[pbItem.image] || images[pbItem.key]}
                                    imageOverride={images[pbItem.image] || images[pbItem.key]}
                                    handleHover={null}
                                    handleClick={null}
                                    isPaletteTile={true}
                                    type={'item'}>
                                    </Tile>
                                </div>
                            })}
                        </div>}
                        {tile.optionType === 'generators' && <div className={`palette-option-expandable-container ${this.props.optionClickedIdx === i ? 'expanded' : ''}`}>
                            {(this.props.mapMaker.generatorOptions || []).map((gItem, gi) => {
                                const isHovered = this.state.hoveredSubItem?.type === 'generator' && this.state.hoveredSubItem?.id === gi;
                                const isSelected = this.props.pinnedOption?.type === 'generator-tile' && this.props.pinnedOption?.id === gi;
                                return <div
                                key={`generator-${gi}`}
                                className={`palette-option-subcontainer${isHovered ? ' sub-hovered' : ''}${isSelected ? ' sub-selected' : ''}`}
                                onMouseEnter={() => this.setState({ hoveredSubItem: { type: 'generator', id: gi } })}
                                onMouseLeave={() => this.setState({ hoveredSubItem: null })}
                                onClick={() => {
                                    this.props.handleClick({
                                        type: 'generator-tile',
                                        id: gi
                                    })
                                }}
                                >
                                    <div className="text-container">{gItem.name}</div>
                                    <Tile
                                    id={gi}
                                    tileSize={this.props.tileSize}
                                    index={gi}
                                    image={images[gItem.image]}
                                    imageOverride={images[gItem.image]}
                                    handleHover={null}
                                    handleClick={null}
                                    isPaletteTile={true}
                                    type={'item'}>
                                    </Tile>
                                </div>
                            })}
                        </div>}
                        {tile.optionType === 'dungeon litter' && <div className={`palette-option-expandable-container ${this.props.optionClickedIdx === i ? 'expanded' : ''}`}>
                            {(this.props.mapMaker.dungeonLitterOptions || []).map((lItem, li) => {
                                const isHovered = this.state.hoveredSubItem?.type === 'dungeon-litter' && this.state.hoveredSubItem?.id === li;
                                const isSelected = this.props.pinnedOption?.type === 'dungeon-litter-tile' && this.props.pinnedOption?.id === li;
                                return <div
                                key={`dungeon-litter-${li}`}
                                className={`palette-option-subcontainer${isHovered ? ' sub-hovered' : ''}${isSelected ? ' sub-selected' : ''}`}
                                onMouseEnter={() => this.setState({ hoveredSubItem: { type: 'dungeon-litter', id: li } })}
                                onMouseLeave={() => this.setState({ hoveredSubItem: null })}
                                onClick={() => {
                                    this.props.handleClick({
                                        type: 'dungeon-litter-tile',
                                        id: li
                                    })
                                }}
                                >
                                    <div className="text-container">{lItem.name}</div>
                                    <Tile
                                    id={li}
                                    tileSize={this.props.tileSize}
                                    index={li}
                                    image={images[lItem.image]}
                                    imageOverride={images[lItem.image]}
                                    handleHover={null}
                                    handleClick={null}
                                    isPaletteTile={true}
                                    type={'item'}>
                                    </Tile>
                                </div>
                            })}
                        </div>}
                        {tile.optionType === 'terrain' && <div className={`palette-option-expandable-container ${this.props.optionClickedIdx === i ? 'expanded' : ''}`}>
                            {/* Forest Stamp Controls */}
                            {(() => {
                                const isForestStampSelected = this.props.pinnedOption?.type === 'forest-stamp-tile';
                                return (
                                    <div style={{
                                        margin: '4px 2px 8px 2px',
                                        padding: '8px 6px',
                                        background: isForestStampSelected ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.95) 0%, rgba(4, 47, 46, 0.95) 100%)' : 'linear-gradient(135deg, rgba(20, 35, 25, 0.85) 0%, rgba(12, 20, 15, 0.9) 100%)',
                                        border: isForestStampSelected ? '1.5px solid #10b981' : '1px solid rgba(16, 185, 129, 0.35)',
                                        boxShadow: isForestStampSelected ? '0 0 10px rgba(16, 185, 129, 0.45)' : '0 2px 6px rgba(0, 0, 0, 0.6)',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px'
                                    }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => {
                                                this.props.handleClick({
                                                    type: 'forest-stamp-tile',
                                                    size: this.state.forestStampSize,
                                                    shape: this.state.forestStampShape,
                                                    treeType: this.state.forestStampTreeType
                                                });
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <span style={{ fontSize: '13px' }}>🌲</span>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    color: isForestStampSelected ? '#34d399' : '#e2e8f0',
                                                    letterSpacing: '0.4px',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    Forest Stamp
                                                </span>
                                            </div>
                                            <span style={{
                                                fontSize: '8.5px',
                                                padding: '2px 5px',
                                                borderRadius: '3px',
                                                background: isForestStampSelected ? '#059669' : 'rgba(255,255,255,0.12)',
                                                color: '#ffffff',
                                                fontWeight: 'bold',
                                                letterSpacing: '0.3px'
                                            }}>
                                                {isForestStampSelected ? 'ACTIVE' : 'SELECT'}
                                            </span>
                                        </div>

                                        {/* Shape toggle: Rect vs Oval */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1px' }}>
                                            <span style={{ fontSize: '9.5px', color: '#94a3b8', fontWeight: 'bold' }}>Shape:</span>
                                            <div style={{ display: 'flex', gap: '3px' }}>
                                                {['rect', 'oval'].map(shape => {
                                                    const active = this.state.forestStampShape === shape;
                                                    return (
                                                        <button
                                                            key={shape}
                                                            type="button"
                                                            style={{
                                                                fontSize: '9px',
                                                                padding: '2px 6px',
                                                                borderRadius: '3px',
                                                                border: active ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.15)',
                                                                background: active ? '#10b981' : 'rgba(0,0,0,0.5)',
                                                                color: active ? '#0f172a' : '#cbd5e1',
                                                                fontWeight: active ? '700' : 'normal',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                this.setState({ forestStampShape: shape }, () => {
                                                                    this.props.handleClick({
                                                                        type: 'forest-stamp-tile',
                                                                        size: this.state.forestStampSize,
                                                                        shape: shape,
                                                                        treeType: this.state.forestStampTreeType
                                                                    });
                                                                });
                                                            }}
                                                        >
                                                            {shape === 'rect' ? 'Rect' : 'Oval'}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Size selector: S / M / L */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '9.5px', color: '#94a3b8', fontWeight: 'bold' }}>Size:</span>
                                            <div style={{ display: 'flex', gap: '3px' }}>
                                                {[
                                                    { key: 'S', label: 'S (3×3)' },
                                                    { key: 'M', label: 'M (5×5)' },
                                                    { key: 'L', label: 'L (7×7)' }
                                                ].map(sz => {
                                                    const active = this.state.forestStampSize === sz.key;
                                                    return (
                                                        <button
                                                            key={sz.key}
                                                            type="button"
                                                            style={{
                                                                fontSize: '9px',
                                                                padding: '2px 5px',
                                                                borderRadius: '3px',
                                                                border: active ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.15)',
                                                                background: active ? '#10b981' : 'rgba(0,0,0,0.5)',
                                                                color: active ? '#0f172a' : '#cbd5e1',
                                                                fontWeight: active ? '700' : 'normal',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                this.setState({ forestStampSize: sz.key }, () => {
                                                                    this.props.handleClick({
                                                                        type: 'forest-stamp-tile',
                                                                        size: sz.key,
                                                                        shape: this.state.forestStampShape,
                                                                        treeType: this.state.forestStampTreeType
                                                                    });
                                                                });
                                                            }}
                                                        >
                                                            {sz.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Mountain Stamp Controls */}
                            {(() => {
                                const isMountainStampSelected = this.props.pinnedOption?.type === 'mountain-stamp-tile';
                                return (
                                    <div style={{
                                        margin: '4px 2px 8px 2px',
                                        padding: '8px 6px',
                                        background: isMountainStampSelected ? 'linear-gradient(135deg, rgba(30, 58, 95, 0.95) 0%, rgba(15, 30, 50, 0.95) 100%)' : 'linear-gradient(135deg, rgba(30, 35, 45, 0.85) 0%, rgba(18, 22, 28, 0.9) 100%)',
                                        border: isMountainStampSelected ? '1.5px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.35)',
                                        boxShadow: isMountainStampSelected ? '0 0 10px rgba(56, 189, 248, 0.45)' : '0 2px 6px rgba(0, 0, 0, 0.6)',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px'
                                    }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => {
                                                this.props.handleClick({
                                                    type: 'mountain-stamp-tile',
                                                    size: this.state.mountainStampSize,
                                                    shape: this.state.mountainStampShape,
                                                    mountainType: this.state.mountainStampType
                                                });
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <span style={{ fontSize: '13px' }}>🏔️</span>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    color: isMountainStampSelected ? '#7dd3fc' : '#e2e8f0',
                                                    letterSpacing: '0.4px',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    Mountain Stamp
                                                </span>
                                            </div>
                                            <span style={{
                                                fontSize: '8.5px',
                                                padding: '2px 5px',
                                                borderRadius: '3px',
                                                background: isMountainStampSelected ? '#0284c7' : 'rgba(255,255,255,0.12)',
                                                color: '#ffffff',
                                                fontWeight: 'bold',
                                                letterSpacing: '0.3px'
                                            }}>
                                                {isMountainStampSelected ? 'ACTIVE' : 'SELECT'}
                                            </span>
                                        </div>

                                        {/* Shape toggle: Rect vs Oval */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1px' }}>
                                            <span style={{ fontSize: '9.5px', color: '#94a3b8', fontWeight: 'bold' }}>Shape:</span>
                                            <div style={{ display: 'flex', gap: '3px' }}>
                                                {['rect', 'oval'].map(shape => {
                                                    const active = this.state.mountainStampShape === shape;
                                                    return (
                                                        <button
                                                            key={shape}
                                                            type="button"
                                                            style={{
                                                                fontSize: '9px',
                                                                padding: '2px 6px',
                                                                borderRadius: '3px',
                                                                border: active ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
                                                                background: active ? '#38bdf8' : 'rgba(0,0,0,0.5)',
                                                                color: active ? '#0f172a' : '#cbd5e1',
                                                                fontWeight: active ? '700' : 'normal',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                this.setState({ mountainStampShape: shape }, () => {
                                                                    this.props.handleClick({
                                                                        type: 'mountain-stamp-tile',
                                                                        size: this.state.mountainStampSize,
                                                                        shape: shape,
                                                                        mountainType: this.state.mountainStampType
                                                                    });
                                                                });
                                                            }}
                                                        >
                                                            {shape === 'rect' ? 'Rect' : 'Oval'}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Size selector: S / M / L */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '9.5px', color: '#94a3b8', fontWeight: 'bold' }}>Size:</span>
                                            <div style={{ display: 'flex', gap: '3px' }}>
                                                {[
                                                    { key: 'S', label: 'S (3×3)' },
                                                    { key: 'M', label: 'M (5×5)' },
                                                    { key: 'L', label: 'L (7×7)' }
                                                ].map(sz => {
                                                    const active = this.state.mountainStampSize === sz.key;
                                                    return (
                                                        <button
                                                            key={sz.key}
                                                            type="button"
                                                            style={{
                                                                fontSize: '9px',
                                                                padding: '2px 5px',
                                                                borderRadius: '3px',
                                                                border: active ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
                                                                background: active ? '#38bdf8' : 'rgba(0,0,0,0.5)',
                                                                color: active ? '#0f172a' : '#cbd5e1',
                                                                fontWeight: active ? '700' : 'normal',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                this.setState({ mountainStampSize: sz.key }, () => {
                                                                    this.props.handleClick({
                                                                        type: 'mountain-stamp-tile',
                                                                        size: sz.key,
                                                                        shape: this.state.mountainStampShape,
                                                                        mountainType: this.state.mountainStampType
                                                                    });
                                                                });
                                                            }}
                                                        >
                                                            {sz.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div style={{ fontSize: '9.5px', color: '#64748b', margin: '4px 4px 2px 4px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                Single Tiles:
                            </div>

                            {(this.props.mapMaker.terrainOptions || []).map((tItem, ti) => {
                                const isHovered = this.state.hoveredSubItem?.type === 'terrain' && this.state.hoveredSubItem?.id === ti;
                                const isSelected = this.props.pinnedOption?.type === 'terrain-tile' && this.props.pinnedOption?.id === ti;
                                return <div
                                key={`terrain-${ti}`}
                                className={`palette-option-subcontainer${isHovered ? ' sub-hovered' : ''}${isSelected ? ' sub-selected' : ''}`}
                                onMouseEnter={() => this.setState({ hoveredSubItem: { type: 'terrain', id: ti } })}
                                onMouseLeave={() => this.setState({ hoveredSubItem: null })}
                                onClick={() => {
                                    this.props.handleClick({
                                        type: 'terrain-tile',
                                        id: ti
                                    })
                                }}
                                >
                                    <div className="text-container">{tItem.name}</div>
                                    <Tile
                                    id={ti}
                                    tileSize={this.props.tileSize}
                                    index={ti}
                                    image={images[tItem.image]}
                                    imageOverride={images[tItem.image]}
                                    handleHover={null}
                                    handleClick={null}
                                    isPaletteTile={true}
                                    type={'item'}>
                                    </Tile>
                                </div>
                            })}
                        </div>}
                    </div>
                    )
                })}
            </div>
        )
    }
}

export default BoardsPalette;


