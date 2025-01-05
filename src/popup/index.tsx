import React from 'react';
import { createRoot } from 'react-dom/client';
import { Popup } from './Popup';
import '../styles/global.css';

// Add error logging
console.log('Popup script starting...');

try {
    const container = document.getElementById('root');
    if (!container) {
        throw new Error('Failed to find root element');
    }

    console.log('Root element found, creating React root...');
    const root = createRoot(container);
    
    console.log('Rendering Popup component...');
    root.render(
        <React.StrictMode>
            <Popup />
        </React.StrictMode>
    );
    console.log('Render complete');
} catch (error: unknown) {
    console.error('Error initializing popup:', error);
    // Show error in popup
    const container = document.getElementById('root');
    if (container) {
        container.innerHTML = `
            <div style="padding: 20px; color: red;">
                Error loading extension: ${error instanceof Error ? error.message : 'Unknown error'}
            </div>
        `;
    }
} 