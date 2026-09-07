import React, { Component } from 'react';

export class PerformanceOverlay extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isCollapsed: true,
            isHidden: false,
            lastPurgeMsg: ''
        };
        this._rafId = null;
        this._frameCount = 0;
        this._lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
        this._lastFpsUpdate = this._lastTime;

        // Direct DOM refs to avoid React re-render overhead
        this.badgeFpsRef = React.createRef();
        this.badgePingRef = React.createRef();
        this.badgeDotRef = React.createRef();
        this.badgeBorderRef = React.createRef();

        this.panelFpsRef = React.createRef();
        this.panelPingRef = React.createRef();
        this.panelHeapRef = React.createRef();
    }

    componentDidMount() {
        this.startMonitoring();
    }

    componentWillUnmount() {
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }

    startMonitoring = () => {
        const loop = (now) => {
            this._frameCount++;
            const delta = now - this._lastTime;
            this._lastTime = now;

            // Update metrics twice per second without triggering React re-renders
            if (now - this._lastFpsUpdate >= 500) {
                const interval = now - this._lastFpsUpdate;
                const measuredFps = Math.min(60, Math.round((this._frameCount * 1000) / interval));
                
                // Expected delta for current frame rate (accounts for game's 20fps canvas throttling)
                const expectedDelta = measuredFps > 0 ? 1000 / measuredFps : 50;
                const mainThreadJitterMs = Math.max(0, Math.round((delta - expectedDelta) * 10) / 10);

                this._frameCount = 0;
                this._lastFpsUpdate = now;

                let usedMb = 0;
                let totalMb = 0;
                if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
                    usedMb = Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024));
                    totalMb = Math.round(window.performance.memory.totalJSHeapSize / (1024 * 1024));
                }

                // 18+ FPS is Green (since the engine throttles canvas rendering to ~20 FPS by design)
                const fpsColor = measuredFps >= 18 ? '#4ade80' : measuredFps >= 12 ? '#facc15' : '#f87171';
                const pingColor = mainThreadJitterMs <= 15 ? '#4ade80' : mainThreadJitterMs <= 35 ? '#facc15' : '#f87171';

                // Update collapsed badge DOM directly
                if (this.badgeFpsRef.current) {
                    this.badgeFpsRef.current.textContent = `⚡ ${measuredFps} FPS`;
                }
                if (this.badgePingRef.current) {
                    this.badgePingRef.current.textContent = `${mainThreadJitterMs}ms`;
                    this.badgePingRef.current.style.color = pingColor;
                }
                if (this.badgeDotRef.current) {
                    this.badgeDotRef.current.style.background = fpsColor;
                }
                if (this.badgeBorderRef.current) {
                    this.badgeBorderRef.current.style.borderColor = fpsColor;
                }

                // Update expanded panel DOM directly
                if (this.panelFpsRef.current) {
                    this.panelFpsRef.current.textContent = `${measuredFps} FPS`;
                    this.panelFpsRef.current.style.color = fpsColor;
                }
                if (this.panelPingRef.current) {
                    this.panelPingRef.current.textContent = `${mainThreadJitterMs} ms`;
                    this.panelPingRef.current.style.color = pingColor;
                }
                if (this.panelHeapRef.current && usedMb > 0) {
                    this.panelHeapRef.current.textContent = `${usedMb} MB ${totalMb > 0 ? `/ ${totalMb} MB` : ''}`;
                }
            }

            this._rafId = requestAnimationFrame(loop);
        };

        this._rafId = requestAnimationFrame(loop);
    };

    handlePurgeMemory = () => {
        if (typeof this.props.onPurgeMemory === 'function') {
            this.props.onPurgeMemory();
        }

        // Force Scavenger GC heuristic by allocating and immediately releasing a temporary buffer
        try {
            let temp = new Array(1000000);
            temp.fill(0);
            temp = null;
        } catch (_) { }

        if (typeof window !== 'undefined' && typeof window.gc === 'function') {
            try { window.gc(); } catch (_) { }
        }

        const nowUsed = (typeof window !== 'undefined' && window.performance && window.performance.memory)
            ? Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024))
            : null;

        this.setState({
            lastPurgeMsg: nowUsed ? `Purged! Heap: ${nowUsed} MB` : 'Purged & Cleaned!'
        });

        setTimeout(() => {
            this.setState({ lastPurgeMsg: '' });
        }, 2500);
    };

    render() {
        if (this.state.isHidden) return null;

        const { isCollapsed, lastPurgeMsg } = this.state;

        if (isCollapsed) {
            return (
                <div
                    ref={this.badgeBorderRef}
                    onClick={() => this.setState({ isCollapsed: false })}
                    title="Click to view Performance Monitor & Memory Cleaner"
                    style={{
                        position: 'fixed',
                        bottom: '12px',
                        right: '12px',
                        zIndex: 99999,
                        background: 'rgba(15, 23, 42, 0.85)',
                        border: '1px solid #4ade80',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5), inset 0 0 8px rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(8px)',
                        borderRadius: '20px',
                        padding: '6px 14px',
                        color: '#f8fafc',
                        fontFamily: "'Inter', monospace, sans-serif",
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        userSelect: 'none',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <span ref={this.badgeDotRef} style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }} />
                    <span ref={this.badgeFpsRef}>⚡ -- FPS</span>
                    <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>|</span>
                    <span ref={this.badgePingRef} style={{ color: '#4ade80' }}>--ms</span>
                </div>
            );
        }

        return (
            <div
                style={{
                    position: 'fixed',
                    bottom: '12px',
                    right: '12px',
                    zIndex: 99999,
                    width: '245px',
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
                    border: '1px solid rgba(229, 181, 79, 0.4)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 15px rgba(229, 181, 79, 0.15)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    color: '#f8fafc',
                    fontFamily: "'Cinzel', 'Inter', monospace, sans-serif",
                    fontSize: '12px',
                    userSelect: 'none'
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontWeight: '700', letterSpacing: '1px', color: '#f9b115', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⚡ PERF MONITOR</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                            onClick={() => this.setState({ isCollapsed: true })}
                            title="Minimize overlay"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.6)',
                                cursor: 'pointer',
                                fontSize: '14px',
                                padding: '0 4px'
                            }}
                        >
                            ─
                        </button>
                        <button
                            onClick={() => this.setState({ isHidden: true })}
                            title="Close overlay completely"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.6)',
                                cursor: 'pointer',
                                fontSize: '14px',
                                padding: '0 4px'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', fontFamily: 'monospace' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(240, 237, 229, 0.7)' }}>Frame Rate:</span>
                        <span ref={this.panelFpsRef} style={{ color: '#4ade80', fontWeight: '700', fontSize: '13px' }}>-- FPS</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(240, 237, 229, 0.7)' }}>JS Ping (Delay):</span>
                        <span ref={this.panelPingRef} style={{ color: '#4ade80', fontWeight: '700', fontSize: '13px' }}>-- ms</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(240, 237, 229, 0.7)' }}>JS Heap Memory:</span>
                        <span ref={this.panelHeapRef} style={{ color: '#38bdf8', fontWeight: '700', fontSize: '13px' }}>-- MB</span>
                    </div>
                </div>

                {/* Purge Memory Button */}
                <button
                    onClick={this.handlePurgeMemory}
                    style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: '1px solid rgba(74, 222, 128, 0.6)',
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: '#86efac',
                        fontFamily: "'Cinzel', serif",
                        fontSize: '11px',
                        fontWeight: '600',
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        boxShadow: 'inset 0 0 10px rgba(74, 222, 128, 0.1)',
                        transition: 'all 0.2s ease'
                    }}
                >
                    🧹 PURGE MEMORY & ARRAYS
                </button>

                {lastPurgeMsg && (
                    <div style={{ textAlign: 'center', color: '#4ade80', fontSize: '11px', marginTop: '8px', fontWeight: '600' }}>
                        {lastPurgeMsg}
                    </div>
                )}
            </div>
        );
    }
}

export default PerformanceOverlay;
