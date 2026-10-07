const ReviewCard = ({ title, value, color }) => {
  return (
    <div
      className="card"
      style={{
        padding: "20px",
      }}
    >
      <p
        style={{
          color: "var(--text-3)",
        }}
      >
        {title}
      </p>

      <h2
        style={{
          marginTop: "15px",
          color: color || "var(--text)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {value}
      </h2>
    </div>
  );
};

export default ReviewCard;
