import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db, auth } from '../firebase'

export const saveProfile = async (data) => {
  const user = auth.currentUser
  if (!user) throw new Error('Not logged in')

  await setDoc(doc(db, 'profiles', user.uid), data)
}

export const getProfile = async () => {
  const user = auth.currentUser
  if (!user) throw new Error('Not logged in')

  const docSnap = await getDoc(doc(db, 'profiles', user.uid))
  return docSnap.exists() ? docSnap.data() : null
}