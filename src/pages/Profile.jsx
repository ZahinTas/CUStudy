import { useState, useEffect } from 'react'
import { auth, db } from '../firebase'
import { doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore'
import "../Profile.css"

const getRosterCode = () => {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  if (month >= 1 && month <= 5) return `SP${String(year).slice(2)}`
  if (month >= 6 && month <= 7) return `SU${String(year).slice(2)}`
  return `FA${String(year).slice(2)}`
}

const validateCourse = async (input) => {
  const parts = input.trim().toUpperCase().split(' ')
  if (parts.length !== 2) return false
  const [subject, number] = parts
  const roster = getRosterCode()
  try {
    const res = await fetch(
      `https://classes.cornell.edu/api/2.0/search/classes.json?roster=${roster}&subject=${subject}`
    )
    const data = await res.json()
    if (data.status !== 'success') return false
    return data.data.classes.some(c => c.catalogNbr === number)
  } catch {
    return false
  }
}

function Profile({ setPage, user }) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false) // Track deletion status

  const [name, setName] = useState(user?.displayName || user?.email?.split('@')[0] || '')
  const [year, setYear] = useState('')
  const [college, setCollege] = useState('')
  const [major, setMajor] = useState('')
  const [enrolledClasses, setEnrolledClasses] = useState([])
  const [profilePic, setProfilePic] = useState(null)
  const [points, setPoints] = useState(0)

  const [classInput, setClassInput] = useState('')
  const [classError, setClassError] = useState('')
  const [classLoading, setClassLoading] = useState(false)

  useEffect(() => {
    // If there is no user or we are currently deleting the account, stop the listener
    if (!user || isDeleting) return
    
    const docRef = doc(db, 'profiles', user.uid)
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        setName(data.name || user.displayName || user.email.split('@')[0])
        setYear(data.year || '')
        setCollege(data.college || '')
        setMajor(data.major || '')
        setEnrolledClasses(data.enrolledClasses || [])
        setProfilePic(data.profilePic || null)
        setPoints(data.points || 0)
      } else if (!isDeleting) {
        // Only re-create the document if we aren't in the middle of deleting it
        const defaultName = user.displayName || user.email.split('@')[0]
        setName(defaultName)
        setDoc(docRef, { name: defaultName, email: user.email, points: 0 })
      }
    })
    return () => unsubscribe()
  }, [user, isDeleting])

  const handleAddClass = async () => {
    const val = classInput.trim().toUpperCase()
    if (!val) return
    if (enrolledClasses.includes(val)) {
      setClassError('already added')
      return
    }
    setClassLoading(true)
    setClassError('')
    const valid = await validateCourse(val)
    if (!valid) {
      setClassError(`"${val}" not found in ${getRosterCode()} roster — try "ORIE 3120"`)
      setClassLoading(false)
      return
    }
    setEnrolledClasses([...enrolledClasses, val])
    setClassInput('')
    setClassLoading(false)
  }

  const handleRemoveClass = (code) => {
    setEnrolledClasses(enrolledClasses.filter(c => c !== code))
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setProfilePic(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    if (!user) return
    try {
      setLoading(true)
      await setDoc(doc(db, 'profiles', user.uid), {
        name,
        year,
        college,
        major,
        enrolledClasses,
        profilePic,
        lastUpdated: new Date()
      }, { merge: true })
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to save profile:', err)
      alert('Failed to save profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivate = async () => {
    const confirmDeactivate = window.confirm('Are you sure you want to deactivate?')
    if (!confirmDeactivate) return
  
    sessionStorage.removeItem('custudy_welcome_seen')
  
    await auth.signOut()
    setPage('welcome')
  }

  const handleDelete = async () => {
    const confirmText = window.prompt('Type DELETE to permanently delete your account:')
    if (confirmText !== 'DELETE') return
  
    try {
      setIsDeleting(true)
  
      // 🔐 re-authentication
      if (user.providerData[0]?.providerId === 'google.com') {
        const { GoogleAuthProvider, reauthenticateWithPopup } = await import('firebase/auth')
        const provider = new GoogleAuthProvider()
        await reauthenticateWithPopup(user, provider)
      } else {
        const password = window.prompt('Please enter your password to confirm:')
        if (!password) {
          setIsDeleting(false)
          return
        }
        const { EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth')
        const credential = EmailAuthProvider.credential(user.email, password)
        await reauthenticateWithCredential(user, credential)
      }
  
      await deleteDoc(doc(db, 'profiles', user.uid))
  
      sessionStorage.removeItem('custudy_welcome_seen')
  
      await user.delete()
  
      setPage('welcome')
  
    } catch (err) {
      setIsDeleting(false)
      console.error('Delete error:', err)
  
      if (err.code === 'auth/wrong-password') {
        alert('Incorrect password.')
      } else if (err.code === 'auth/popup-closed-by-user') {
        alert('Google sign-in cancelled.')
      } else {
        alert(`Failed to delete account: ${err.message}`)
      }
    }
  }

  // XP calculations
  const level = Math.floor(points / 1000) + 1
  const xpIntoLevel = points % 1000
  const xpPercent = xpIntoLevel / 10 // out of 100

  return (
    <section className="page page-profile">
      <div className="profile-card">
        <div className="profile-photo-container">
          <div className="profile-photo-preview">
            {profilePic ? (
              <img src={profilePic} alt="Profile" />
            ) : (
              <div className="profile-photo-placeholder">
                {name ? name.substring(0, 2).toUpperCase() : '??'}
              </div>
            )}
          </div>
          {isEditing && (
            <div className="photo-upload-trigger">
              <label htmlFor="user-photo" className="photo-label">Change Photo</label>
              <input
                id="user-photo"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </div>
          )}
        </div>

        <h1>{name.split(' ')[0]}</h1>

        {/* XP Card */}
        <div className="xp-card">
          <p className="xp-label">EXPERIENCE POINTS</p>
          <div className="xp-row">
            <span className="xp-current">{points} XP</span>
            <span className="xp-max">/ {level * 1000} XP</span>
          </div>
          <div className="xp-bar-bg">
            <div className="xp-bar-fill" style={{ width: `${xpPercent}%` }} />
          </div>
          <div className="xp-row">
            <span>Level {level}</span>
            <span>{xpPercent}% to Level {level + 1}</span>
          </div>
        </div>
      </div>

      <div className="profile-details">
        <div className="detail-row">
          <h2>Display Name</h2>
          {isEditing ? (
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          ) : <p>{name}</p>}
        </div>

        <div className="detail-row">
          <h2>Email</h2>
          <p>{user?.email}</p>
        </div>

        <div className="detail-row">
          <h2>Year</h2>
          {isEditing ? (
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">Select year</option>
              <option value="Freshman">Freshman</option>
              <option value="Sophomore">Sophomore</option>
              <option value="Junior">Junior</option>
              <option value="Senior">Senior</option>
            </select>
          ) : <p>{year || 'not set'}</p>}
        </div>

        <div className="detail-row">
          <h2>College</h2>
          {isEditing ? (
            <select value={college} onChange={(e) => setCollege(e.target.value)}>
              <option value="">Select college</option>
              <option value="CALS">CALS</option>
              <option value="AAP">AAP</option>
              <option value="CAS">CAS</option>
              <option value="Dyson">Dyson</option>
              <option value="Nolan">Nolan</option>
              <option value="Bowers CIS">Bowers CIS</option>
              <option value="Engineering">Engineering</option>
              <option value="Human Ecology">Human Ecology</option>
              <option value="ILR">ILR</option>
              <option value="Brooks">Brooks</option>
            </select>
          ) : <p>{college || 'not set'}</p>}
        </div>

        <div className="detail-row">
          <h2>Major</h2>
          {isEditing ? (
            <input type="text" value={major} onChange={(e) => setMajor(e.target.value)} />
          ) : <p>{major || 'not set'}</p>}
        </div>

        <div className="detail-row" style={{ gridColumn: '1 / -1' }}>
          <h2>Enrolled Classes</h2>
          {isEditing ? (
            <div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="e.g. ORIE 3120"
                  value={classInput}
                  onChange={(e) => { setClassInput(e.target.value); setClassError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddClass()}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={handleAddClass}
                  disabled={classLoading}
                  style={{
                    padding: '8px 14px',
                    background: classLoading ? '#ccc' : '#cc0000',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: classLoading ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {classLoading ? 'checking...' : '+ add'}
                </button>
              </div>
              {classError && (
                <p style={{ fontSize: '12px', color: '#cc0000', margin: '6px 0 0' }}>{classError}</p>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                {enrolledClasses.map(c => (
                  <span key={c} style={{
                    background: '#f1d8d8',
                    color: '#cc0000',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    {c}
                    <span
                      onClick={() => handleRemoveClass(c)}
                      style={{ cursor: 'pointer', color: '#888', fontWeight: '700', fontSize: '14px' }}
                    >×</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
              {enrolledClasses.length > 0 ? enrolledClasses.map(c => (
                <span key={c} style={{
                  background: '#f1d8d8',
                  color: '#cc0000',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '500',
                }}>
                  {c}
                </span>
              )) : <p style={{ margin: 0 }}>not set</p>}
            </div>
          )}
        </div>
      </div>

      <div className="profile-actions">
        <button className="btn-edit-save" onClick={isEditing ? handleSave : () => setIsEditing(true)}>
          {loading ? 'Saving...' : isEditing ? 'Save' : 'Edit'}
        </button>
        <button className="btn-deactivate" onClick={handleDeactivate}>Deactivate Account</button>
        <button className="btn-delete" onClick={handleDelete}>Delete Account</button>
      </div>
    </section>
  )
}

export default Profile