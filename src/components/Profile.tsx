function Profile() {
  return (
    <section style={{
      display: "flex",
      justifyContent: "center",
      marginTop: "40px"
    }}>
      <div style={{
        width: "300px",
        padding: "20px",
        borderRadius: "15px",
        background: "#ffffff",
        boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
        textAlign: "center"
      }}>
        <img
          src="src/assets/img.jpeg"
          alt="Profile"
          style={{
            width: "100px",
    height: "100px",
    borderRadius: "50%",
    objectFit: "cover",
    marginBottom: "15px"
          }}
        />

        <h2>John Doe</h2>
        <p style={{ color: "gray" }}>Computer Science Student</p>

        <button style={{
          marginTop: "10px",
          padding: "8px 15px",
          border: "none",
          borderRadius: "5px",
          background: "#4facfe",
          color: "white",
          cursor: "pointer"
        }}>
          Edit Profile
        </button>
      </div>
    </section>
  );
}

export default Profile;