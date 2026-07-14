# Scholars Academy Graduation Album (Class of 2026)

Welcome to the **Scholars Academy Graduation Album & Memory Vault** for the graduating Class of 2026. This is a full-stack yearbook application designed to preserve, moderate, and share memories from our high school journey.

## Features

-   **Graduand Wall**: A directory of all graduating seniors with their portraits, nicknames, house colors, aspirations, and farewell messages.
-   **Interactive Photo Album**: A curated digital photo library categorized by year. Includes an upload portal allowing students, parents, and teachers to share high-resolution snapshots.
-   **Video Vault**: High-performance video memory players playing curated YouTube videos of graduation ceremonies and school life.
-   **Teacher Tributes & Milestones**: A heartfelt tribute space and timeline marking key milestone memories of our high school years.
-   **Admin Control Panel & Gatekeeper Moderation**:
    -   Secure Google Authentication checking real-time Firestore database-authorized email access.
    -   Live **Moderation Queue** where admins approve or reject user-submitted photos, videos, superlatives, and memories.
    -   Comprehensive panel controls for directly adding/editing students, superlatives, milestones, custom sections, and brand details.
    -   **Clean Up Mode** for removing published items easily from the UI.

## Technology Stack

-   **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide icons, and Motion (`motion/react`) for smooth page transitions and micro-animations.
-   **Backend**: Express.js server bundled using `esbuild` for Node environment execution.
-   **Database & Auth**: Firebase Firestore (for all yearbook profiles, records, custom layout visibility, and admin users) and Firebase Authentication (Google Auth provider).

## Setup & Local Installation

### Prerequisites

-   **Node.js** (v18 or higher recommended)
-   **npm** (Node Package Manager)

### Installation Steps

1.  Clone or extract the repository files.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up your local environment variables (see the Environment Variables section below).
4.  Run the application in development mode:
    ```bash
    npm run dev
    ```
    This starts the Express backend server on port `3000` with hot-reloading.

5.  Build the production bundle:
    ```bash
    npm run build
    ```
    This compiles the client-side SPA static assets into `/dist` and compiles the backend TS server into a single bundled ES Module `/dist/server.cjs` using `esbuild`.

6.  Start the production server:
    ```bash
    npm run start
    ```

## Environment Variables

Copy the `.env.example` file to create a `.env` file at the root of the project:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Server Port (fixed to 3000 by infrastructure proxy)
PORT=3000
```

*Note: Client-side variables are prefixed with `VITE_` to expose them securely in Vite.*

## Security and Integrity

The application enforces database integrity and robust administration security:
-   Admin access is strictly gated by Firebase Authentication via Google sign-in.
-   Administrative authorizations are verified against the allowed admin email accounts list stored in the `admin_users` collection in Firestore.
-   All user uploads are stored in public cloud storage, compressed client-side first to optimize bandwidth, and held in a `pending_submissions` queue until reviewed and approved by a gatekeeper.
