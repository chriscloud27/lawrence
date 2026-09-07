# Lawrence: SaaS Feedback-Playbook

## Phase 1: Vorbereitung

### Komponenten-Liste
```
1. Chatbot Pre-Qual (3 Fragen)
2. BANT-Scoring (0–100)
3. AI-Agent Refinement (35–50 Band)
4. Score Badge
5. Email-Handoff
6. CRM-Writeback
7. Lead-Priority Notification
8. Dashboard (v2 — nur zeigen, nicht werten)
```

### Die 3-Fragen pro Komponente
```
Q1: "Relevanz für deine Arbeit? (1=Nicht wichtig | 2=Nett | 3=Wichtig | 4=Kritisch)"
Q2: "Wahrgenommener Wert? (1=Minimal | 2=Etwas | 3=Bedeutsam | 4=Transformativ)"
Q3: "Monatliche Zahlungsbereitschaft? (£ offen oder: £0–50 | £50–200 | £200–500 | £500+)"
```

---

## Phase 2: Gesprächsführung (30–45 min)

### Eröffnung (2 min)
```
"Ich zeige dir heute 5–7 Komponenten.
Bei jeder möchte ich deine ehrliche Einschätzung:
Wie hilfreich für dich? Würdest du dafür zahlen?
Lass mich Fragen stellen, damit ich den echten Mehrwert erkenne."
```

### Pro Komponente: Demo → Fragen
```
1. LIVE-DEMO (1–2 min) mit echtem Beispiel
2. SOFORT-FRAGE (nach Demo, nicht allgemein):
   "Normalerweise — wie lange wartet eine Mutter auf Antwort?
    Wenn dieser Bot das in 2 Min macht — wertvoll?"
3. Q1, Q2, Q3 (Antworten dokumentieren)
4. ZITATE sammeln ("Time-Saver", "zu komplex", etc.)
```

### Beispiel: Chatbot Pre-Qual
```
Demo: Zeige 3 Live-Fragen mit echtem Parent-Beispiel

Dann: "Wie lange brauchst du normalerweise für diese Vorgespräche?
      [Kunde antwortet z.B. '30–60 min pro Mutter']
      Der Bot macht das in 2 Min — wertvoll?"

Q1: "Relevanz 1–4?"  → [Antwort]
Q2: "Wert 1–4?"      → [Antwort]
Q3: "WTP/Monat?"     → [Antwort, z.B. £150]
```

### Abschluss (3 min)
```
"Wenn ich alle Features kombiniere — würdest du kaufen?
Bei welchem Preis macht's für dich Sinn?
£50 | £200 | £500 | £1000/Mo?"
```

---

## Phase 3: Datenerfassung

### Google Sheet Template
```
| Kunde | Datum | Komponente | Relevanz (1–4) | Wert (1–4) | WTP/Mo | Zitate |
|-------|-------|------------|----------------|-----------|--------|--------|
| Liam  | 1.Sep | Chatbot    | 4              | 4         | £150   | "Game-Changer" |
| Liam  | 1.Sep | BANT       | 4              | 3         | £100   | "Genau was wir brauchen" |
| Ryan  | 2.Sep | Chatbot    | 3              | 3         | £100   | "OK, aber..." |
```

### Auswertungs-Formeln
```
Durchschn. WTP pro Komponente: =AVERAGE(WTP-Spalte)
Features mit WTP > £100: [FILTER]
Features mit Relevanz = 4: [FILTER]
Konsens über 3 Interviews: [MEDIANWERT]
```

---

## Phase 4: Priorisierungs-Matrix

### Value vs. Effort
```
        │ HIGH VALUE (WTP > £100 + Relevanz ≥ 3)
        │
    4   │ [CRM-Writeback]     [Dashboard v2]
        │
    3   │ [BANT-Scoring]      [AI Refinement]
  E     │
  F  2  │ [Score Badge]       [Lead-Priority]
  F     │
  O  1  │ [Multi-Lang]        [Booking-Link]
  R     │
  T     └────────────────────────────
         1         2         3        4
         LOW ← EFFORT → HIGH
```

### Priorisierungs-Regeln
```
RANG 1 (Diese Woche):   HIGH Value + LOW Effort → Quick Wins
RANG 2 (Nächste 2 Wo):  HIGH Value + MED Effort → Strategic Bets
RANG 3 (Later):         HIGH Value + HIGH Effort → Big Bets
RANG 4 (Backlog):       LOW Value + ANY Effort → Nice-to-haves
```

---

## Phase 5: Feedback-Loop zum Kunden

### Email Template
```
Subject: Lawrence Feedback-Analyse — Deine Top-3 Features

Hi [Name],

Danke für dein Feedback. Ich habe [3] Interviews analysiert.

DEINE PRIORITÄTEN:
1. [Feature] (Relevanz 4/4, WTP £X/Mo) — QUICK WIN
2. [Feature] (Relevanz 4/4, WTP £Y/Mo) — START
3. [Feature] (Relevanz 4/4, WTP £Z/Mo) — ROADMAP

MEIN PLAN:
- Woche 1–2: Features 1+2 (deine Quick Wins)
- Woche 3–4: Pilot mit dir live
- Monat 2: Feature 3

Nächster Schritt: 15-Min Call diese Woche zur Validierung?

Grüße,
Chris
```

---

## Checkliste: Vor → Während → Nach

### BEFORE
```
☐ 5–8 Komponenten definieren
☐ Pro Komponente 3 Fragen vorbereitet
☐ Prototype live & demo-ready
☐ Google Sheet Vorlage erstellt
☐ Zoom + Recording getestet
```

### DURING (30–45 min)
```
☐ Eröffnung: Komponenten + Fragen-Logik erklären
☐ Pro Feature: Demo → Sofort-Frage → Q1–Q3
☐ Zitate sammeln
☐ Abschluss: Gesamtpaket-WTP
```

### AFTER
```
☐ Daten in Sheet within 24h
☐ 3× Interviews (verschiedene Kundentypen)
☐ Value vs. Effort Matrix füllen
☐ Top-3 Quick Wins identifizieren
☐ Feedback-Summary an Kunden
☐ Feature entwickeln, zeigen, nächste Runde starten
```

---

## Nächste Schritte

1. **Heute:** Komponenten-Liste + Fragen-Template für deine 5–7 Features
2. **Morgen:** Erstes Interview (Liam?)
3. **Diese Woche:** 3 Interviews
4. **Wochenende:** Daten auswerten → Roadmap
5. **Nächste Woche:** Top Quick Win bauen + zeigen
