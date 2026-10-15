import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';

const googleClientId = import.meta.env.GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function Root() {
  const content = googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>
      <App hasGoogleClientId={true} />
    </GoogleOAuthProvider>
  ) : (
    <App hasGoogleClientId={false} />
  );

  return (
    <ThemeProvider>
      <ToastProvider>
        {content}
      </ToastProvider>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
