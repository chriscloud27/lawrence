import styles from "./marketing.module.css";

const SUBJECTS = [
  "Accounting",
  "Biology",
  "Business Studies",
  "Chemistry",
  "Chinese",
  "Economics",
  "English",
  "English Literature",
  "French",
  "Geography",
  "History",
  "Law",
  "Mandarin",
  "Maths",
  "Physics",
  "Psychology",
  "SAT",
  "Science",
  "Spanish",
  "Latin",
];

export default function TutorsGrid() {
  return (
    <div className={styles.tutors}>
      <div className={styles.container}>
        <div className={`${styles.sectionLabel} ${styles.textCenter}`}>Our Experts</div>
        <div className={`${styles.sectionTitle} ${styles.textCenter}`}>
          View All Our Experienced International Tutors
        </div>
      </div>
      <div className={styles.tutorsGrid}>
        {SUBJECTS.map(subject => (
          <a href="#" className={styles.tutorTag} key={subject}>
            {subject} Tutors
          </a>
        ))}
      </div>
      <div className={`${styles.viewAllWrap} ${styles.mt20}`}>
        <a href="#" className={`${styles.btn} ${styles.btnBlue}`}>
          View All Tutors
        </a>
      </div>
    </div>
  );
}
