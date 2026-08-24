import React from 'react';
import * as images from '../utils/images';

export const SobekAnimatedUnit = ({ isMoving = true, style = {} }) => {
    const head = images.sobek_head;
    const torso = images.sobek_torso;
    
    // The image named "left_upper_arm" is the monster's left arm, which goes on the viewer's RIGHT.
    // The image named "right_upper_arm" is the monster's right arm, which goes on the viewer's LEFT.
    const armViewerRight = images.sobek_right_upper_arm;
    const forearmViewerRight = images.sobek_right_forearm;
    
    const armViewerLeft = images.sobek_left_upper_arm;
    const forearmViewerLeft = images.sobek_left_forearm;

    const hasModularParts = head && torso && armViewerRight && armViewerLeft && forearmViewerRight && forearmViewerLeft;

    return (
        <div
            className={`sobek-animated-container ${isMoving ? 'is-moving' : ''}`}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: 'visible',
                pointerEvents: 'none',
                ...style
            }}
        >
            <style>{`
                @keyframes sobekTorsoBreathing {
                    0%, 100% { transform: translateY(0px) scaleY(1); }
                    50% { transform: translateY(-2px) scaleY(1.02); }
                }

                @keyframes sobekHeadBob {
                    0%, 100% { transform: rotate(0deg) translateY(0px); }
                    25% { transform: rotate(-2deg) translateY(2px); }
                    75% { transform: rotate(2deg) translateY(-2px); }
                }

                @keyframes sobekViewerLeftShoulderSwing {
                    0%, 100% { transform: rotate(-5deg); }
                    50% { transform: rotate(5deg); }
                }

                @keyframes sobekViewerRightShoulderSwing {
                    0%, 100% { transform: rotate(5deg); }
                    50% { transform: rotate(-5deg); }
                }

                @keyframes sobekViewerLeftElbowSwing {
                    0%, 100% { transform: rotate(-10deg); }
                    50% { transform: rotate(10deg); }
                }

                @keyframes sobekViewerRightElbowSwing {
                    0%, 100% { transform: rotate(10deg); }
                    50% { transform: rotate(-10deg); }
                }

                .sobek-animated-container.is-moving .sobek-torso {
                    animation: sobekTorsoBreathing 2s ease-in-out infinite;
                }
                .sobek-animated-container.is-moving .sobek-head {
                    animation: sobekHeadBob 3s ease-in-out infinite;
                }
                .sobek-animated-container.is-moving .sobek-viewer-left-upper {
                    animation: sobekViewerLeftShoulderSwing 1.5s ease-in-out infinite alternate;
                }
                .sobek-animated-container.is-moving .sobek-viewer-right-upper {
                    animation: sobekViewerRightShoulderSwing 1.5s ease-in-out infinite alternate;
                }
                .sobek-animated-container.is-moving .sobek-viewer-left-forearm {
                    animation: sobekViewerLeftElbowSwing 1.5s ease-in-out infinite alternate;
                }
                .sobek-animated-container.is-moving .sobek-viewer-right-forearm {
                    animation: sobekViewerRightElbowSwing 1.5s ease-in-out infinite alternate;
                }
            `}</style>

            {hasModularParts ? (
                <>
                    {/* Torso (Z-index 2) */}
                    <img
                        src={torso}
                        alt="torso"
                        className="sobek-torso"
                        style={{
                            position: 'absolute',
                            left: '25%',
                            top: '25%',
                            width: '50%',
                            height: '60%',
                            objectFit: 'contain',
                            zIndex: 2,
                            transformOrigin: 'bottom center'
                        }}
                    />

                    {/* Viewer Left Upper Arm (Z-index 1) - monster's right arm, behind torso */}
                    <img
                        src={armViewerLeft}
                        alt="viewer_left_upper_arm"
                        className="sobek-viewer-left-upper"
                        style={{
                            position: 'absolute',
                            left: '10%',
                            top: '30%',
                            width: '25%',
                            height: '40%',
                            objectFit: 'contain',
                            zIndex: 1,
                            transformOrigin: '100% 18.75%' // shoulder joint
                        }}
                    />

                    {/* Viewer Right Upper Arm (Z-index 3) - monster's left arm, in front of torso */}
                    <img
                        src={armViewerRight}
                        alt="viewer_right_upper_arm"
                        className="sobek-viewer-right-upper"
                        style={{
                            position: 'absolute',
                            left: '65%',
                            top: '30%',
                            width: '25%',
                            height: '40%',
                            objectFit: 'contain',
                            zIndex: 3,
                            transformOrigin: '0% 18.75%' // shoulder joint
                        }}
                    />

                    {/* Viewer Left Forearm/Hand (Z-index 1) - attached to viewer left upper arm */}
                    <div
                        className="sobek-viewer-left-upper"
                        style={{
                            position: 'absolute',
                            left: '10%',
                            top: '30%',
                            width: '25%',
                            height: '40%',
                            zIndex: 1,
                            transformOrigin: '100% 18.75%',
                        }}
                    >
                        <img
                            src={forearmViewerLeft}
                            alt="viewer_left_forearm"
                            className="sobek-viewer-left-forearm"
                            style={{
                                position: 'absolute',
                                left: '-100%',
                                top: '62.5%',
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                transformOrigin: '100% 18.75%' // elbow joint
                            }}
                        />
                    </div>

                    {/* Viewer Right Forearm/Hand (Z-index 4) - attached to viewer right upper arm */}
                    <div
                        className="sobek-viewer-right-upper"
                        style={{
                            position: 'absolute',
                            left: '65%',
                            top: '30%',
                            width: '25%',
                            height: '40%',
                            zIndex: 4,
                            transformOrigin: '0% 18.75%',
                        }}
                    >
                        <img
                            src={forearmViewerRight}
                            alt="viewer_right_forearm"
                            className="sobek-viewer-right-forearm"
                            style={{
                                position: 'absolute',
                                left: '100%',
                                top: '62.5%',
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                transformOrigin: '0% 18.75%' // elbow joint
                            }}
                        />
                    </div>

                    {/* Head (Z-index 5) - on top of everything */}
                    <img
                        src={head}
                        alt="head"
                        className="sobek-head"
                        style={{
                            position: 'absolute',
                            left: '35%',
                            top: '12%',
                            width: '30%',
                            height: '35%',
                            objectFit: 'contain',
                            zIndex: 5,
                            transformOrigin: 'bottom center' // neck joint
                        }}
                    />
                </>
            ) : (
                <img
                    src={head}
                    alt="Sobek Unit"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                    }}
                />
            )}
        </div>
    );
};

export default SobekAnimatedUnit;
