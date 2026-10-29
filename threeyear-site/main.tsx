import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './noto-sans-kr.css'
import './site.css'
import App from './App.tsx'
import ResultPage from './ResultPage.tsx'

// The result opens in its own tab as `?view=result&id=...`; everything else is the input page.
const isResult = new URLSearchParams(window.location.search).get('view') === 'result'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isResult ? <ResultPage /> : <App />}
  </StrictMode>,
)
