function Hero() {
  return (
    <section style={{
      height: "60vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "column",
      background: "linear-gradient(to right, #4facfe, #00f2fe)",
      color: "white",
      textAlign: "center"
    }}>
      <h1 style={{ fontSize: "3rem", marginBottom: "10px" }}>
        Welcome to CampusConnect
      </h1>

      <p style={{ fontSize: "1.2rem", maxWidth: "500px" }}>
        Connect with students, share moments, and explore campus life in one place.
      </p>

      <button style={{
        marginTop: "20px",
        padding: "10px 20px",
        border: "none",
        borderRadius: "5px",
        background: "#1e1e2f",
        color: "white",
        cursor: "pointer"
      }}>
        Get Started
      </button>
    </section>
  );
}

export default Hero;