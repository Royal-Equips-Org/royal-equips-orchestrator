import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/globals.css'

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

const el = document.getElementById('root')
if (!el) throw new Error('Missing #root element')

createRoot(el).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)