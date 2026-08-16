"use client";

import { useEffect, useState } from "react";
import styles from "./marketing.module.css";

const SLIDES = [
  {
    eyebrow: "📅 Sat, 20 Jun 2026 · 10:00–18:00 HKT",
    title: "Join Our Open House",
    sub: "Explore our International A-Level & Admissions pathways. Meet tutors, discover courses, and find the right path for your child.",
    primaryCta: "Register Now",
    secondaryCta: "Learn More",
    badgeIcon: "🎓",
    badgeTitle: "Open House",
    badgeSub: "A-Level, IGCSE & University Admissions Pathways",
  },
  {
    eyebrow: "🏆 Award Winning",
    title: "In-Person or Online",
    sub: 'Voted "Best Tutoring Center" Hong Kong. IB, A-level, IGCSE, SAT, DSE, Common Entrance — expert tutors since 2005.',
    primaryCta: "Course Finder",
    secondaryCta: "Enrol Now",
    badgeIcon: "🥇",
    badgeTitle: "Best Tutoring",
    badgeSub: "Center in Hong Kong — Hong Kong Living Award",
  },
  {
    eyebrow: "🇬🇧 UK Boarding Schools",
    title: "Securing Places at the UK's Top Boarding Schools",
    sub: "ISEB · CAT4 · UKiset · Common Entrance — preparation built around your child. Hong Kong's trusted school admissions specialists.",
    primaryCta: "Learn More",
    secondaryCta: null,
    badgeIcon: "🏫",
    badgeTitle: "Top UK Schools",
    badgeSub: "Eton, Harrow, Westminster & more — expert prep",
  },
  {
    eyebrow: "🌏 Asia's Best",
    title: "Asia's Leading School Search Database",
    sub: "Find, research, and discover the top international schools in Hong Kong and Singapore. Compare up to 4 schools simultaneously.",
    primaryCta: "Compare Schools Now",
    secondaryCta: null,
    badgeIcon: "🔍",
    badgeTitle: "School Search",
    badgeSub: "HK & Singapore International Schools Database",
  },
];

const AUTO_ADVANCE_MS = 5000;

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(c => (c + 1) % SLIDES.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [current]);

  const goSlide = (n: number) => setCurrent(n);
  const moveSlide = (dir: number) => setCurrent(c => (c + dir + SLIDES.length) % SLIDES.length);

  return (
    <div className={styles.hero}>
      {SLIDES.map((slide, i) => (
        <div
          key={slide.title}
          className={`${styles.heroSlide} ${i === current ? styles.heroSlideActive : ""}`}
        >
          <div className={styles.heroContent}>
            <div className={styles.heroEyebrow}>{slide.eyebrow}</div>
            <h1 className={styles.heroTitle}>{slide.title}</h1>
            <p className={styles.heroSub}>{slide.sub}</p>
            <div className={styles.heroBtns}>
              <a href="#" className={`${styles.btn} ${styles.btnGold}`}>
                {slide.primaryCta}
              </a>
              {slide.secondaryCta && (
                <a href="#" className={`${styles.btn} ${styles.btnOutline} ${styles.heroOutlineBtn}`}>
                  {slide.secondaryCta}
                </a>
              )}
            </div>
          </div>
          <div className={styles.heroBadge}>
            <div style={{ fontSize: 42, marginBottom: 8 }}>{slide.badgeIcon}</div>
            <h3>{slide.badgeTitle}</h3>
            <p>{slide.badgeSub}</p>
          </div>
        </div>
      ))}

      <button
        className={`${styles.carouselNav} ${styles.carouselPrev}`}
        onClick={() => moveSlide(-1)}
        aria-label="Previous slide"
      >
        &#8249;
      </button>
      <button
        className={`${styles.carouselNav} ${styles.carouselNext}`}
        onClick={() => moveSlide(1)}
        aria-label="Next slide"
      >
        &#8250;
      </button>
      <div className={styles.carouselDots}>
        {SLIDES.map((slide, i) => (
          <button
            key={slide.title}
            className={`${styles.carouselDot} ${i === current ? styles.carouselDotActive : ""}`}
            onClick={() => goSlide(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
