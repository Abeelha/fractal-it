import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import { FractalSection, RenderSettings } from '../../fractal/enhancedGenerator';

interface PopupState {
    isGenerating: boolean;
    currentPreset: string | null;
    intensity: 'low' | 'medium' | 'high';
    style: 'organic' | 'geometric' | 'chaotic';
    isConnected: boolean;
    cachedModes: Set<string>;
    isExecuted: boolean;
}

const EnhancedPopup: React.FC = () => {
    const [state, setState] = useState<PopupState>({
        isGenerating: false,
        currentPreset: null,
        intensity: 'medium',
        style: 'organic',
        isConnected: false,
        cachedModes: new Set(),
        isExecuted: false
    });

    const presets = {
        chill: {
            name: '🌊 Chill Vibes',
            description: 'Smooth, low-intensity fractals',
            algorithms: ['spirograph'],
            performance: 'high',
            settings: { quality: 'medium', animation: true, complexity: 0.3 }
        },
        balanced: {
            name: '⚡ Balanced',
            description: 'Perfect mix of beauty and performance',
            algorithms: ['mandelbrot', 'julia'],
            performance: 'good',
            settings: { quality: 'high', animation: true, complexity: 0.6 }
        },
        intense: {
            name: '🔥 Intense',
            description: 'Maximum visual impact',
            algorithms: ['lorenz', 'tree', 'dragon'],
            performance: 'medium',
            settings: { quality: 'high', animation: true, complexity: 0.8 }
        },
        matrix: {
            name: '🟢 Matrix Mode',
            description: 'Green digital rain aesthetic',
            algorithms: ['sierpinski'],
            performance: 'good',
            settings: { quality: 'medium', animation: true, complexity: 0.5 }
        }
    };

    const checkContentScript = async (tabId: number): Promise<boolean> => {
        try {
            await chrome.tabs.sendMessage(tabId, { action: 'PING' });
            return true;
        } catch {
            return false;
        }
    };

    const generateFractal = async () => {
        if (!state.currentPreset) return;

        setState(prev => ({ ...prev, isGenerating: true }));

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.id) throw new Error('No active tab');

            const isLoaded = await checkContentScript(tab.id);

            if (!isLoaded) {
                console.log('Injecting content script...');
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['enhancedContent.js']
                });
                await new Promise(resolve => setTimeout(resolve, 800));
            }

            const preset = presets[state.currentPreset as keyof typeof presets];
            const sections: FractalSection[] = preset.algorithms.map((algo, i) => ({
                name: `section-${i}`,
                algorithm: algo,
                enabled: true,
                position: new THREE.Vector3(0, 0, 0),
                scale: 1
            }));

            const settings: RenderSettings = {
                ...preset.settings,
                background: 'dark',
                lighting: true,
                postProcessing: false
            } as RenderSettings;

            await chrome.tabs.sendMessage(tab.id, {
                action: 'GENERATE_ENHANCED_FRACTAL',
                sections,
                settings,
                mode: state.currentPreset
            });

            setState(prev => ({
                ...prev,
                isConnected: true,
                isExecuted: true,
                cachedModes: new Set([...prev.cachedModes, state.currentPreset!])
            }));

        } catch (error) {
            console.error('Fractal generation failed:', error);
            alert('⚠️ Failed to generate fractal. Try refreshing the page.');
        } finally {
            setState(prev => ({ ...prev, isGenerating: false }));
        }
    };

    const selectPreset = async (presetKey: string) => {
        if (state.isGenerating) return; // Prevent spam clicking

        console.log(`🎨 Popup: Selecting preset "${presetKey}"`);
        console.log(`🎨 Popup: isExecuted=${state.isExecuted}, cachedModes=`, Array.from(state.cachedModes));

        setState(prev => ({ ...prev, currentPreset: presetKey }));

        // If already executed and this mode is cached, switch instantly
        if (state.isExecuted && state.cachedModes.has(presetKey)) {
            console.log(`🎨 Popup: Switching to cached mode "${presetKey}"`);
            setState(prev => ({ ...prev, isGenerating: true }));

            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab.id) {
                    await chrome.tabs.sendMessage(tab.id, {
                        action: 'SWITCH_CACHED_MODE',
                        mode: presetKey
                    });
                }
            } catch (error) {
                console.error('Mode switch failed:', error);
            } finally {
                setState(prev => ({ ...prev, isGenerating: false }));
            }
        }
        // If not cached but executed, generate new mode
        else if (state.isExecuted) {
            console.log(`🎨 Popup: Generating new mode "${presetKey}"`);
            await generateNewMode(presetKey);
        } else {
            console.log(`🎨 Popup: Not executed yet, preset selected: "${presetKey}"`);
        }
    };

    const generateNewMode = async (presetKey: string) => {
        setState(prev => ({ ...prev, isGenerating: true }));

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.id) return;

            const preset = presets[presetKey as keyof typeof presets];
            const sections: FractalSection[] = preset.algorithms.map((algo, i) => ({
                name: `section-${i}`,
                algorithm: algo,
                enabled: true,
                position: new THREE.Vector3(0, 0, 0),
                scale: 1
            }));

            const settings: RenderSettings = {
                ...preset.settings,
                background: 'dark',
                lighting: true,
                postProcessing: false
            } as RenderSettings;

            await chrome.tabs.sendMessage(tab.id, {
                action: 'GENERATE_ENHANCED_FRACTAL',
                sections,
                settings,
                mode: presetKey
            });

            setState(prev => ({
                ...prev,
                cachedModes: new Set([...prev.cachedModes, presetKey])
            }));

        } catch (error) {
            console.error('New mode generation failed:', error);
        } finally {
            setState(prev => ({ ...prev, isGenerating: false }));
        }
    };

    return (
        <div style={styles.container}>
            {/* Matrix Background Effect */}
            <div style={styles.matrixBg}>
                <div style={styles.scanline}></div>
            </div>

            {/* Header */}
            <div style={styles.header}>
                <div style={styles.logo}>
                    <span style={styles.logoIcon}>◇</span>
                    <span style={styles.logoText}>FRACTAL-IT</span>
                </div>
                <div style={styles.subtitle}>
                    NEURAL PATTERN GENERATOR
                </div>
                <div style={styles.statusBar}>
                    <span style={styles.statusDot}></span>
                    <span style={styles.statusText}>SYSTEM ONLINE</span>
                </div>
            </div>

            {/* Main Controls */}
            <div style={styles.content}>
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>INITIATE FRACTAL SEQUENCE</h3>
                    <button
                        style={{
                            ...styles.generateButton,
                            ...(state.isGenerating ? styles.generating : {}),
                            ...((!state.currentPreset || state.isExecuted) ? styles.disabledButton : {})
                        }}
                        onClick={generateFractal}
                        disabled={state.isGenerating || !state.currentPreset || state.isExecuted}
                    >
                        <span style={styles.buttonIcon}>
                            {state.isGenerating ? '◈' : '◆'}
                        </span>
                        <span style={styles.buttonText}>
                            {!state.currentPreset ? 'SELECT MODE FIRST' :
                                state.isExecuted ? 'SWITCH MODES BELOW' :
                                    state.isGenerating ? 'GENERATING MATRIX...' : 'EXECUTE FRACTAL'}
                        </span>
                    </button>
                </div>

                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>PATTERN PRESETS</h3>
                    <div style={styles.presetGrid}>
                        {Object.entries(presets).map(([key, preset]) => (
                            <button
                                key={key}
                                style={{
                                    ...styles.presetCard,
                                    ...(state.currentPreset === key ? styles.presetActive : {}),
                                    ...(state.isGenerating ? styles.presetDisabled : {})
                                }}
                                onClick={() => selectPreset(key)}
                                disabled={state.isGenerating}
                            >
                                <div style={styles.presetHeader}>
                                    <div style={styles.presetName}>{preset.name}</div>
                                    <div style={styles.presetPerfDot}>
                                        <span style={{
                                            ...styles.perfDot,
                                            ...getPerformanceColor(preset.performance)
                                        }}></span>
                                    </div>
                                </div>
                                <div style={styles.presetDesc}>{preset.description}</div>
                                <div style={styles.presetStatus}>
                                    {state.cachedModes.has(key) && (
                                        <span style={styles.cachedIndicator}>● CACHED</span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>SYSTEM INFO</h3>
                    <div style={styles.infoGrid}>
                        <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>ALGORITHMS:</span>
                            <span style={styles.infoValue}>7 LOADED</span>
                        </div>
                        <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>STATUS:</span>
                            <span style={styles.infoValue}>
                                {state.isConnected ? 'CONNECTED' : 'STANDBY'}
                            </span>
                        </div>
                        <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>MODE:</span>
                            <span style={styles.infoValue}>
                                {state.currentPreset ? state.currentPreset.toUpperCase() : 'NONE'}
                            </span>
                        </div>
                        <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>CACHED:</span>
                            <span style={styles.infoValue}>{state.cachedModes.size}/4</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={styles.footer}>
                <div style={styles.footerText}>
                    ▲ NEURAL MATHEMATICS ENGINE v2.1 ▲
                </div>
            </div>
        </div>
    );
};

function getPerformanceColor(performance: string) {
    const colors = {
        high: { backgroundColor: '#00ff88', boxShadow: '0 0 8px #00ff88' },
        good: { backgroundColor: '#ffff00', boxShadow: '0 0 8px #ffff00' },
        medium: { backgroundColor: '#ff8800', boxShadow: '0 0 8px #ff8800' }
    };
    return colors[performance as keyof typeof colors] || { backgroundColor: '#ff0000', boxShadow: '0 0 8px #ff0000' };
}

const styles = {
    container: {
        width: 380,
        height: 520,
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
        color: '#00ff88',
        fontFamily: '"Courier New", monospace',
        position: 'relative' as const,
        overflow: 'hidden',
        border: '2px solid #00ff88',
        boxShadow: '0 0 30px rgba(0, 255, 136, 0.3), inset 0 0 20px rgba(0, 255, 136, 0.1)'
    },
    matrixBg: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(90deg, transparent 98%, #00ff88 100%)',
        backgroundSize: '20px 20px',
        opacity: 0.1,
        pointerEvents: 'none' as const
    },
    scanline: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, transparent, #00ff88, transparent)',
        animation: 'scan 3s linear infinite'
    },
    header: {
        padding: 20,
        textAlign: 'center' as const,
        borderBottom: '1px solid rgba(0, 255, 136, 0.3)',
        position: 'relative' as const,
        zIndex: 10
    },
    logo: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8
    },
    logoIcon: {
        fontSize: 24,
        marginRight: 8,
        animation: 'pulse 2s infinite',
        textShadow: '0 0 10px #00ff88'
    },
    logoText: {
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 3,
        textShadow: '0 0 10px #00ff88'
    },
    subtitle: {
        fontSize: 10,
        opacity: 0.8,
        letterSpacing: 2,
        marginBottom: 8
    },
    statusBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
    },
    statusDot: {
        width: 8,
        height: 8,
        background: '#00ff88',
        borderRadius: '50%',
        animation: 'blink 1.5s infinite',
        boxShadow: '0 0 10px #00ff88'
    },
    statusText: {
        fontSize: 10,
        letterSpacing: 1
    },
    content: {
        padding: 20,
        position: 'relative' as const,
        zIndex: 10
    },
    section: {
        marginBottom: 20
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 12,
        letterSpacing: 1,
        color: '#00ff88',
        textShadow: '0 0 5px #00ff88',
        borderLeft: '3px solid #00ff88',
        paddingLeft: 8
    },
    generateButton: {
        width: '100%',
        padding: 16,
        background: 'linear-gradient(135deg, #001122 0%, #003344 100%)',
        border: '2px solid #00ff88',
        color: '#00ff88',
        fontSize: 14,
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        letterSpacing: 1,
        fontFamily: '"Courier New", monospace',
        boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)',
        textShadow: '0 0 5px #00ff88'
    },
    generating: {
        background: 'linear-gradient(135deg, #004400 0%, #006600 100%)',
        animation: 'glow 1s infinite alternate'
    },
    disabledButton: {
        background: 'linear-gradient(135deg, #222222 0%, #333333 100%)',
        border: '2px solid #666666',
        color: '#666666',
        cursor: 'not-allowed',
        boxShadow: 'none',
        textShadow: 'none'
    },
    buttonIcon: {
        fontSize: 16,
        animation: 'rotate 2s linear infinite'
    },
    buttonText: {
        letterSpacing: 2
    },
    presetGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8
    },
    presetCard: {
        padding: 12,
        background: 'rgba(0, 255, 136, 0.05)',
        border: '1px solid rgba(0, 255, 136, 0.3)',
        color: '#00ff88',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        fontFamily: '"Courier New", monospace',
        fontSize: 10,
        textAlign: 'left' as const
    },
    presetActive: {
        background: 'rgba(0, 255, 136, 0.2)',
        border: '1px solid #00ff88',
        boxShadow: '0 0 15px rgba(0, 255, 136, 0.4)',
        transform: 'scale(1.02)'
    },
    presetDisabled: {
        background: 'rgba(0, 255, 136, 0.05)',
        border: '1px solid rgba(0, 255, 136, 0.3)',
        color: '#ff8800',
        cursor: 'not-allowed',
        transform: 'scale(0.98)'
    },
    presetHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4
    },
    presetName: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 4,
        textShadow: '0 0 3px #00ff88'
    },
    presetDesc: {
        fontSize: 9,
        opacity: 0.8,
        marginBottom: 4,
        lineHeight: 1.2
    },
    presetPerfDot: {
        width: 12,
        height: 12,
        borderRadius: '50%',
        border: '1px solid rgba(0, 255, 136, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    perfDot: {
        width: 8,
        height: 8,
        borderRadius: '50%',
        display: 'block'
    },
    presetStatus: {
        fontSize: 8,
        opacity: 0.8
    },
    cachedIndicator: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#ff8800'
    },
    infoGrid: {
        display: 'grid',
        gap: 8
    },
    infoItem: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: 8,
        background: 'rgba(0, 255, 136, 0.05)',
        border: '1px solid rgba(0, 255, 136, 0.2)',
        fontSize: 10
    },
    infoLabel: {
        opacity: 0.8
    },
    infoValue: {
        fontWeight: 'bold',
        textShadow: '0 0 3px #00ff88'
    },
    footer: {
        padding: 12,
        textAlign: 'center' as const,
        borderTop: '1px solid rgba(0, 255, 136, 0.3)',
        position: 'absolute' as const,
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(0, 0, 0, 0.8)'
    },
    footerText: {
        fontSize: 9,
        opacity: 0.6,
        letterSpacing: 1
    }
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes scan {
        0% { transform: translateY(0); }
        100% { transform: translateY(520px); }
    }
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
    }
    @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0.3; }
    }
    @keyframes glow {
        0% { box-shadow: 0 0 20px rgba(0, 255, 136, 0.3); }
        100% { box-shadow: 0 0 30px rgba(0, 255, 136, 0.6); }
    }
    @keyframes rotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styleSheet);

export default EnhancedPopup;