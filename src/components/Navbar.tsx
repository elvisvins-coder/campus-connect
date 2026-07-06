function Navbar() {
  return (
    <nav style={{
      display: "flex",
      justifyContent: "space-between",
      padding: "15px 30px",
      background: "#1e1e2f",
      color: "white"
    }}>
      <h2>CampusConnect</h2>

      <div style={{ display: "flex", gap: "20px" }}>
        <p>Home</p>
        <p>Profile</p>
        <p>Messages</p>
      </div>
    </nav>
  );
}

export default Navbar;