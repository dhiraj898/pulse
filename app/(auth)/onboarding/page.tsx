'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ROLES = [
  'Founder / Executive',
  'Manager / Team Lead',
  'Engineer / IC',
  'Sales / Account Management',
  'Consultant / Freelancer',
  'Operations',
  'Other',
];

const REFERRAL_SOURCES = [
  'Google search',
  'Twitter / X',
  'LinkedIn',
  'Friend or colleague',
  'Newsletter / blog',
  'Product Hunt',
  'Other',
];

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    role: ROLES[0],
    useCase: '',
    referralSource: REFERRAL_SOURCES[0],
  });
  const [firefliesKey, setFirefliesKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);

  // Saves the profile answers and marks onboarding complete. Called only at
  // the very end — after Fireflies is connected, or when the user skips it.
  const completeOnboarding = async () => {
    const response = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to save your details');
    }
  };

  // Step 3: test the Fireflies API key (the connect endpoint validates it
  // against the Fireflies API and stores it), then finish onboarding.
  const testFirefliesConnection = async () => {
    setError(null);
    if (!firefliesKey.trim()) {
      setError('Paste your Fireflies API key first');
      return;
    }
    setTesting(true);
    try {
      const res = await fetch('/api/auth/fireflies/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: firefliesKey.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not connect Fireflies');
      }
      setTested(true);
    } catch (err) {
      setTested(false);
      setError(err instanceof Error ? err.message : 'Could not connect Fireflies');
    } finally {
      setTesting(false);
    }
  };

  const finish = async () => {
    setError(null);
    setLoading(true);
    try {
      await completeOnboarding();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!formData.name.trim()) {
        setError('Please enter your name');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg shadow-2xl p-8 max-w-md w-full">
        <div className="mb-6">
          <div className="flex gap-2 justify-center">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(s => (
              <div
                key={s}
                className={`w-3 h-3 rounded-full ${s <= step ? 'bg-blue-500' : 'bg-slate-600'}`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded mb-6 text-sm">
            {error}
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Welcome!</h2>
            <p className="text-slate-400 mb-6">Let&apos;s set up your TimeTracker Pulse account.</p>
            <label className="block text-slate-300 text-sm mb-2">Your name</label>
            <input
              type="text"
              placeholder="Jane Doe"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-700 text-white px-4 py-3 rounded mb-4"
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Tell us about you</h2>
            <p className="text-slate-400 mb-6">This helps us tailor your setup.</p>

            <label className="block text-slate-300 text-sm mb-2">What&apos;s your role?</label>
            <select
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
              className="w-full bg-slate-700 text-white px-4 py-3 rounded mb-4"
            >
              {ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <label className="block text-slate-300 text-sm mb-2">
              What are you trying to solve?
            </label>
            <textarea
              placeholder="e.g. track billable hours across client meetings"
              value={formData.useCase}
              onChange={e => setFormData({ ...formData, useCase: e.target.value })}
              rows={3}
              className="w-full bg-slate-700 text-white px-4 py-3 rounded mb-4 resize-none"
            />

            <label className="block text-slate-300 text-sm mb-2">
              Where did you hear about us?
            </label>
            <select
              value={formData.referralSource}
              onChange={e => setFormData({ ...formData, referralSource: e.target.value })}
              className="w-full bg-slate-700 text-white px-4 py-3 rounded"
            >
              {REFERRAL_SOURCES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Connect Fireflies</h2>
            <p className="text-slate-400 mb-6">
              Paste your Fireflies API key to pull meeting transcripts and turn them
              into tasks. Google Calendar &amp; Gmail are already connected.
            </p>
            <label className="block text-slate-300 text-sm mb-2">Fireflies API key</label>
            <input
              type="password"
              placeholder="Paste from Fireflies → Settings → Developer Settings"
              value={firefliesKey}
              onChange={e => {
                setFirefliesKey(e.target.value);
                setTested(false);
              }}
              className="w-full bg-slate-700 text-white px-4 py-3 rounded mb-2"
            />
            <a
              href="https://app.fireflies.ai/settings/developer-settings"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-xs mb-4 inline-block"
            >
              Where do I find my API key? →
            </a>

            {tested && (
              <div className="bg-green-900/20 border border-green-700 text-green-400 px-4 py-2 rounded mb-3 text-sm">
                ✓ Connected to Fireflies
              </div>
            )}

            {!tested ? (
              <button
                onClick={testFirefliesConnection}
                disabled={testing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center mb-3"
              >
                {testing ? 'Testing connection…' : 'Test connection'}
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center mb-3"
              >
                {loading ? 'Finishing…' : 'Finish setup'}
              </button>
            )}
            <button
              onClick={finish}
              disabled={loading}
              className="w-full text-slate-400 hover:text-white text-sm py-2 transition disabled:opacity-50"
            >
              Skip for now
            </button>
          </div>
        )}

        {step < 3 && (
          <button
            onClick={handleNext}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition mt-8"
          >
            {loading ? 'Saving…' : 'Next'}
          </button>
        )}
      </div>
    </div>
  );
}
