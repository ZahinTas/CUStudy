import { useState } from "react";
import MapView from "../MapView";
import CreateGroupForm from "../components/CreateGroupForm";

function Home() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)", overflow: "hidden" }}>

      {/* welcome section */}
      <div style={{
        background: "linear-gradient(135deg, #cc0000, #cc0000)",
        color: "white",
        padding: "16px 20px 14px",
        flexShrink: 0,
      }}>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "white" }}>
          find your study crew 🎓
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "white"}}>
          see who's studying on campus right now
        </p>
      </div>

      {/* map section */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <MapView onCreateClick={() => setShowForm(true)} />

        {showForm && (
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "white",
            zIndex: 9999,
            borderRadius: "16px 16px 0 0",
            boxShadow: "0 -2px 20px rgba(0,0,0,0.15)",
            maxHeight: "80vh",
            overflowY: "auto",
          }}>
            <CreateGroupForm onClose={() => setShowForm(false)} />
          </div>
        )}
      </div>

    </div>
  );
}

export default Home;