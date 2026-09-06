import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import '@fontsource-variable/archivo/standard.css';
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/500.css';
import '@fontsource/source-sans-3/600.css';
import './index.css';
import { CartProvider } from './CartContext.jsx';

const FLIPPINMAPLE_BUILD_CACHE_BUSTER = '20260720-chrome-module-cache';
void FLIPPINMAPLE_BUILD_CACHE_BUSTER;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CartProvider>
      <App />
    </CartProvider>
  </React.StrictMode>
);
