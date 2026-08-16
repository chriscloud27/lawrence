import styles from "./marketing.module.css";

const NAV_ITEMS: { label: string; dropdown?: string[] }[] = [
  { label: "Home" },
  {
    label: "Tuition ▾",
    dropdown: [
      "Primary Tuition",
      "IGCSE Tuition",
      "A-levels Tuition",
      "IB Tuition",
      "SAT Prep",
      "SSAT / ISEE",
      "Online School",
      "Online Timetables",
    ],
  },
  {
    label: "Full-Time Programmes ▾",
    dropdown: ["IGCSE Private Candidates", "IAL Private Candidates", "IAL Group Class"],
  },
  {
    label: "Uni Admissions ▾",
    dropdown: [
      "Choosing Your University",
      "US University Admissions",
      "UK / UCAS Applications",
      "Oxbridge Applications",
      "EPQ",
      "Get Predicted Grades",
    ],
  },
  {
    label: "School Admissions ▾",
    dropdown: [
      "HK / Singapore Schools",
      "School Interview Prep",
      "School Search Database",
      "UK School Admissions",
      "School Placement Services",
    ],
  },
  {
    label: "SDG Education ▾",
    dropdown: ["Young Changemaker (YCI)", "YAAPP (United Nations)", "ITS Foundation", "Sustainability Library"],
  },
  {
    label: "Exams ▾",
    dropdown: ["IGCSE Exams", "A-level Exams", "Mock Exams", "UCAT", "STEP", "Invigilation Services"],
  },
  { label: "Events" },
  {
    label: "Resources ▾",
    dropdown: [
      "Free Plagiarism Checker",
      "School Reviews",
      "School Search Database",
      "Article Library",
      "IB Resources",
      "Subject Dictionaries",
    ],
  },
  {
    label: "About Us ▾",
    dropdown: ["Contact Details", "Why ITS?", "The ITS Team", "Testimonials", "Careers With ITS", "Mission Statement"],
  },
];

export default function MainNav() {
  return (
    <nav className={styles.nav}>
      <div className={styles.navInner}>
        {NAV_ITEMS.map(item => (
          <div className={styles.navItem} key={item.label}>
            <a href="#">{item.label}</a>
            {item.dropdown && (
              <div className={styles.dropdown}>
                {item.dropdown.map(entry => (
                  <a href="#" key={entry}>
                    {entry}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
