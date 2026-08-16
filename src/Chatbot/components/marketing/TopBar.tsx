import styles from "./marketing.module.css";

export default function TopBar() {
  return (
    <div className={styles.topBar}>
      <span>🏫 Hong Kong Registered School 566985 — Est. 2005</span>
      <div style={{ display: "flex", gap: 16 }}>
        <a href="#">+852 2648 2001</a>
        <a href="#">Contact Us</a>
        <a href="#">Enrol Now</a>
      </div>
    </div>
  );
}
