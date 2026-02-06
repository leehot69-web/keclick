
import React from 'react';
import ReactDOM from 'react-dom/client';
import MasterApp from './components/MasterApp';

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <MasterApp />
        </React.StrictMode>
    );
}
