import styles from "./marketing.module.css";

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerTop}>
          <div className={styles.footerCol}>
            <div className={styles.footerBrand}>
              ITS<span>.</span>education
            </div>
            <p className={styles.footerDesc}>
              ITS Education Asia — Hong Kong&apos;s leading international school &amp; tuition provider since 2005.
              Registered School 566985. Official exam centre for IGCSE, A-level &amp; more.
            </p>
          </div>
          <div className={styles.footerCol}>
            <h4>Tuition</h4>
            <a href="#">IGCSE Tuition</a>
            <a href="#">A-level Tuition</a>
            <a href="#">IB Tuition</a>
            <a href="#">SAT Prep</a>
            <a href="#">Primary Tuition</a>
            <a href="#">Online School</a>
          </div>
          <div className={styles.footerCol}>
            <h4>Admissions</h4>
            <a href="#">School Placement HK</a>
            <a href="#">UK Boarding Schools</a>
            <a href="#">UCAS / UK Uni</a>
            <a href="#">US University</a>
            <a href="#">School Search Database</a>
            <a href="#">Interview Prep</a>
          </div>
          <div className={styles.footerCol}>
            <h4>About</h4>
            <a href="#">Contact Us</a>
            <a href="#">Why ITS?</a>
            <a href="#">Our Tutors</a>
            <a href="#">Testimonials</a>
            <a href="#">Careers</a>
            <a href="#">Sitemap</a>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>© 2025 ITS Education Asia Ltd. All rights reserved. Hong Kong Registered School 566985.</p>
          <div className={styles.footerLegal}>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms</a>
            <a href="#">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
