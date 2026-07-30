import React, { Component } from 'react';

// Global caches to prevent redundant network fetches or canvas generation
const imageLoadCache = new Set();
const lowResDataCache = new Map();

/**
 * Generates or retrieves a tiny 20x20 canvas JPEG data URL (~400 bytes) for instant preview.
 */
export function getLowResPlaceholder(src) {
    if (!src) return null;
    if (lowResDataCache.has(src)) return lowResDataCache.get(src);
    
    // Attempt offscreen low-res generation if src is already cached in DOM
    try {
        const img = new Image();
        img.src = src;
        if (img.complete && img.naturalWidth > 0) {
            const canvas = document.createElement('canvas');
            canvas.width = 20;
            canvas.height = 20;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 20, 20);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.3);
            lowResDataCache.set(src, dataUrl);
            return dataUrl;
        }
    } catch (e) {
        // Fallback for cross-origin or unready images
    }

    return null;
}

/**
 * Pre-caches low-resolution micro-thumbnails asynchronously.
 */
export function preloadLowResPlaceholder(src) {
    if (!src || lowResDataCache.has(src)) return;
    const img = new Image();
    img.src = src;
    img.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 20;
            canvas.height = 20;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 20, 20);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.3);
            lowResDataCache.set(src, dataUrl);
        } catch (e) {}
    };
}

export class ProgressiveBgImage extends Component {
    _isMounted = false;

    constructor(props) {
        super(props);
        const { src } = props;
        const isLoaded = imageLoadCache.has(src);
        this.state = {
            loaded: isLoaded,
            lowResUrl: getLowResPlaceholder(src)
        };
    }

    componentDidMount() {
        this._isMounted = true;
        this.loadImage(this.props.src);
    }

    componentDidUpdate(prevProps) {
        if (prevProps.src !== this.props.src) {
            const isLoaded = imageLoadCache.has(this.props.src);
            this.setState({
                loaded: isLoaded,
                lowResUrl: getLowResPlaceholder(this.props.src)
            });
            this.loadImage(this.props.src);
        }
    }

    componentWillUnmount() {
        this._isMounted = false;
    }

    loadImage(src) {
        if (!src) return;
        if (imageLoadCache.has(src)) {
            if (this._isMounted && !this.state.loaded) {
                this.setState({ loaded: true });
            }
            return;
        }

        const img = new Image();
        img.src = src;
        img.onload = () => {
            imageLoadCache.add(src);
            preloadLowResPlaceholder(src);
            if (this._isMounted) {
                this.setState({ loaded: true });
            }
        };
        img.onerror = () => {
            imageLoadCache.add(src);
            if (this._isMounted) {
                this.setState({ loaded: true });
            }
        };
    }

    render() {
        const { src, className = '', style = {}, children, onClick, title, id, onMouseEnter, onMouseLeave, onDoubleClick } = this.props;
        const { loaded, lowResUrl } = this.state;

        // When loaded, render full high-res. While loading, render low-res placeholder or blurred version
        const currentBg = loaded ? src : (lowResUrl || src);
        const transitionStyles = {
            transition: 'filter 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.25s ease',
            filter: loaded ? 'none' : 'blur(4px) contrast(1.1)',
            opacity: loaded ? 1 : 0.85
        };

        return (
            <div
                id={id}
                className={className}
                title={title}
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                style={{
                    backgroundImage: currentBg ? `url(${currentBg})` : 'none',
                    backgroundColor: 'rgba(16, 12, 26, 0.7)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    ...style,
                    ...transitionStyles
                }}
            >
                {children}
            </div>
        );
    }
}

export default ProgressiveBgImage;
