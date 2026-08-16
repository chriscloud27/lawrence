import styles from "./marketing.module.css";

const AWARDS = [
  { icon: "🏆", title: "Best Tutoring Center", sub: "Hong Kong Living Award" },
  { icon: "⭐", title: "4.8 / 5 on Trustpilot", sub: "Excellent · 200+ reviews" },
  { icon: "🎓", title: "20+ Years Experience", sub: "Established 2005 · HK Reg'd School" },
  { icon: "🌏", title: "Asia's #1 School Search", sub: "HK & Singapore Database" },
];

export default function AwardsSection() {
  return (
    <div className={styles.awards}>
      <div className={styles.awardsInner}>
        <div className={`${styles.sectionLabel} ${styles.textCenter}`}>Recognition</div>
        <div className={`${styles.sectionTitle} ${styles.textCenter}`} style={{ marginBottom: 24 }}>
          Trusted by Families Across Asia Since 2005
        </div>
        {AWARDS.map(award => (
          <div className={styles.awardBadge} key={award.title}>
            <div className={styles.awardIcon}>{award.icon}</div>
            <div className={styles.awardTitle}>{award.title}</div>
            <div className={styles.awardSub}>{award.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
