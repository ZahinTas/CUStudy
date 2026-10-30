import { useState } from 'react'
import { auth } from '../firebase'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth'
import "../Login.css"
import googleIcon from '../assets/google-icon.png'

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // --- 1. Email/Password Logic ---
const handleAuth = async (e) => {
  e.preventDefault();
  setError('');
  
  // 1. The Gatekeeper Check
  if (!email.toLowerCase().endsWith('@cornell.edu')) {
    setError('Access Denied: You must use a @cornell.edu email address.');
    return; // Stops the function here
  }

  setLoading(true);
  try {
    if (isRegistering) {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    if (onLoginSuccess) onLoginSuccess();
  } catch (err) {
    setError(err.message.replace('Firebase:', ''));
  } finally {
    setLoading(false);
  }
};

  // --- 2. Google Login Logic ---
const handleGoogleLogin = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const userEmail = result.user.email;

    // Check if the Google account is a Cornell account
    if (!userEmail.toLowerCase().endsWith('@cornell.edu')) {
      await auth.signOut(); // Kick them out immediately
      setError("Please sign in with your Cornell Google account.");
      return;
    }

    if (onLoginSuccess) onLoginSuccess();
  } catch (err) {
    setError("Google Login failed.");
  }
};
  return (
    <div className="login-container">
      <div className="login-form">
        <h1>{isRegistering ? 'Create Account' : 'Welcome Back'}</h1>
        
        {error && <div className="error-message">{error}</div>}

        {/* Traditional Form */}
        <form onSubmit={handleAuth}>
          <div className="input-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading} className="btn-main">
            {loading ? 'Processing...' : isRegistering ? 'Sign Up' : 'Login'}
          </button>
        </form>

        <div className="divider"><span>OR</span></div>

        {/* Google Login Button */}
        <button type="button" onClick={handleGoogleLogin} className="btn-google">
          <img src={googleIcon} alt="Google" />
          Continue with Google
        </button>

        <p className="toggle-auth">
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? 'Login here' : 'Register here'}
          </span>
        </p>
      </div>
    </div>
  )
}

export default Login