StudyMatch - study partner & group finder (PROTOTYPE)
=====================================================

HOW TO RUN
  1. Unzip the folder.
  2. Double-click index.html (any modern browser). No install or server needed.
     (Inter font loads from Google Fonts if you're online; it falls back to system fonts offline.)

FILES
  index.html  - page shell
  style.css   - design system (navy brand, violet for AI, green for success, amber for upcoming)
  script.js   - all app logic: auth, onboarding, matching engine, feed, groups, sessions,
                requests, messages, notifications, profile/marks, settings, search, assistant

TRY THIS
  1. Create an account, then complete onboarding.
  2. Add Mathematics as "Needs improvement" and English as "Strong" -> Priya Raman (demo)
     appears as a top mutual match with an explanation.
  3. Send her a study request, then open Notifications & requests -> Study requests and use the
     "Demo: accept" button to simulate her reply. Messaging unlocks after acceptance.
  4. Create a group, schedule a session, mark it completed, record what you studied.
  5. Add marks under My profile (percentages are calculated; marks stay private by default).
  6. Ask the assistant: "I can teach Python but need help with Data Structures."

WHAT IS REAL IN THIS PROTOTYPE
  - Everything persists in your browser (localStorage) across refreshes.
  - Matching engine: transparent weighted score (see WEIGHTS at the top of script.js).
  - Validation, privacy toggles, request/group/session rules (capacity, duplicates, consent).
  - Peer ratings: rate accepted study partners 1-10 on character, performance, attitude,
    punctuality and personality; profiles show the averages as ring charts (individual ratings hidden).
  - Marks: percentage calculation, validation, comparisons, trend charts (3+ results).

WHAT IS NOT REAL (needs a backend)
  - Accounts live only in this browser. There is no Google/GitHub/phone sign-in, no email
    password reset, no sessions across devices. Passwords are salted and hashed in the browser,
    which is NOT a substitute for server-side auth.
  - "Demo" students, groups, sessions and posts are sample data and cannot reply.
  - The assistant is rule-based (keyword/pattern parsing + the matching engine), not an AI model.
  - Authorization is enforced only in the browser. Anyone with dev tools can read local data.
    Row-level security, private file storage, rate limits, moderation and true concurrency-safe
    group capacity all require a server.
  - Email/push/SMS notifications, ID verification, and server-side account deletion.

PRODUCTION PATH (from your master prompt)
  React + TypeScript + Tailwind, Supabase (Postgres, Auth with Google/GitHub/phone OTP, Storage,
  row-level security), and a server-side LLM call (keys on the server) that retrieves real candidates
  and ranks them with this same scoring logic. script.js is organized so the matching engine
  (matchScore / explain) can be ported as-is.

RESET: Settings -> Delete account, or sign-in page -> Forgot password -> Clear all prototype data.
