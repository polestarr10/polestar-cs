import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AuthGate from './components/AuthGate.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthGate>
        {(user, actions) => <App key={user.id} currentUser={user} {...actions} />}
      </AuthGate>
    </ErrorBoundary>
  </React.StrictMode>,
)
