"use client";

import { useState } from "react";
import styles from "./marketing.module.css";

const TABS = [
  {
    id: "school",
    label: "🏫 School & Tuition",
    tags: [
      "Tuition for Secondary",
      "A-level Support",
      "Full-time Schooling",
      "IB Tuition & Support",
      "School Entrance Test Prep",
      "SAT Tuition & Courses",
      "IGCSE Support",
      "Online Classes",
      "Primary Tuition",
    ],
  },
  {
    id: "qualifications",
    label: "📜 Global Qualifications",
    tags: [
      "Private Candidates",
      "A-level Courses",
      "IGCSE Courses",
      "Exam Enrolment",
      "University Entrance Tests",
      "School Entrance Prep",
      "BTEC Courses",
      "IAL Group Classes",
    ],
  },
  {
    id: "admissions",
    label: "🎓 School & Uni Admissions",
    tags: [
      "School Search HK & Singapore",
      "School Interview Prep Classes",
      "School Search Database",
      "Young Changemakers (YCI)",
      "US University Admissions",
      "UCAS Admissions",
      "UK Boarding Schools",
      "Invigilation / Proctoring",
    ],
  },
];

export default function ServicesTabs() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  return (
    <div className={styles.services}>
      <div className={`${styles.container} ${styles.textCenter}`}>
        <div className={styles.sectionLabel}>What We Offer</div>
        <div className={styles.sectionTitle}>School &amp; Tuition · Global Qualifications · Admissions</div>
      </div>
      <div className={styles.container}>
        <div className={styles.serviceTabs}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`${styles.serviceTab} ${activeTab === tab.id ? styles.serviceTabActive : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {TABS.map(tab => (
          <div
            key={tab.id}
            className={`${styles.servicePanel} ${activeTab === tab.id ? styles.servicePanelActive : ""}`}
          >
            {tab.tags.map(tag => (
              <a href="#" className={styles.serviceTag} key={tag}>
                {tag}
              </a>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
