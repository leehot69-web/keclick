
import React from 'react';
import { createRoot } from 'react-dom/client';
import MasterApp from '../components/MasterApp';

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<MasterApp />);
}
