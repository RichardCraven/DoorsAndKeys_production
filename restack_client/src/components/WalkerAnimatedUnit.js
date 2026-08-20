import React from 'react';
import * as images from '../utils/images';

export const WalkerAnimatedUnit = ({ isMoving = true, style = {} }) => {
    const chassis = images.walker_chassis || images.walker_turret_full;
    const legFL = images.walker_leg_fl;
    const legFR = images.walker_leg_fr;
    const legML = images.walker_leg_ml;
    const legMR = images.walker_leg_mr;
    const legBL = images.walker_leg_bl;
    const legBR = images.walker_leg_br;

    const fullClean = images.walker_turret_full;

    const hasModularLegs = legFL && legFR && legML && legMR && legBL && legBR && chassis;

    return (
        <div
            className={`walker-animated-container ${isMoving ? 'is-moving' : ''}`}
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
                @keyframes walkerChassisBob {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    25% { transform: translateY(-2px) rotate(0.8deg); }
                    50% { transform: translateY(1.5px) rotate(0deg); }
                    75% { transform: translateY(-2px) rotate(-0.8deg); }
                }

                @keyframes walkerLegFrontLeft {
                    0%, 100% { transform: rotate(-14deg); }
                    50% { transform: rotate(14deg); }
                }

                @keyframes walkerLegFrontRight {
                    0%, 100% { transform: rotate(14deg); }
                    50% { transform: rotate(-14deg); }
                }

                @keyframes walkerLegMidLeft {
                    0%, 100% { transform: rotate(12deg); }
                    50% { transform: rotate(-12deg); }
                }

                @keyframes walkerLegMidRight {
                    0%, 100% { transform: rotate(-12deg); }
                    50% { transform: rotate(12deg); }
                }

                @keyframes walkerLegBackLeft {
                    0%, 100% { transform: rotate(-10deg); }
                    50% { transform: rotate(10deg); }
                }

                @keyframes walkerLegBackRight {
                    0%, 100% { transform: rotate(10deg); }
                    50% { transform: rotate(-10deg); }
                }

                .walker-animated-container.is-moving .walker-chassis-layer {
                    animation: walkerChassisBob 0.8s ease-in-out infinite;
                }

                .walker-animated-container.is-moving .leg-fl {
                    animation: walkerLegFrontLeft 0.8s ease-in-out infinite;
                }
                .walker-animated-container.is-moving .leg-fr {
                    animation: walkerLegFrontRight 0.8s ease-in-out infinite;
                }
                .walker-animated-container.is-moving .leg-ml {
                    animation: walkerLegMidLeft 0.8s ease-in-out infinite;
                }
                .walker-animated-container.is-moving .leg-mr {
                    animation: walkerLegMidRight 0.8s ease-in-out infinite;
                }
                .walker-animated-container.is-moving .leg-bl {
                    animation: walkerLegBackLeft 0.8s ease-in-out infinite;
                }
                .walker-animated-container.is-moving .leg-br {
                    animation: walkerLegBackRight 0.8s ease-in-out infinite;
                }
            `}</style>

            {hasModularLegs ? (
                <>
                    {/* Back Legs (Z-index 1) */}
                    <img
                        src={legBL}
                        alt="leg_bl"
                        className="walker-leg leg-bl"
                        style={{
                            position: 'absolute',
                            left: '17.1%',
                            top: '39.8%',
                            width: '11.7%',
                            height: '12.0%',
                            transformOrigin: '75% 20%',
                            zIndex: 1
                        }}
                    />
                    <img
                        src={legBR}
                        alt="leg_br"
                        className="walker-leg leg-br"
                        style={{
                            position: 'absolute',
                            left: '71.6%',
                            top: '35.4%',
                            width: '11.6%',
                            height: '20.7%',
                            transformOrigin: '25% 20%',
                            zIndex: 1
                        }}
                    />

                    {/* Mid Legs (Z-index 2) */}
                    <img
                        src={legML}
                        alt="leg_ml"
                        className="walker-leg leg-ml"
                        style={{
                            position: 'absolute',
                            left: '7.1%',
                            top: '42.8%',
                            width: '13.9%',
                            height: '28.6%',
                            transformOrigin: '80% 15%',
                            zIndex: 2
                        }}
                    />
                    <img
                        src={legMR}
                        alt="leg_mr"
                        className="walker-leg leg-mr"
                        style={{
                            position: 'absolute',
                            left: '75.1%',
                            top: '41.4%',
                            width: '16.8%',
                            height: '35.7%',
                            transformOrigin: '20% 15%',
                            zIndex: 2
                        }}
                    />

                    {/* Main Chassis & Sawblade Arm (Z-index 5) */}
                    <img
                        src={chassis}
                        alt="chassis"
                        className="walker-chassis-layer"
                        style={{
                            position: 'absolute',
                            left: '6.6%',
                            top: '9.8%',
                            width: '86.7%',
                            height: '52.1%',
                            objectFit: 'contain',
                            zIndex: 5
                        }}
                    />

                    {/* Front Legs (Z-index 10) */}
                    <img
                        src={legFL}
                        alt="leg_fl"
                        className="walker-leg leg-fl"
                        style={{
                            position: 'absolute',
                            left: '13.3%',
                            top: '47.9%',
                            width: '17.5%',
                            height: '39.6%',
                            transformOrigin: '80% 10%',
                            zIndex: 10
                        }}
                    />
                    <img
                        src={legFR}
                        alt="leg_fr"
                        className="walker-leg leg-fr"
                        style={{
                            position: 'absolute',
                            left: '67.1%',
                            top: '48.2%',
                            width: '20.6%',
                            height: '38.5%',
                            transformOrigin: '20% 10%',
                            zIndex: 10
                        }}
                    />
                </>
            ) : (
                <img
                    src={fullClean}
                    alt="Walker Unit"
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

export default WalkerAnimatedUnit;
