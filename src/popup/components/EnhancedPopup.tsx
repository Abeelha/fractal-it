import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import { FractalSection, RenderSettings } from '../../fractal/enhancedGenerator';

interface PopupState {
    isGenerating: boolean;
    currentPreset: string;
    intensity: 'low' | 'medium' | 'high';
    style: 'organic' | 'geometric' | 'chaotic';
    isConnected: boolean;
}

const EnhancedPopup: React.FC = () => {
    const [state, setState] = useState<PopupState>({
        isGenerating: false,
        currentPreset: 'balanced',
        intensity: 'medium',
        style: 'organic',
        isConnected: false
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
            description: 'Maximum visual impact (may lag)',
            algorithms: ['lorenz', 'tree', 'dragon'],
            performance: 'medium',
            settings: { quality: 'high', animation: true, complexity: 0.9 }
        },
        matrix: {
            name: '🟢 Matrix Mode',
            description: 'Green digital rain aesthetic',
            algorithms: ['sierpinski', 'mandelbrot'],
            performance: 'good',
            settings: { quality: 'high', animation: true, complexity: 0.7, theme: 'matrix' }
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
                settings
            });

            setState(prev => ({ ...prev, isConnected: true }));

        } catch (error) {
            console.error('Fractal generation failed:', error);
            alert('⚠️ Failed to generate fractal. Try refreshing the page.');
        } finally {
            setState(prev => ({ ...prev, isGenerating: false }));
        }
    };

    const selectPreset = (presetKey: string) => {
        setState(prev => ({ ...prev, currentPreset: presetKey }));
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
                            ...(state.isGenerating ? styles.generating : {})
                        }}
                        onClick={generateFractal}
                        disabled={state.isGenerating}
                    >
                        <span style={styles.buttonIcon}>
                            {state.isGenerating ? '◈' : '◆'}
                        </span>
                        <span style={styles.buttonText}>
                            {state.isGenerating ? 'GENERATING MATRIX...' : 'EXECUTE FRACTAL'}
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
                                    ...(state.currentPreset === key ? styles.presetActive : {})
                                }}
                                onClick={() => selectPreset(key)}
                            >
                                <div style={styles.presetName}>{preset.name}</div>
                                <div style={styles.presetDesc}>{preset.description}</div>
                                <div style={styles.presetPerf}>
                                    PERF: <span style={getPerformanceColor(preset.performance)}>
                                        {preset.performance.toUpperCase()}
                                    </span>
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
                            <span style={styles.infoLabel}>PRESET:</span>
                            <span style={styles.infoValue}>{state.currentPreset.toUpperCase()}</span>
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
        high: { color: '#00ff88' },
        good: { color: '#ffff00' },
        medium: { color: '#ff8800' }
    };
    return colors[performance as keyof typeof colors] || { color: '#ff0000' };
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
    presetPerf: {
        fontSize: 8,
        fontWeight: 'bold',
        letterSpacing: 1
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