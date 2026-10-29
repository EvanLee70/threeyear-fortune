import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './noto-sans-kr.css'
import './site.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
