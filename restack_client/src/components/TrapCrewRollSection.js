import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default class TrapCrewRollSection extends Component {
    static propTypes = {
        crewResults: PropTypes.arrayOf(
            PropTypes.shape({
                name: PropTypes.string,
                dexStat: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
                d20Roll: PropTypes.number,
                keenEyeBonus: PropTypes.number,
                totalRoll: PropTypes.number,
                saved: PropTypes.bool,
                damageTaken: PropTypes.number
            })
        ),
        animateRolls: PropTypes.bool,
        rollDurationMs: PropTypes.number,
        tickIntervalMs: PropTypes.number,
        onAllComplete: PropTypes.func
    };

    static defaultProps = {
        crewResults: [],
        animateRolls: typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test' ? false : true,
        rollDurationMs: 500,
        tickIntervalMs: 40
    };

    constructor(props) {
        super(props);
        const shouldAnimate = props.animateRolls !== undefined
            ? Boolean(props.animateRolls)
            : (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test' ? false : true);
        const total = (props.crewResults || []).length;

        this.state = {
            lockedCount: shouldAnimate ? 0 : total,
            cyclingNumber: Math.floor(Math.random() * 20) + 1,
            isCompleted: !shouldAnimate || total === 0
        };

        this.cycleInterval = null;
        this.lockTimeout = null;
    }

    componentDidMount() {
        if (!this.state.isCompleted && this.props.animateRolls) {
            this.startRoll(0);
        }
    }

    componentDidUpdate(prevProps) {
        if (this.props.crewResults !== prevProps.crewResults || this.props.animateRolls !== prevProps.animateRolls) {
            this.clearTimers();
            const shouldAnimate = this.props.animateRolls !== undefined
                ? Boolean(this.props.animateRolls)
                : (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test' ? false : true);
            const total = (this.props.crewResults || []).length;

            this.setState({
                lockedCount: shouldAnimate ? 0 : total,
                cyclingNumber: Math.floor(Math.random() * 20) + 1,
                isCompleted: !shouldAnimate || total === 0
            }, () => {
                if (shouldAnimate && total > 0) {
                    this.startRoll(0);
                }
            });
        }
    }

    componentWillUnmount() {
        this.clearTimers();
    }

    clearTimers() {
        if (this.cycleInterval) {
            clearInterval(this.cycleInterval);
            this.cycleInterval = null;
        }
        if (this.lockTimeout) {
            clearTimeout(this.lockTimeout);
            this.lockTimeout = null;
        }
    }

    startRoll = (index) => {
        this.clearTimers();
        const crewResults = this.props.crewResults || [];
        if (index >= crewResults.length) {
            this.setState({ isCompleted: true, lockedCount: crewResults.length }, () => {
                if (this.props.onAllComplete) this.props.onAllComplete();
            });
            return;
        }

        // Cycle numbers rapidly like a slot machine reel
        this.cycleInterval = setInterval(() => {
            const randomD20 = Math.floor(Math.random() * 20) + 1;
            this.setState({ cyclingNumber: randomD20 });
        }, this.props.tickIntervalMs);

        // Lock in after rollDurationMs (0.5 seconds default)
        this.lockTimeout = setTimeout(() => {
            if (this.cycleInterval) {
                clearInterval(this.cycleInterval);
                this.cycleInterval = null;
            }

            const nextLocked = index + 1;
            const completed = nextLocked >= crewResults.length;

            this.setState({
                lockedCount: nextLocked,
                isCompleted: completed
            }, () => {
                if (!completed) {
                    this.startRoll(nextLocked);
                } else if (this.props.onAllComplete) {
                    this.props.onAllComplete();
                }
            });
        }, this.props.rollDurationMs);
    };

    skipToEnd = () => {
        this.clearTimers();
        const total = (this.props.crewResults || []).length;
        this.setState({
            lockedCount: total,
            isCompleted: true
        }, () => {
            if (this.props.onAllComplete) this.props.onAllComplete();
        });
    };

    isComplete = () => {
        return this.state.isCompleted;
    };

    render() {
        const { crewResults } = this.props;
        const { lockedCount, cyclingNumber, isCompleted } = this.state;

        return (
            <div
                className="trap-crew-results"
                onClick={!isCompleted ? this.skipToEnd : undefined}
                style={!isCompleted ? { cursor: 'pointer' } : undefined}
                title={!isCompleted ? 'Click to skip roll animation' : undefined}
            >
                {(crewResults || []).map((cr, idx) => {
                    const isLocked = idx < lockedCount;
                    const isRolling = idx === lockedCount && !isCompleted;
                    const isPending = idx > lockedCount;

                    let rowStatusClass = 'pending';
                    if (isLocked) {
                        rowStatusClass = cr.saved ? 'saved' : 'hit';
                    } else if (isRolling) {
                        rowStatusClass = 'rolling';
                    }

                    return (
                        <div
                            key={idx}
                            className={`trap-crew-row ${rowStatusClass}`}
                            data-testid={`trap-crew-row-${idx}`}
                        >
                            <span className="trap-crew-name">{cr.name}</span>
                            <span className="trap-roll-info">
                                d20:{' '}
                                {isLocked && (
                                    <span className="trap-roll-slot locked">{cr.d20Roll}</span>
                                )}
                                {isRolling && (
                                    <span className="trap-roll-slot rolling">{cyclingNumber}</span>
                                )}
                                {isPending && (
                                    <span className="trap-roll-slot pending">--</span>
                                )}
                                {' + DEX '}{cr.dexStat}
                                {cr.keenEyeBonus > 0 ? ` + KE ${cr.keenEyeBonus}` : ''}
                                {' = '}
                                {isLocked ? cr.totalRoll : '--'}
                            </span>
                            {isLocked ? (
                                <span className={`trap-result-label ${cr.saved ? 'dodged' : 'damaged'} trap-result-reveal`}>
                                    {cr.saved ? 'Dodged!' : `-${cr.damageTaken} HP`}
                                </span>
                            ) : (
                                <span
                                    className="trap-result-label placeholder"
                                    aria-hidden="true"
                                >
                                    &nbsp;
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }
}
