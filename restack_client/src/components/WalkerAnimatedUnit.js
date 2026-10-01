import React from 'react';
import * as images from '../utils/images';

export const WalkerAnimatedUnit = ({ isMoving = true, isAttacking = false, style = {} }) => {
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
            className={`walker-animated-container ${isMoving ? 'is-moving' : ''} ${isAttacking ? 'is-attacking' : ''}`}
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

                @keyframes walkerSawbladeAttackSwing {
                    0% { transform: translateY(0px) rotate(0deg) scale(1); filter: brightness(1); }
                    20% { transform: translateY(-6px) translateX(-4px) rotate(-22deg) scale(0.95); filter: brightness(1.2); }
                    55% { transform: translateY(8px) translateX(12px) rotate(48deg) scale(1.25); filter: brightness(1.5) drop-shadow(0 0 14px #00e5ff); }
                    75% { transform: translateY(4px) translateX(6px) rotate(25deg) scale(1.1); filter: brightness(1.3); }
                    100% { transform: translateY(0px) rotate(0deg) scale(1); filter: brightness(1); }
                }

                @keyframes walkerSawbladeSlashSweep {
                    0% { transform: translate(-50%, -50%) scale(0.4) rotate(-120deg); opacity: 0; }
                    20% { transform: translate(-50%, -50%) scale(1.0) rotate(-40deg); opacity: 1; }
                    60% { transform: translate(-50%, -50%) scale(1.3) rotate(80deg); opacity: 0.95; }
                    100% { transform: translate(-50%, -50%) scale(1.65) rotate(180deg); opacity: 0; }
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

                .walker-animated-container.is-moving:not(.is-attacking) .walker-chassis-layer {
                    animation: walkerChassisBob 0.8s ease-in-out infinite;
                }

                .walker-animated-container.is-attacking .walker-chassis-layer {
                    animation: walkerSawbladeAttackSwing 0.5s cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
                }

                .walker-animated-container.is-attacking .full-clean-layer {
                    animation: walkerSawbladeAttackSwing 0.5s cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
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

            {isAttacking && (
                <div
                    className="walker-sawblade-slash-overlay"
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        width: '150%',
                        height: '150%',
                        pointerEvents: 'none',
                        zIndex: 25,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <svg
                        viewBox="0 0 120 120"
                        style={{
                            width: '100%',
                            height: '100%',
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            animation: 'walkerSawbladeSlashSweep 0.5s ease-out forwards'
                        }}
                    >
                        <defs>
                            <linearGradient id="sawbladeSlashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#00e5ff" stopOpacity="0" />
                                <stop offset="35%" stopColor="#ffb703" stopOpacity="0.85" />
                                <stop offset="75%" stopColor="#ff0055" stopOpacity="1" />
                                <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
                            </linearGradient>
                            <filter id="sawbladeGlow" x="-30%" y="-30%" width="160%" height="160%">
                                <feGaussianBlur stdDeviation="3.5" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        {/* 360/Arc Cleave Slash Curve */}
                        <path
                            d="M 15 65 A 45 45 0 1 1 105 65"
                            fill="none"
                            stroke="url(#sawbladeSlashGrad)"
                            strokeWidth="11"
                            strokeLinecap="round"
                            filter="url(#sawbladeGlow)"
                        />
                        {/* Sparks & sawblade teeth streaks */}
                        <line x1="92" y1="52" x2="112" y2="36" stroke="#ffe600" strokeWidth="3.5" strokeLinecap="round" />
                        <line x1="82" y1="32" x2="102" y2="16" stroke="#ff0055" strokeWidth="3" strokeLinecap="round" />
                        <line x1="52" y1="16" x2="57" y2="2" stroke="#00e5ff" strokeWidth="3.5" strokeLinecap="round" />
                        <line x1="26" y1="32" x2="11" y2="20" stroke="#ffe600" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                </div>
            )}

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
                            transformOrigin: '40% 70%',
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
                    className="full-clean-layer"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        transformOrigin: '50% 50%'
                    }}
                />
            )}
        </div>
    );
};

export default WalkerAnimatedUnit;
