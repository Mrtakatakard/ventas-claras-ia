# VentasClaras Architecture

## Overview
VentasClaras is a modern web application for managing sales, quotes, and invoices. It is built on a serverless architecture using Firebase and Next.js.

## Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context + Hooks
- **Monitoring**: Sentry (Error Tracking), Firebase Performance Monitoring

### Backend
- **Platform**: Firebase Functions (Node.js 20)
- **Database**: Cloud Firestore (NoSQL)
- **Authentication**: Firebase Auth
- **Storage**: Cloud Storage for Firebase

## Core Components

### 1. Client Application (`src/`)
The frontend is a Single Page Application (SPA) served via Next.js.
- **`app/`**: Next.js App Router pages and layouts.
- **`components/`**: Reusable UI components (shadcn/ui based).
- **`lib/`**: Utility functions, Firebase initialization, and shared logic.
- **`services/`**: Client-side services for interacting with Firebase Functions and Firestore.

### 2. Serverless Functions (`functions/`)
Backend logic is encapsulated in cloud functions to ensure security and data integrity.
- **`controllers/`**: Request handlers for HTTP triggers.
- **`services/`**: Business logic layer.
- **`repositories/`**: Data access layer for Firestore interactions.
- **`utils/`**: Shared utilities (logging, validation).

## Data Flow
1. **User Interaction**: User triggers an action in the UI.
2. **Client Service**: The frontend service calls a Firebase Callable Function.
3. **Controller**: The function controller validates the request (using Zod schemas) and user authentication.
4. **Service Layer**: Business logic is executed (e.g., calculations, state transitions).
5. **Repository Layer**: Data is read from or written to Firestore.
6. **Response**: The result is returned to the client.

## Security
- **Authentication**: All protected routes and functions require a valid Firebase Auth token.
- **Authorization**: Custom claims and role-based checks (if applicable).
- **Validation**: Input validation using Zod on both client and server.
- **Firestore Rules**: Strict security rules to prevent unauthorized direct access.

## Monitoring & Observability
- **Errors**: Sentry captures unhandled exceptions in both frontend and backend.
- **Performance**: Firebase Performance Monitoring tracks page loads and network requests.
- **Logging**: Structured logging via `firebase-functions/logger` and custom wrappers.

## CI/CD Pipeline
Automated workflows via GitHub Actions:
1. **Lint & Typecheck**: Ensures code quality.
2. **Test**: Runs unit and integration tests.
3. **Build**: Verifies build integrity.
4. **Deploy Staging**: Automatic deployment to the staging environment on merge to `development`.
5. **Deploy Production**: Manual approval required for deployment to `production` from `main`.
