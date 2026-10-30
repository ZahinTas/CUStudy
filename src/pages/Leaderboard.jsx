import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, getDocs } from 'firebase/firestore'
import '../Leaderboard.css'

function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const profilesRef = collection(db, 'profiles')
        const querySnapshot = await getDocs(profilesRef)

        const users = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          users.push({
            id: doc.id,
            name: data.name || 'Unknown User',
            points: data.points || 0,
          })
        })

        users.sort((a, b) => b.points - a.points)

        let lastPoints = null
        let currentRank = 0

        const rankedUsers = users.map((user, index) => {
          if (user.points !== lastPoints) {
            currentRank = index + 1
            lastPoints = user.points
          }

          return {
            ...user,
            rank: currentRank,
          }
        })

        setLeaderboard(rankedUsers)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching leaderboard:', err)
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [])

  if (loading) {
    return (
      <section className="page page-leaderboard">
        <div className="leaderboard-loading">Loading leaderboard...</div>
      </section>
    )
  }

  const topThree = leaderboard.filter((user) => user.rank <= 3)
  const restUsers = leaderboard.filter((user) => user.rank > 3)

  const firstUsers = topThree.filter((user) => user.rank === 1)
  const secondUsers = topThree.filter((user) => user.rank === 2)
  const thirdUsers = topThree.filter((user) => user.rank === 3)

  const isTieForFirst = firstUsers.length > 1
  const isTieForSecond = secondUsers.length > 1
  const isTieForThird = thirdUsers.length > 1

  return (
    <section className="page page-leaderboard">
      <div className="leaderboard-shell">
        <div className="leaderboard-top">
          <h1>Leaderboard</h1>

          <div className="podium">
            {secondUsers.map((user) => (
              <div
                key={user.id}
                className={`podium-user podium-second ${isTieForSecond ? 'tie' : ''}`}
              >
                <div className="podium-avatar">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="podium-name">{user.name}</div>
                <div className="podium-points">{user.points} pts</div>
                <div className="podium-block">2</div>
              </div>
            ))}

            {firstUsers.map((user) => (
              <div
                key={user.id}
                className={`podium-user podium-first ${isTieForFirst ? 'tie' : ''}`}
              >
                <div className="podium-avatar">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="podium-name">{user.name}</div>
                <div className="podium-points">{user.points} pts</div>
                <div className="podium-block">1</div>
              </div>
            ))}

            {thirdUsers.map((user) => (
              <div
                key={user.id}
                className={`podium-user podium-third ${isTieForThird ? 'tie' : ''}`}
              >
                <div className="podium-avatar">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="podium-name">{user.name}</div>
                <div className="podium-points">{user.points} pts</div>
                <div className="podium-block">3</div>
              </div>
            ))}
          </div>
        </div>

        <div className="leaderboard-list-card">
          {restUsers.map((user) => (
            <div key={user.id} className="leaderboard-row">
              <div className="row-rank">{String(user.rank).padStart(2, '0')}</div>

              <div className="row-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>

              <div className="row-info">
                <div className="row-name">{user.name}</div>
                <div className="row-points">{user.points} pts</div>
              </div>
            </div>
          ))}

          {leaderboard.length === 0 && (
            <div className="leaderboard-empty">No leaderboard data yet.</div>
          )}
        </div>
      </div>
    </section>
  )
}

export default Leaderboard