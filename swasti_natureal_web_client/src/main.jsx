import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { PreferencesProvider, usePreferences } from './context/PreferencesContext.jsx';
import { BrandingProvider } from './context/BrandingContext.jsx';
import './index.css';

/** Re-renders the whole app when the language changes so every `t()` call updates. */
function LocalizedApp() {
  const { language } = usePreferences();
  return <App key={language} />;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PreferencesProvider>
        <BrandingProvider>
          <ToastProvider>
            <AuthProvider>
              <LocalizedApp />
            </AuthProvider>
          </ToastProvider>
        </BrandingProvider>
      </PreferencesProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
