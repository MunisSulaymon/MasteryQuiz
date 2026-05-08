# MasteryQuiz

MasteryQuiz is a smart, adaptive exam preparation application designed to help users master complex concepts with 100% certainty. It utilizes the **Leitner Box** mastery system to prioritize questions that require more focus.

## Features

- **Adaptive Mastery System**: Automatically moves questions between boxes (1, 2, or 3) based on your performance.
- **Fast-Paced Quiz Sets**: Questions are split into manageable sets for focused study sessions.
- **Firebase Synchronization**: Your progress (box levels, wrong counts, and session stats) is automatically saved to the cloud, allowing you to pick up exactly where you left off on any device.
- **Weakness Drill**: A specialized "Drill Weak Questions" mode that targets concepts you've struggled with (3+ errors) until they are fully mastered.
- **Time Pressure**: Integrated 20-second timer per question to simulate exam conditions and build quick recall.

## How to Use

1. **Input Questions**: Paste your questions in the supported format.
2. **Sign In**: Use Google Login to sync your progress automatically.
3. **Master Sets**: Work through the generated quiz sets.
4. **Drill Weak Spots**: Use the post-session drill to eliminate performance gaps.

## Question Format

Each question should follow this pattern:

```text
What is the capital of France?
====
London
====
#Paris (correct)
====
Berlin
====
Madrid
++++
...
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Motion (Framer Motion).
- **Backend/Database**: Firebase Firestore, Firebase Authentication.
- **Icons**: Lucide React.

## Deployment to Vercel

1. **Export to GitHub**: Push your local code to a GitHub repository.
2. **Connect to Vercel**: 
   - Sign in to [Vercel](https://vercel.com).
   - Click "Add New" -> "Project".
   - Import your GitHub repository.
3. **Configure Environment Variables**:
   - Add any required environment variables (like `GEMINI_API_KEY` if applicable, though this app primarily uses Firebase).
4. **Deploy**: Click "Deploy". Vercel will automatically build and host your application.

## Developed with Modern Web Technologies
This application was built using a modern full-stack architecture focusing on performance and user mastery.
