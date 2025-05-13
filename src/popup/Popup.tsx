import React, { useState, useEffect } from 'react';

type SectionType = 'all' | 'header' | 'footer' | 'body' | 'section';

const Popup: React.FC = () => {
    const [selectedSection, setSelectedSection] = useState<SectionType>('all');
    const [selectionLocked, setSelectionLocked] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        chrome.storage.sync.get(['selectedSection', 'selectionLocked'], (result) => {
            if (result.selectedSection) {
                setSelectedSection(result.selectedSection as SectionType);
            }
            if (result.selectionLocked !== undefined) {
                setSelectionLocked(result.selectionLocked);
            }
            setIsLoaded(true);
        });
    }, []);

    const getSectionState = (section: string): boolean => {
        if (selectedSection === 'all') return true;
        return selectedSection === section;
    };

    const updateFractalSections = async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id) {
            await chrome.tabs.sendMessage(tab.id, {
                action: 'UPDATE_SECTIONS',
                sections: {
                    header: selectedSection === 'all' || selectedSection === 'header',
                    footer: selectedSection === 'all' || selectedSection === 'footer',
                    body: selectedSection === 'all' || selectedSection === 'body',
                    section: selectedSection === 'all' || selectedSection === 'section'
                }
            });
        }
    };

    const handleSectionSelect = (section: SectionType) => {
        if (selectionLocked) return;
        setSelectedSection(section);

        chrome.storage.sync.set({ selectedSection: section });

        setTimeout(updateFractalSections, 50);
    };

    const handleFractalize = async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id && chrome.scripting) {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js'],
            });
            setTimeout(updateFractalSections, 100);
        }
    };

    const toggleLock = () => {
        const newLockState = !selectionLocked;
        setSelectionLocked(newLockState);

        chrome.storage.sync.set({ selectionLocked: newLockState });
    };

    if (!isLoaded) {
        return <div style={{ width: 320, height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;
    }

    return (
        <div style={{
            width: 320,
            padding: 20,
            background: '#181A1B',
            color: '#F8F8F2',
            borderRadius: 12,
            boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
            fontFamily: 'Inter, monospace, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16
        }}>
            <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: 1, marginBottom: 4 }}>Fractal-it</div>
            <div style={{ fontSize: 13, color: '#B2B2B2', marginBottom: 8, textAlign: 'center' }}>
                Visualize the structure of any website as a 3D fractal. Toggle sections and explore!
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                    style={buttonStyle(selectedSection === 'all')}
                    onClick={() => handleSectionSelect('all')}
                    disabled={selectionLocked}
                >
                    All
                </button>
                <button
                    style={buttonStyle(selectedSection === 'header')}
                    onClick={() => handleSectionSelect('header')}
                    disabled={selectionLocked}
                >
                    Header
                </button>
                <button
                    style={buttonStyle(selectedSection === 'footer')}
                    onClick={() => handleSectionSelect('footer')}
                    disabled={selectionLocked}
                >
                    Footer
                </button>
                <button
                    style={buttonStyle(selectedSection === 'body')}
                    onClick={() => handleSectionSelect('body')}
                    disabled={selectionLocked}
                >
                    Body
                </button>
                <button
                    style={buttonStyle(selectedSection === 'section')}
                    onClick={() => handleSectionSelect('section')}
                    disabled={selectionLocked}
                >
                    Section
                </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button
                    style={{
                        ...resetButtonStyle,
                        background: selectionLocked ? '#BD93F9' : '#44475A',
                    }}
                    onClick={toggleLock}
                >
                    {selectionLocked ? 'Unlock' : 'Lock'}
                </button>
                <button style={mainButtonStyle} onClick={handleFractalize}>Fractalize!</button>
            </div>

            <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
                Drag to rotate, scroll to zoom. Powered by Three.js
            </div>
        </div>
    );
};

const buttonStyle = (active: boolean) => ({
    background: active ? '#282A36' : '#222',
    color: active ? '#50FA7B' : '#B2B2B2',
    border: 'none',
    borderRadius: 6,
    padding: '6px 12px',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    outline: 'none',
    transition: 'background 0.2s, color 0.2s',
    opacity: active ? 1 : 0.8,
});

const mainButtonStyle = {
    background: 'linear-gradient(90deg, #50FA7B 0%, #8BE9FD 100%)',
    color: '#181A1B',
    border: 'none',
    borderRadius: 6,
    padding: '8px 18px',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
    outline: 'none',
    boxShadow: '0 2px 8px rgba(80,250,123,0.10)',
};

const resetButtonStyle = {
    background: '#44475A',
    color: '#F8F8F2',
    border: 'none',
    borderRadius: 6,
    padding: '8px 14px',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    outline: 'none',
};

export default Popup;