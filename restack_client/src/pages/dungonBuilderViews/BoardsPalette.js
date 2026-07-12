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
            hoveredSubItem: null  // { type: 'monster'|'gate', id: i }
        }
    }

    getOptionLabel = (optionType) => {
        if (optionType === 'jewels') return 'Jewels';
        if (optionType === 'runes') return 'Runes';
        if (optionType === 'connecting path') return 'Connecting Path';
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
                    return (
                    <div key={i} className="palette-options-pane">
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
                                    type={'item'}>
                                    </Tile>
                                </div>
                            })}
                            {Object.values(this.props.monsterManager.monsters).map((monster,i)=>{
                                const isHovered = this.state.hoveredSubItem?.type === 'monster' && this.state.hoveredSubItem?.id === i;
                                const isSelected = this.props.pinnedOption?.type === 'monster-tile' && this.props.pinnedOption?.id === i;
                                return <div 
                                key={i} 
                                className={`palette-option-subcontainer${isHovered ? ' sub-hovered' : ''}${isSelected ? ' sub-selected' : ''}`}
                                onMouseEnter={() => this.setState({ hoveredSubItem: { type: 'monster', id: i } })}
                                onMouseLeave={() => this.setState({ hoveredSubItem: null })}
                                onClick={() => {
                                    this.props.handleClick({
                                    type: 'monster-tile',
                                    id: i
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
                        {tile.optionType === 'lore_tablet' && <div className={`palette-option-expandable-container ${this.props.optionClickedIdx === i ? 'expanded' : ''}`}>
                            {(this.props.mapMaker.loreTabletOptions || []).map((tabletItem, li) => {
                                const isHovered = this.state.hoveredSubItem?.type === 'lore_tablet' && this.state.hoveredSubItem?.id === li;
                                const isSelected = this.props.pinnedOption?.type === 'lore-tablet-tile' && this.props.pinnedOption?.id === li;
                                return <div
                                key={`lore-tablet-${li}`}
                                className={`palette-option-subcontainer${isHovered ? ' sub-hovered' : ''}${isSelected ? ' sub-selected' : ''}`}
                                onMouseEnter={() => this.setState({ hoveredSubItem: { type: 'lore_tablet', id: li } })}
                                onMouseLeave={() => this.setState({ hoveredSubItem: null })}
                                onClick={() => {
                                    this.props.handleClick({
                                        type: 'lore-tablet-tile',
                                        id: li
                                    })
                                }}
                                >
                                    <div className="text-container">{tabletItem.name}</div>
                                    <div style={{
                                        width: this.props.tileSize + 'px',
                                        height: this.props.tileSize + 'px',
                                        backgroundColor: tabletItem.color,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: Math.max(8, this.props.tileSize * 0.35) + 'px',
                                        flexShrink: 0
                                    }}><span role="img" aria-label="scroll">📜</span></div>
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


