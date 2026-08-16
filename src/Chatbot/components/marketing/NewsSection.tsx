import styles from "./marketing.module.css";

const NEWS = [
  {
    icon: "🌍",
    date: "13 May 2026",
    title: "ITS Education Asia, UNITAR, and the UN SDGs",
    body: "The Young Changemakers Incubator begins with a belief that young people are capable of far more than the world often expects of them…",
  },
  {
    icon: "✈️",
    date: "25 Mar 2026",
    title: "From Hormuz to Hong Kong: A Real-Time Lesson in How the World Works",
    body: "This week's events involving Iran and the resulting spike in fuel prices has shown how quickly the world can shift beneath our feet…",
  },
  {
    icon: "🎓",
    date: "10 Feb 2026",
    title: "University Admissions 2026 — What You Need to Know Now",
    body: "With application deadlines approaching, here's a comprehensive guide to UCAS, US Common App, and what universities are really looking for…",
  },
];

export default function NewsSection() {
  return (
    <div className={styles.news}>
      <div className={styles.container}>
        <div className={styles.sectionLabel}>SDG Education News &amp; Announcements</div>
        <div className={styles.sectionTitle}>YCI Lab — Latest Articles</div>
        <div className={styles.newsGrid}>
          {NEWS.map(item => (
            <div className={styles.newsCard} key={item.title}>
              <div className={styles.newsCardImg}>{item.icon}</div>
              <div className={styles.newsCardBody}>
                <div className={styles.newsDate}>{item.date}</div>
                <h4>{item.title}</h4>
                <p>{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
