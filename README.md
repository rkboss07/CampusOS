# CampusOS — Academic Notice Prioritizer & Student Task Hub

**CampusOS** is a student-first academic workspace designed to turn scattered college circulars, PDF notices, WhatsApp announcements, and administrative deadlines into prioritized, actionable tasks and a synchronized academic schedule.

Instead of manually sifting through dozens of multi-page PDF memos and department group messages, students can upload a circular or paste announcement text to immediately extract deadlines, target branches/years, required actions, consequences of missing, and a personalized **Priority Score (0–100)**.

---

## Key Features

### 1. Prominent Notice Ingestion & PDF Extraction
- **Dual Input Modes**:
  - **Upload PDF Circular**: Client-side PDF text extraction (via `pdfjs-dist`) and base64 document support for official university circulars, exam notifications, and fee orders.
  - **Paste Announcement Text**: Direct text input for WhatsApp announcements, department emails, or notice board excerpts.
- **Full Uploader Modal**: Dedicated modal workflow supporting drag-and-drop PDF parsing, page/size inspection, and instant prioritization.

### 2. Multi-Factor Priority Scoring Engine (0–100)
Every ingested circular is evaluated against the student's academic profile (**Name**, **Branch**, **Year**, **College**) across three weighted dimensions:
- **Student Relevance (%)**: Evaluates whether the circular explicitly targets the student's branch (e.g., *B.Tech AI & ML*) and academic year (e.g., *2nd Year*) or applies campus-wide.
- **Urgency (%)**: Calculates time sensitivity based on deadline proximity.
- **Importance (%)**: Assesses academic, financial, or administrative severity (e.g., examination form debarment vs. optional seminar).
- **Priority Level Classification**: Automatically categorizes notices into **Critical**, **High**, **Medium**, or **Low** priority with a segmented 4-bar visual indicator.

### 3. Key Takeaways Summary Card
- Directly below the ingestion centerpiece on the Dashboard, CampusOS displays a clean, editorial **Key Takeaways** card for the latest processed circular.
- Highlights **Action Required**, **Applicable Audience & Venue**, **Core Bullet Points**, and **Consequences if Missed** at a glance.

### 4. Multi-View CampusOS Dashboard
- **Kanban Board View**: Automatically partitions notices into four thematic columns:
  1. **Examinations** (*Examination & General*)
  2. **Fees & Grants** (*Fee & Scholarship*)
  3. **Assignments** (*Coursework & Lab Submissions*)
  4. **Events & Drives** (*Workshops, Seminars & Placements*)
- **Cards Grid View**: Unified responsive 3-column card grid sorted by Priority Score or Deadline.
- **Inline Smart Calendar View**: Quick monthly overview of August 2026 academic milestones right inside the dashboard.
- **Real-Time Search & Sort**: Instant filtering by keyword, category, or action item, plus one-click toggle between Priority Score sorting and chronological Deadline sorting.

### 5. Dedicated Notices Repository
- Filter circulars by status (**Active**, **Completed**, **All**) and category (**Examination**, **Assignment**, **Fee**, **Scholarship**, **Placement**, **Workshop / Event**).
- Each notice card displays:
  - **Title & Category**
  - **Priority Score (0–100)** with segmented progress bar
  - **Deadline & Priority Flag Chip**
  - **Mark as Done / Undo** (with celebratory confetti feedback and automatic two-way sync with the Tasks board)
  - **Delete Notice**

### 6. Notice Detail Inspector Modal
Clicking any notice card opens a comprehensive inspector with two tabs:
- **Information Extraction & Priority Matrix**:
  - Executive summary and full breakdown of **Student Relevance**, **Urgency**, **Importance**, and **Final Verdict**.
  - Structured metadata cards for **Category & Target Audience**, **Deadline / Timing**, **Required Action & Venue**, **Essential Highlights**, and **Consequence of Missing**.
  - One-click **Add to Tasks**, **Open Portal**, and **Google Calendar** event creation link.
- **Original College Notice / Memo**:
  - Displays the raw extracted text, source filename, creation date, and a one-click copy-to-clipboard button.

### 7. Smart Academic Calendar & `.ICS` Export
- **Interactive Monthly Grid**: Color-coded calendar highlighting critical academic dates (Examination Forms, AI Workshops, DBMS Lab Submissions, Semester Fee Dues).
- **Priority Deadlines Sidebar**: Quick-access list of upcoming deadlines with completion status indicators.
- **Universal Calendar Export**: One-click **Export .ICS** button generates a standard iCalendar file compatible with Google Calendar, Apple Calendar, and Microsoft Outlook, plus direct Google Calendar deep links on every notice.

### 8. Personal Task Management (Two-Way Synced)
- **Automatic Deliverable Generation**: Ingesting a notice automatically creates a linked actionable deliverable in the student's task list.
- **Custom Task Creation**: Add personal college tasks with custom due dates.
- **Two-Column Workflow**: Organized into **To Do & In Progress** and **Completed Deliverables**, synchronized in real time with notice completion states.

### 9. Student Academic Profile Customization
- Click the profile header in the sidebar to customize:
  - **Student Name**
  - **Branch** (*B.Tech AI & ML*, *B.Tech CSE*, *B.Tech IT*, *B.Tech Mechanical*)
  - **Academic Year** (*1st Year* – *4th Year*)
  - **College Name**
- Profile updates persist in `localStorage` and dynamically tailor relevance scoring for newly ingested circulars.

---

## Design System & UI Architecture

### Warm Paper & Ink Theme + Independent Dark Mode
- **Light Mode**: Warm cream and paper palette (`#EFECE6` outer frame, `#F6F3EC` sidebar, `#FFFFFF` main canvas, `#FFF5EC` notice ingestion centerpiece, `#F97316` accent highlights) designed for long reading sessions without eye strain.
- **Dark Mode**: Deep high-contrast slate theme (`#0b0c10` outer frame, `#16171d` sidebar, `#0f1015` main canvas, `#211710` notice ingestion centerpiece) accessible via the sidebar toggle and persisted across sessions.
- **Responsive Mobile Drawer**: On phones and small viewports (`< 768px`), the sidebar collapses into a smooth off-canvas slide-over drawer triggered from the top menu bar.

### Strict 5-Tier Typography System
Standardized on **Plus Jakarta Sans** with a strict 2-weight ceiling (**Regular 400** and **SemiBold 600**) and `tabular-nums` alignment for scores and dates:
1. **Screen Title** (`.type-screen-title`): `30px` (`1.875rem`), line-height `1.2`, tracking `-0.025em`, weight `600`.
2. **Section Title** (`.type-section-title`): `15px` (`0.9375rem`), line-height `1.35`, tracking `-0.01em`, weight `600`.
3. **Body** (`.type-body`): `14px` (`0.875rem`), line-height `1.5`, weight `400`.
4. **Caption** (`.type-caption`): `12px` (`0.75rem`), line-height `1.4`, weight `400`, muted tone with `tabular-nums`.
5. **Button** (`.type-button`): `13px` (`0.8125rem`), line-height `1.2`, weight `600`.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React Icons, Canvas Confetti
- **PDF Processing**: `pdfjs-dist` (client-side multi-page PDF text extraction)
- **Backend Server**: Node.js + Express (`server.ts`) with Vite middleware integration
- **Structured Extraction & Prioritization**: `@google/genai` SDK with deterministic heuristic fallback (`server.ts`) so the app works reliably even offline or without external API keys
- **Persistence**: Browser `localStorage` for notices, tasks, student profile, and theme preference

---

## Project Structure

```text
├── index.html                  # HTML entry point loading Plus Jakarta Sans (400, 600)
├── server.ts                   # Express API server (/api/analyze-notice, /api/daily-brief)
├── package.json                # Dependencies and scripts
├── src/
│   ├── App.tsx                 # Root state container, localStorage sync, & modal orchestration
│   ├── index.css               # Tailwind v4 imports, 5-tier typography classes, & dark mode rules
│   ├── types.ts                # TypeScript interfaces (Notice, Task, StudentProfile, DailyBrief)
│   ├── data/
│   │   └── initialData.ts      # Initial realistic college circulars, tasks, and default profile
│   ├── utils/
│   │   ├── calendarUtils.ts    # Calendar grid generator, Google Calendar URL builder, & .ICS exporter
│   │   └── pdfExtractor.ts     # Client-side PDF text and metadata extractor
│   └── components/
│       ├── Sidebar.tsx         # Collapsible navigation sidebar, profile trigger, & theme switch
│       ├── DashboardView.tsx   # Main dashboard, notice ingestion centerpiece, & Kanban/Card/Calendar views
│       ├── NoticesView.tsx     # Filterable notice card repository
│       ├── CalendarView.tsx    # Smart academic calendar & priority deadline list
│       ├── TasksView.tsx       # Two-column personal task board
│       ├── NoticeIngestModal.tsx # Full PDF/text upload modal
│       ├── NoticeDetailModal.tsx # Detailed priority matrix & raw circular inspector
│       └── ProfileModal.tsx    # Student academic profile editor
```

---

## Getting Started Locally

### Prerequisites
- **Node.js** (v18+ recommended)
- **npm** or **bun**

### Installation & Development
1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Configure environment variables** (optional for live Gemini extraction; deterministic fallback is built-in):
   ```bash
   cp .env.example .env
   ```
3. **Start the full-stack development server** (runs on `http://localhost:3000`):
   ```bash
   npm run dev
   ```
4. **Build for production**:
   ```bash
   npm run build
   ```

---

## Deploying to GitHub Pages

CampusOS is configured to run **100% standalone on GitHub Pages** (including subpath URLs like `https://<username>.github.io/<repo-name>/`):
- **Relative Asset Paths**: `vite.config.ts` uses `base: './'` so all CSS/JS bundles resolve properly on any GitHub Pages repository URL or custom domain.
- **Client-Side Analysis Engine**: When hosted on static environments where `/api/*` routes are absent, `src/utils/noticeAnalyzer.ts` automatically executes the client-side notice prioritization, PDF text extraction, deadline parsing, and profile relevance scoring engine without requiring a backend server.
- **Automated GitHub Actions Workflow**: `.github/workflows/deploy.yml` is pre-configured to build and deploy the `dist/` folder automatically on every push to `main` or `master`.

### Steps to Enable GitHub Pages:
1. Push this repository to GitHub.
2. In your GitHub repository, open **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. Push a commit to `main` (or trigger **Deploy CampusOS to GitHub Pages** manually from the **Actions** tab). Your live site URL will appear in the workflow output.
