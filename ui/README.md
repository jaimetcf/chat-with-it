# Chat with It - UI

This is the Next.js frontend application for the Chat with It system. It provides a modern, responsive interface for users to interact with the AI agent and manage company documents.

## Features

- **Authentication**: Firebase Authentication with email/password login and signup
- **Chat Interface**: Real-time chat interface similar to ChatGPT
- **Document Management**: Upload and manage company documents with processing status
- **Protected Routes**: Secure access to authenticated features
- **Responsive Design**: Modern UI built with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Auth
- **Database**: Firestore (for future integration)
- **Storage**: Firebase Storage (for future integration)
- **Icons**: Lucide React

## Project Structure

```
ui/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   │   ├── login/         # Login page
│   │   └── signup/        # Signup page
│   ├── (dashboard)/       # Protected dashboard pages
│   │   ├── chat/          # Chat interface
│   │   └── documents/     # Document management
│   ├── api/               # API routes
│   │   ├── chat/          # Chat API endpoint
│   │   └── upload/        # File upload API endpoint
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── auth-provider.tsx  # Authentication context
│   ├── protected-route.tsx # Route protection
│   ├── dashboard-layout.tsx # Dashboard layout
│   ├── chat-interface.tsx # Chat component
│   └── document-management.tsx # Document management
├── lib/                   # Utility libraries
│   ├── firebase.ts        # Firebase configuration
│   ├── auth.ts           # Authentication utilities
│   └── utils.ts          # General utilities
└── public/               # Static assets
```

## Setup Instructions

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project (for authentication)

### Installation

1. **Clone the repository and navigate to the UI directory:**
   ```bash
   cd ui
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` and add your Firebase configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser and navigate to:**
   ```
   http://localhost:3000
   ```

## Firebase Setup

1. **Create a Firebase project** at [Firebase Console](https://console.firebase.google.com/)

2. **Enable Authentication:**
   - Go to Authentication > Sign-in method
   - Enable Email/Password authentication

3. **Get your Firebase config:**
   - Go to Project Settings > General
   - Scroll down to "Your apps" section
   - Add a web app if you haven't already
   - Copy the configuration object

4. **Update your `.env.local`** with the Firebase config values

## Usage

### Authentication
- Users can sign up with email and password
- Users can sign in with their credentials
- Protected routes automatically redirect to login

### Chat Interface
- Real-time chat with AI assistant
- Message history display
- Loading states and error handling
- Responsive design for mobile and desktop

### Document Management
- Upload multiple document types (PDF, DOC, DOCX, TXT)
- View document processing status
- Track upload progress and completion

## API Endpoints

### `/api/chat`
- **Method**: POST
- **Body**: `{ message: string, userId: string }`
- **Response**: `{ response: string }`

### `/api/upload`
- **Method**: POST
- **Body**: FormData with file and userId
- **Response**: `{ success: boolean, message: string }`

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Structure

- **Components**: Reusable React components in `/components`
- **Pages**: Next.js pages in `/app`
- **API Routes**: Server-side API endpoints in `/app/api`
- **Utilities**: Helper functions in `/lib`

## Future Integrations

This UI is designed to integrate with:

1. **Google Cloud Functions** for backend processing
2. **Firebase Firestore** for data storage
3. **Firebase Storage** for document storage
4. **Vector embeddings** for semantic search
5. **OpenAI Agents SDK** for AI processing

## Contributing

1. Follow the existing code structure
2. Use TypeScript for all new code
3. Follow the established naming conventions
4. Add proper error handling
5. Test your changes thoroughly

## License

This project is part of the Chat with It system.
