import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Aplicar tema guardado al cargar
try {
  const savedTheme = localStorage.getItem('lapalmera_theme') || 'emerald';
  document.documentElement.setAttribute('data-theme', savedTheme);
} catch {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
