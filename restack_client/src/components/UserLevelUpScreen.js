/**
 * UserLevelUpScreen.js
 * User Level-Up screen presented when the user gains a level of Free Will.
 * Every 10 Free Will points = 1 User Level.
 * Presents 4 randomly selected User Perks for the player to choose 1.
 */

import React, { Component } from 'react';
import FreeWillStatBar from './FreeWillStatBar';
import { getRandomUserPerkOptions, getUserPerks } from '../utils/user-perks';
import { getMeta, storeMeta, getUserId } from '../utils/session-handler';
import { updateUserRequest } from '../utils/api-handler';
import './UserLevelUpScreen.css';

class UserLevelUpScreen extends Component {
    constructor(props) {
        super(props);
        const meta = props.customMeta || getMeta() || {};
        const perkOptions = getRandomUserPerkOptions(meta, 4);

        this.state = {
            perkOptions,
            selectedPerkId: null,
            meta
        };
    }

    componentDidMount() {
        // Regenerate options if needed
        const meta = this.props.customMeta || getMeta() || {};
        if (this.state.perkOptions.length === 0) {
            this.setState({
                perkOptions: getRandomUserPerkOptions(meta, 4),
                meta
            });
        }
    }

    handleSelectPerk = (perkId) => {
        this.setState({ selectedPerkId: perkId });
    };

    handleClaimPerk = () => {
        const { selectedPerkId } = this.state;
        if (!selectedPerkId) return;

        try {
            const meta = getMeta() || {};
            const existingPerks = Array.isArray(meta.userPerks) ? [...meta.userPerks] : [];
            if (!existingPerks.includes(selectedPerkId)) {
                existingPerks.push(selectedPerkId);
                meta.userPerks = existingPerks;
                storeMeta(meta);
                try { updateUserRequest(getUserId(), meta).catch(() => {}); } catch (e) {}
            }
        } catch (e) {
            console.error('Failed to claim user perk:', e);
        }

        if (typeof this.props.onComplete === 'function') {
            this.props.onComplete(selectedPerkId);
        }
    };

    render() {
        const { perkOptions, selectedPerkId, meta } = this.state;
        const freeWill = typeof meta?.freeWill === 'number' ? meta.freeWill : (getMeta()?.freeWill || 0);

        return (
            <div className="user-levelup-overlay">
                <div className="user-levelup-container">
                    {/* Header */}
                    <div className="user-levelup-header">
                        <div className="user-levelup-title-flash">USER LEVEL UP!</div>
                        <div className="user-levelup-subtitle">
                            You have unlocked new Free Will power. Choose 1 User Perk to empower your journey:
                        </div>
                        <div className="user-levelup-statbar-wrap">
                            <FreeWillStatBar freeWill={freeWill} animateOnMount={true} delayMs={300} />
                        </div>
                    </div>

                    <div className="user-levelup-section-label">Select 1 User Perk</div>

                    {/* Perks Grid */}
                    <div className="user-perks-grid">
                        {perkOptions.map((perk) => {
                            const isSelected = selectedPerkId === perk.id;
                            return (
                                <div
                                    key={perk.id}
                                    className={`user-perk-card ${isSelected ? 'selected' : ''}`}
                                    onClick={() => this.handleSelectPerk(perk.id)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === 'Enter' && this.handleSelectPerk(perk.id)}
                                >
                                    <div className="user-perk-card-header">
                                        <div className="user-perk-icon-title">
                                            <span className="user-perk-icon">{perk.icon}</span>
                                            <span className="user-perk-name">{perk.name}</span>
                                        </div>
                                        <span className="user-perk-badge">{perk.badge}</span>
                                    </div>
                                    <div className="user-perk-shortdesc">{perk.shortDesc}</div>
                                    <div className="user-perk-desc">{perk.desc}</div>
                                    {isSelected && <div className="user-perk-check">✓</div>}
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="user-levelup-footer">
                        <button
                            className="user-levelup-claim-btn"
                            onClick={this.handleClaimPerk}
                            disabled={!selectedPerkId}
                        >
                            CLAIM PERK
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

export default UserLevelUpScreen;
