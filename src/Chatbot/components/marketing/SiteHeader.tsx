import styles from "./marketing.module.css";

export default function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.logoWrap}>
        <div className={styles.logoText}>
          ITS<span>.</span>education
        </div>
        <div className={styles.logoSub}>IF IT&apos;S EDUCATION, IT&apos;S ITS · Pathways To Learning Since 2005</div>
        <div className={styles.logoReg}>Hong Kong Registered School 566985</div>
      </div>
      <div className={styles.headerCtas}>
        <a href="#" className={`${styles.btn} ${styles.btnOutline}`}>
          Course Finder
        </a>
        <a href="#" className={`${styles.btn} ${styles.btnGold}`}>
          Enrol Now
        </a>
        <a href="#" className={`${styles.btn} ${styles.btnBlue}`}>
          Contact Us
        </a>
      </div>
    </header>
  );
}
