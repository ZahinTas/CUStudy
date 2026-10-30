import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { collection, onSnapshot, doc, getDoc, updateDoc, deleteDoc, increment } from "firebase/firestore";
import { db, auth } from "./firebase";
import "leaflet/dist/leaflet.css";

export default function MapView({ onCreateClick }) {
  const [groups, setGroups] = useState([]);
  const [pinInputs, setPinInputs] = useState({});
  const [ownerProfiles, setOwnerProfiles] = useState({}); // { [uid]: { name, photoURL } }
  const userId = auth.currentUser?.uid || null;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sessions"), (snapshot) => {
      setGroups(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const myGroup = groups.find(g => g.members?.includes(userId));
    if (!myGroup) return;

    const interval = setInterval(async () => {
      await updateDoc(doc(db, "profiles", userId), {
        points: increment(50)
      });
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [groups, userId]);

  // Fetch owner profile when a popup is opened
  const handlePopupOpen = async (ownerId) => {
    if (!ownerId || ownerProfiles[ownerId]) return;
    try {
      const snap = await getDoc(doc(db, "profiles", ownerId));
      if (snap.exists()) {
        setOwnerProfiles(prev => ({ ...prev, [ownerId]: snap.data() }));
      }
    } catch (e) {
      console.error("Failed to fetch owner profile", e);
    }
  };

  const handleJoin = async (groupId) => {
    if (!userId) { alert("please sign in to join a group"); return; }
    const ref = doc(db, "sessions", groupId);
    const snap = await getDoc(ref);
    const group = snap.data();
    const members = group.members || [];
    if (members.includes(userId)) { alert("you already joined this group!"); return; }
    const [current, max] = group.capacity.split("/").map(Number);
    if (current >= max) { alert("this group is full!"); return; }
    await updateDoc(ref, { capacity: `${current + 1}/${max}`, members: [...members, userId] });
    alert("you joined the group!");
  };

  const handleLeave = async (groupId) => {
    const ref = doc(db, "sessions", groupId);
    const snap = await getDoc(ref);
    const group = snap.data();
    const members = group.members || [];
    if (!members.includes(userId)) { alert("you're not in this group"); return; }
    const [current, max] = group.capacity.split("/").map(Number);
    const updatedMembers = members.filter(uid => uid !== userId);
    await updateDoc(doc(db, "profiles", userId), { points: increment(100) });
    if (updatedMembers.length === 0) {
      await deleteDoc(ref);
      alert("you left and the session ended since no one else was in it 🎉");
      return;
    }
    if (group.createdBy === userId) {
      const newOwner = updatedMembers[0];
      await updateDoc(ref, { capacity: `${current - 1}/${max}`, members: updatedMembers, createdBy: newOwner });
      alert("you left the session — ownership transferred to the next member 🎉");
    } else {
      await updateDoc(ref, { capacity: `${current - 1}/${max}`, members: updatedMembers });
      alert("you left the session and earned 100 XP! 🎉");
    }
  };

  const handleJoinPrivate = async (groupId) => {
    if (!userId) { alert("please sign in to join a group"); return; }
    const enteredPin = pinInputs[groupId] || "";
    if (enteredPin.length !== 4) { alert("please enter a 4 digit pin"); return; }
    const ref = doc(db, "sessions", groupId);
    const snap = await getDoc(ref);
    const group = snap.data();
    if (group.pin !== enteredPin) { alert("incorrect pin"); return; }
    const members = group.members || [];
    if (members.includes(userId)) { alert("you already joined this group!"); return; }
    const [current, max] = group.capacity.split("/").map(Number);
    if (current >= max) { alert("this group is full!"); return; }
    await updateDoc(ref, { capacity: `${current + 1}/${max}`, members: [...members, userId] });
    alert("you joined the group!");
    setPinInputs(prev => ({ ...prev, [groupId]: "" }));
  };

  const handleEndSession = async (groupId, createdBy) => {
    if (createdBy !== userId) { alert("only the group owner can end the session"); return; }
    const confirmed = window.confirm("are you sure you want to end this session?");
    if (!confirmed) return;
    const ref = doc(db, "sessions", groupId);
    const snap = await getDoc(ref);
    const group = snap.data();
    const members = group.members || [];
    await Promise.all(members.map(uid => updateDoc(doc(db, "profiles", uid), { points: increment(100) })));
    await deleteDoc(ref);
    alert("session ended! all members earned 100 XP 🎉");
  };

  const formatStart = (start) => {
    if (!start) return null;
    if (typeof start === "string") return start;
    const date = start.toDate ? start.toDate() : new Date(start);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Helper: render owner header inside a popup
  const OwnerHeader = ({ ownerId }) => {
    const profile = ownerProfiles[ownerId];
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", paddingBottom: "8px", borderBottom: "0.5px solid #eee" }}>
        {profile?.photoURL ? (
          <img
            src={profile.photoURL}
            alt={profile.name || "owner"}
            style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#1D9E75", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "white", fontSize: "13px", fontWeight: "500" }}>
              {profile?.name ? profile.name[0].toUpperCase() : "?"}
            </span>
          </div>
        )}
        <div>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: "500", lineHeight: 1.2 }}>
            {profile?.name || "loading..."}
          </p>
          <p style={{ margin: 0, fontSize: "11px", color: "#999", lineHeight: 1.2 }}>session owner</p>
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <MapContainer center={[42.4474, -76.4832]} zoom={16} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />

        {groups.filter(group => group.lat && group.lng).map(group => (
          <CircleMarker
            key={group.id}
            center={[group.lat, group.lng]}
            radius={14}
            pathOptions={{
              fillColor: group.type === "public" ? "#689a8a" : "#534AB7",
              color: "white",
              weight: 2,
              fillOpacity: 0.9,
            }}
            eventHandlers={{
              click: () => handlePopupOpen(group.createdBy), // fetch owner on open
            }}
          >
            <Popup>
              <div style={{ minWidth: "180px" }}>

                {/* Owner profile header */}
                <OwnerHeader ownerId={group.createdBy} />

                <p style={{ fontWeight: "500", marginBottom: "4px" }}>{group.class}</p>
                <p style={{ fontSize: "13px", color: "#666", marginBottom: "4px" }}>{group.location}</p>
                <p style={{ fontSize: "13px", marginBottom: "4px" }}>{group.capacity} people</p>
                {group.date && (
                  <p style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>{group.date}</p>
                )}
                {group.start && (
                  <p style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>starts at {formatStart(group.start)}</p>
                )}
                {group.note && (
                  <p style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}>{group.note}</p>
                )}

                {group.type === "public" ? (
                  group.members?.includes(userId) ? (
                    <button onClick={() => handleLeave(group.id)} style={{ width: "100%", padding: "6px", background: "#f0f0f0", color: "#444", border: "0.5px solid #ccc", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "500", marginBottom: "6px" }}>
                      leave session
                    </button>
                  ) : (
                    <button onClick={() => handleJoin(group.id)} style={{ width: "100%", padding: "6px", background: "#1D9E75", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500", marginBottom: "6px" }}>
                      join group
                    </button>
                  )
                ) : (
                  group.members?.includes(userId) ? (
                    <button onClick={() => handleLeave(group.id)} style={{ width: "100%", padding: "6px", background: "#f0f0f0", color: "#444", border: "0.5px solid #ccc", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "500", marginBottom: "6px" }}>
                      leave session
                    </button>
                  ) : (
                    <div style={{ marginBottom: "6px" }}>
                      <p style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>🔒 private — enter pin to join</p>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input
                          type="password"
                          maxLength={4}
                          placeholder="----"
                          value={pinInputs[group.id] || ""}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                            setPinInputs(prev => ({ ...prev, [group.id]: val }));
                          }}
                          style={{ flex: 1, padding: "6px", borderRadius: "6px", border: "0.5px solid #ccc", fontSize: "16px", letterSpacing: "4px", textAlign: "center" }}
                        />
                        <button onClick={() => handleJoinPrivate(group.id)} style={{ padding: "6px 10px", background: "#cc0000", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "500" }}>
                          join
                        </button>
                      </div>
                    </div>
                  )
                )}

                {group.createdBy === userId && (
                  <button onClick={() => handleEndSession(group.id, group.createdBy)} style={{ width: "100%", padding: "6px", background: "#fff0f0", color: "#cc0000", border: "0.5px solid #ffcccc", borderRadius: "6px", cursor: "pointer", fontSize: "12px", marginTop: "4px" }}>
                    end session
                  </button>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <div
        onClick={onCreateClick}
        style={{ position: "absolute", bottom: "2rem", right: "1rem", zIndex: 9999, background: "#cc0000", color: "white", padding: "10px 20px", borderRadius: "20px", fontWeight: "500", cursor: "pointer", fontSize: "14px" }}
      >
        + create group
      </div>
    </div>
  );
}