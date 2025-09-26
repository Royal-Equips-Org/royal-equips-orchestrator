import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles/globals.css'

const el = document.getElementById('root')
if (!el) throw new Error('Missing #root element')

createRoot(el).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)