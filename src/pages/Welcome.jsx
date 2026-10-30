import '../Welcome.css'
import appIcon from '../assets/icon.png'

function Welcome({ onGetStarted }) {
  return (
    <div className="welcome-container">
      <div className="welcome-content">
        <img src={appIcon} alt="CUStudy logo" className="welcome-logo" />

        <p className="welcome-tagline">
          Find your perfect study buddy.
        </p>

        <p className="welcome-subtext">
          Meet Cornell students, join study groups, and make every session count.
        </p>

        <button
          className="welcome-btn"
          onClick={onGetStarted}
        >
          Get Started
        </button>
      </div>
    </div>
  )
}

export default Welcome