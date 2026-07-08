import React from 'react';

export default function Overlay(props) {
    // {id: combatant.id, animationType: animationType, data: combatant}
    let content = null;
    switch(props.animationType){
        case 'targetted':
            // Only render the reticle if the combatant is not dead
            if (props.data?.dead) return null;
            content =  <div className={`overlay-content overlay-targetted ${props.data?.color ? props.data.color : 'default-color'} ${props.data.fadeOut ? 'fade-out' : ''}`}>
                            <div className="relative-child">
                                <div className={`moving-square top-left${props.shouldBounceReticle ? ' bounce' : ''}`} style={{borderTop: `2px solid ${props.data?.color}`, borderLeft: `2px solid ${props.data?.color}`}}></div>
                                <div className={`moving-square top-right${props.shouldBounceReticle ? ' bounce' : ''}`} style={{borderTop: `2px solid ${props.data?.color}`, borderRight: `2px solid ${props.data?.color}`}}></div>
                                <div className={`moving-square bot-left${props.shouldBounceReticle ? ' bounce' : ''}`} style={{borderBottom: `2px solid ${props.data?.color}`, borderLeft: `2px solid ${props.data?.color}`}}></div>
                                <div className={`moving-square bot-right${props.shouldBounceReticle ? ' bounce' : ''}`} style={{borderBottom: `2px solid ${props.data?.color}`, borderRight: `2px solid ${props.data?.color}`}}></div>
                            </div>
                        </div>;
            break;
        case 'blinded':
            content = <div className="overlay-content">
                            BLINDED
                        </div>;
            break;
        case 'glowing-eyes':
            content = <div className={`overlay-content overlay-glowing-eyes ${props.data.fadeOut ? 'fade-out' : ''}`}>
                        <div className="relative-child">
                            <div className="eye redbackgroud"></div>
                        </div>
                    </div>;
            break;
        default:
            return null;
    }
    return content;
}