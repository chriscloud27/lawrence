import styles from "./marketing.module.css";

export default function AboutSection() {
  return (
    <div className={styles.about}>
      <div className={styles.aboutInner}>
        <div className={styles.aboutImg}>
          <div className={styles.aboutImgPlaceholder}>
            <svg viewBox="0 0 100 80" width={120} fill="white">
              <rect x={10} y={20} width={80} height={50} rx={4} />
              <polygon points="50,5 10,22 90,22" />
              <rect x={35} y={40} width={30} height={30} fill="rgba(0,0,0,.3)" />
            </svg>
          </div>
        </div>
        <div className={styles.aboutText}>
          <div className={styles.sectionLabel}>About ITS Education Asia</div>
          <div className={styles.sectionTitle}>WHY CHOOSE US?</div>
          <p>
            ITS Education Asia (ITS) provides flexible learning options (English medium) for a comprehensive range of
            university, secondary and primary school subjects and courses. Students learn with us both full-time and
            as tutorial support for mainstream school.
          </p>
          <p>
            We have a wide range of fully qualified and experienced international teachers, examiners &amp; tutors
            who are native English speakers. ITS operates a school in Hong Kong registered with the Hong Kong
            Education Bureau — Hong Kong&apos;s only alternative open-access examination centre for IGCSE, IAL, GCE
            and many more exams.
          </p>
          <p>
            ITS is accredited with a wide range of official government and educational bodies including UCAS,
            Pearson Edexcel, OCR and more. We have been offering live online lessons since 2012.
          </p>
          <div className={styles.accreditations}>
            <div className={styles.accredBadge}>UCAS Accredited</div>
            <div className={styles.accredBadge}>Pearson Edexcel</div>
            <div className={styles.accredBadge}>OCR Partner</div>
            <div className={styles.accredBadge}>Cambridge CAIE</div>
            <div className={styles.accredBadge}>HKEB Registered</div>
          </div>
          <div className={styles.mt20}>
            <a href="#" className={`${styles.btn} ${styles.btnBlue}`}>
              Submit Enquiry Now!
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
