import React from 'react';
import * as images from '../utils/images';

export default function Overlay(props) {
    // {id: combatant.id, animationType: animationType, data: combatant}
    let content = null;
    switch(props.animationType){
        case 'transform_transition_overlay':
            const overlayImg = images.transform_transition_overlay?.default || images.transform_transition_overlay;
            content = (
                <div 
                    className="overlay-content overlay-transform-transition"
                    style={{
                        position: 'absolute',
                        top: '-50%',
                        left: '-50%',
                        width: '200%',
                        height: '200%',
                        backgroundImage: `url(${overlayImg})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        zIndex: 10,
                        animation: 'transformTransitionOverlay 1.5s ease-in-out forwards',
                        pointerEvents: 'none'
                    }}
                />
            );
            break;
        case 'transform_charging_overlay':
            const chargingImg = images.transform_transition_overlay?.default || images.transform_transition_overlay;
            content = (
                <div 
                    className="overlay-content overlay-transform-charging"
                    style={{
                        position: 'absolute',
                        top: '-30%',
                        left: '-30%',
                        width: '160%',
                        height: '160%',
                        backgroundImage: `url(${chargingImg})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        zIndex: 10,
                        animation: 'transformTransitionCharging 2s ease-in-out infinite alternate',
                        pointerEvents: 'none',
                        mixBlendMode: 'screen',
                        opacity: 0.9
                    }}
                />
            );
            break;
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