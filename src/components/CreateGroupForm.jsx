import { useState } from "react";
import { collection, addDoc, doc, updateDoc, increment } from "firebase/firestore";
import { db, auth } from "../firebase";

const getRosterCode = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  if (month >= 1 && month <= 5) return `SP${String(year).slice(2)}`;
  if (month >= 6 && month <= 7) return `SU${String(year).slice(2)}`;
  return `FA${String(year).slice(2)}`;
};

const validateCourse = async (input) => {
  const parts = input.trim().toUpperCase().split(" ");
  if (parts.length !== 2) return false;

  const [subject, number] = parts;
  const roster = getRosterCode();

  try {
    const res = await fetch(
      `https://classes.cornell.edu/api/2.0/search/classes.json?roster=${roster}&subject=${subject}`
    );
    const data = await res.json();
    if (data.status !== "success") return false;

    return data.data.classes.some(c => c.catalogNbr === number);
  } catch {
    return false;
  }
};

const searchLocations = async (query) => {
  if (!query || query.length < 3) return [];
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ", Ithaca NY")}&format=json&limit=5`
  );
  const data = await res.json();
  return data.map(item => ({
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    displayName: item.display_name,
    shortName: item.display_name.split(",").slice(0, 2).join(","),
  }));
};

const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const minutes = ["00", "15", "30", "45"];

export default function CreateGroupForm({ onClose }) {
  const [className, setClassName] = useState("");
  const [location, setLocation] = useState("");
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [capacity, setCapacity] = useState(6);
  const [startTime, setStartTime] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [type, setType] = useState("public");
  const [pin, setPin] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLocationChange = async (e) => {
    const val = e.target.value;
    setLocation(val);
    setSelectedCoords(null);
    if (val.length >= 3) {
      const results = await searchLocations(val);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    setLocation(suggestion.shortName);
    setSelectedCoords({ lat: suggestion.lat, lng: suggestion.lng });
    setSuggestions([]);
  };

  const handleSubmit = async () => {
    if (!className || !location) {
      alert("please fill in class and location");
      return;
    }

    if (!selectedCoords) {
      alert("please select a location from the dropdown");
      return;
    }

    if (!startTime || !startTime.includes(":") || startTime === ":") {
      alert("please select a start time");
      return;
    }

    if (type === "private" && pin.length !== 4) {
      alert("please enter a 4 digit pin for your private group");
      return;
    }

    setLoading(true);
    const roster = getRosterCode();

    const isValid = await validateCourse(className);
    if (!isValid) {
      alert(`course not found in ${roster} roster — try formatting it as 'ORIE 3120'`);
      setLoading(false);
      return;
    }

    // --- XP & TIME LOGIC ---
    const now = new Date();
    const [h, m] = startTime.split(":");
    const scheduledDate = new Date(date);
    scheduledDate.setHours(parseInt(h), parseInt(m), 0, 0);

    // Only award points if the session is happening NOW or has already started
    const shouldAwardXP = now >= scheduledDate;
    // -----------------------

    const userId = auth.currentUser?.uid || "anonymous";

    try {
      await addDoc(collection(db, "sessions"), {
        class: className.trim().toUpperCase(),
        location,
        lat: selectedCoords.lat,
        lng: selectedCoords.lng,
        type,
        capacity: `1/${capacity}`,
        memberCount: 1,
        members: [userId],
        note,
        start: startTime,
        date,
        pin: type === "private" ? pin : null,
        createdBy: userId,
        createdAt: Date.now(),
      });

      if (auth.currentUser && shouldAwardXP) {
        await updateDoc(doc(db, "profiles", auth.currentUser.uid), {
          points: increment(10)
        });
      } else if (!shouldAwardXP) {
        console.log("Future session scheduled: XP will not be awarded yet.");
      }

      onClose();
    } catch (error) {
      console.error("Error creating session:", error);
      alert("Failed to create group. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "1rem 1.25rem" }}>
      <h2 style={{ fontSize: "16px", fontWeight: "500", marginBottom: "1rem" }}>
        create a group
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <input
          placeholder="class (e.g. ORIE 3120)"
          value={className}
          onChange={e => setClassName(e.target.value)}
        />

        <div style={{ position: "relative" }}>
          <input
            placeholder="location (e.g. Duffield Hall)"
            value={location}
            onChange={handleLocationChange}
            style={{ width: "100%", boxSizing: "border-box" }}
          />
          {suggestions.length > 0 && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "white",
              border: "0.5px solid #ccc",
              borderRadius: "6px",
              zIndex: 99999,
              maxHeight: "180px",
              overflowY: "auto",
            }}>
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  onClick={() => handleSelectSuggestion(s)}
                  style={{
                    padding: "8px 12px",
                    fontSize: "12px",
                    cursor: "pointer",
                    borderBottom: "0.5px solid #eee",
                    color: "#333",
                  }}
                  onMouseEnter={e => e.target.style.background = "#f5f5f5"}
                  onMouseLeave={e => e.target.style.background = "white"}
                >
                  {s.shortName}
                </div>
              ))}
            </div>
          )}
        </div>

        <input
          type="number"
          placeholder="max people"
          value={capacity}
          onChange={e => setCapacity(e.target.value)}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "12px", color: "#888" }}>date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "12px", color: "#888" }}>start time</label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <select
              value={startTime.split(":")[0] || ""}
              onChange={e => setStartTime(`${e.target.value}:${startTime.split(":")[1] || "00"}`)}
              style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "0.5px solid #ccc", fontSize: "14px" }}
            >
              <option value="" disabled>hour</option>
              {hours.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span style={{ color: "#888" }}>:</span>
            <select
              value={startTime.split(":")[1] || ""}
              onChange={e => setStartTime(`${startTime.split(":")[0] || "00"}:${e.target.value}`)}
              style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "0.5px solid #ccc", fontSize: "14px" }}
            >
              <option value="" disabled>min</option>
              {minutes.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <input
          placeholder="note (optional, e.g. covering PS4)"
          value={note}
          onChange={e => setNote(e.target.value)}
        />

        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
          <button
            onClick={() => { setType("public"); setPin(""); }}
            style={{
              flex: 1,
              padding: "6px",
              borderRadius: "6px",
              border: "0.5px solid",
              borderColor: type === "public" ? "#1D9E75" : "#ccc",
              background: type === "public" ? "#E1F5EE" : "white",
              color: type === "public" ? "#0F6E56" : "#666",
              fontWeight: type === "public" ? "500" : "400",
              cursor: "pointer",
            }}
          >
            public
          </button>
          <button
            onClick={() => setType("private")}
            style={{
              flex: 1,
              padding: "6px",
              borderRadius: "6px",
              border: "0.5px solid",
              borderColor: type === "private" ? "#534AB7" : "#ccc",
              background: type === "private" ? "#EEEDFE" : "white",
              color: type === "private" ? "#3C3489" : "#666",
              fontWeight: type === "private" ? "500" : "400",
              cursor: "pointer",
            }}
          >
            private
          </button>
        </div>

        {type === "private" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", color: "#888" }}>4 digit pin</label>
            <input
              type="password"
              maxLength={4}
              placeholder="----"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              style={{
                letterSpacing: "8px",
                textAlign: "center",
                fontSize: "20px",
                padding: "8px",
                borderRadius: "6px",
                border: "0.5px solid #534AB7",
              }}
            />
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            marginTop: "8px",
            padding: "10px",
            background: loading ? "#ccc" : "#cc0000",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontWeight: "500",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "14px",
          }}
        >
          {loading ? "validating + creating..." : "drop pin + create group"}
        </button>

        <button
          onClick={onClose}
          style={{
            padding: "8px",
            background: "transparent",
            border: "none",
            color: "#888",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          cancel
        </button>
      </div>
    </div>
  );
}