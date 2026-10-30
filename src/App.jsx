import { useState, useEffect } from 'react'
import { auth } from './firebase'
import Home from './pages/Home.jsx'
import Profile from './pages/Profile.jsx'
import Login from './pages/Login.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Welcome from './pages/Welcome.jsx'
import './App.css'

import homeIcon from './assets/home_icon.png'
import profileIcon from './assets/profile_icon.png'
import leaderboardIcon from './assets/leaderboard_icon.png'
import bookingIcon from './assets/booking_icon.png'
import logoutIcon from './assets/logout_icon.png'

const WELCOME_SEEN_KEY = 'custudy_welcome_seen'

function App() {
  const [page, setPage] = useState('login')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser)

      if (currentUser) {
        setPage('home')
      } else {
        const hasSeenWelcome = sessionStorage.getItem(WELCOME_SEEN_KEY) === 'true'
        setPage(hasSeenWelcome ? 'login' : 'welcome')
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleGetStarted = () => {
    sessionStorage.setItem(WELCOME_SEEN_KEY, 'true')
    setPage(user ? 'home' : 'login')
  }

  const handleSignOut = () => {
    sessionStorage.removeItem(WELCOME_SEEN_KEY)
    auth.signOut().then(() => {
      setPage('welcome')
    })
  }

  if (loading) {
    return <div className="loading-screen">Loading...</div>
  }

  return (
    <div className="app-shell">
      <main className="page-container">
        {page === 'welcome' && (
          <Welcome onGetStarted={handleGetStarted} />
        )}

        {page === 'login' && !user && (
          <Login onLoginSuccess={() => setPage('home')} />
        )}

        {user && page === 'home' && <Home />}
        {user && page === 'profile' && <Profile setPage={setPage} user={user} />}
        {user && page === 'leaderboard' && <Leaderboard />}
      </main>

      {user && (
        <nav className="bottom-nav">
          <button
            type="button"
            className={page === 'home' ? 'active' : ''}
            onClick={() => setPage('home')}
          >
            <img src={homeIcon} alt="Home" />
          </button>

          <button
            type="button"
            className={page === 'leaderboard' ? 'active' : ''}
            onClick={() => setPage('leaderboard')}
          >
            <img src={leaderboardIcon} alt="Leaderboard" />
          </button>

          <button
            type="button"
            onClick={() =>
              window.open(
                'https://www.library.cornell.edu/libraries/spaces/',
                '_blank',
                'noopener,noreferrer'
              )
            }
          >
            <img src={bookingIcon} alt="Book a room" />
          </button>

          <button
            type="button"
            className={page === 'profile' ? 'active' : ''}
            onClick={() => setPage('profile')}
          >
            <img src={profileIcon} alt="Profile" />
          </button>

          <button type="button" onClick={handleSignOut}>
            <img src={logoutIcon} alt="Sign out" />
          </button>
        </nav>
      )}
    </div>
  )
}

export default App