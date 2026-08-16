import styles from "./marketing.module.css";

export default function TrustpilotStrip() {
  return (
    <div className={styles.trustStrip}>
      <div className={styles.tpLogo}>
        <div className={styles.tpBadge}>★ Trustpilot</div>
        <div>
          <div className={styles.tpStars}>★★★★★</div>
          <div className={styles.tpText}>Excellent · 4.8 / 5</div>
        </div>
      </div>
      <div className={styles.tpQuote}>
        &ldquo;A great learning experience with committed, caring people. Passionate about what they do.&rdquo; —{" "}
        <strong>Sever Mican</strong>
      </div>
      <div>
        <a href="#" className={styles.tpLink}>
          Read our reviews on Trustpilot →
        </a>
      </div>
    </div>
  );
}
