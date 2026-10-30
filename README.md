# CUStudy

**Find your study crew on campus, right now.**

CUStudy is a web app that helps Cornell students form study groups. Students drop a pin on a live campus map for a study session, and anyone else at Cornell can see it and join. Studying together earns XP, and a campus-wide leaderboard shows who's putting in the time.

## Features

- **Live study map.** Sessions appear as pins on an interactive map of campus and update in real time. Public and private sessions use different colors.
- **Create a session.** Pick a course, location, date, start time, group size and an optional note. Locations are searchable, and courses are checked against Cornell's class roster.
- **Join, leave and end sessions.** Public sessions are one tap to join. Private sessions need a 4-digit PIN. Full groups block new members, and ownership passes to the next member if the owner leaves.
- **Cornell-only sign-in.** Email/password or Google login, restricted to `@cornell.edu` addresses.
- **XP, levels and leaderboard.** Earn points for creating, staying in and finishing sessions. Track your level on your profile and see the top students on the leaderboard.
- **Profiles.** Name, photo, year, college, major and verified enrolled courses, plus account deactivation and deletion.
- **Room booking shortcut.** Links out to Cornell Library's room-booking page (no in-app booking).

## Tech Stack

- **Frontend:** React 19, Vite, JavaScript (JSX), CSS
- **Maps:** Leaflet and React-Leaflet with OpenStreetMap tiles
- **Backend:** Firebase Firestore (database) and Firebase Authentication
- **External APIs:** Cornell Class Roster API, OpenStreetMap Nominatim
- **Tooling:** ESLint, npm

## Demo
[YouTube Link](https://youtu.be/cTR7aeC42Gc)

## Team

- Zahin Tasnin 
- Ahlaam Sebri
- Annalisa Abbate
- Daisy Lin
- Kenan Tat
