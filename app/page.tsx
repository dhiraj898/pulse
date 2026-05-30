import { redirect } from 'next/navigation';

// Middleware handles auth/onboarding gating; the root just forwards to the app.
export default function Home() {
  redirect('/dashboard');
}
