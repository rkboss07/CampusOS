import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Calendar,
  FileUp,
  ShieldCheck,
  Sun,
  Moon,
  UserCheck,
  Mail,
  ArrowLeft,
  LogIn,
} from 'lucide-react';

interface SignInViewProps {
  onSignIn: () => Promise<void>;
  onEmailSignIn: (name: string, email: string) => Promise<void>;
  onGuestSignIn: () => void;
  onCancel?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const SignInView: React.FC<SignInViewProps> = ({
  onSignIn,
  onEmailSignIn,
  onGuestSignIn,
  onCancel,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await onSignIn();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        // User closed popup manually
      } else if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        setShowEmailForm(true);
        setErrorMsg(
          `Google popup requires "${host}" to be added in Firebase Console → Authentication → Settings → Authorized domains. You can sign in immediately below with your Email / Campus ID for your personal workspace.`
        );
      } else {
        setShowEmailForm(true);
        setErrorMsg(
          err?.message ||
            'Could not complete Google Sign-In popup. You can sign in below with your Email or continue as Guest.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid college or personal email address.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await onEmailSignIn(nameInput.trim(), cleanEmail);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not sign in with email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen w-screen bg-[#EFECE6] p-3 sm:p-6 flex flex-col justify-between antialiased text-[#1C1B18] transition-colors ${
        isDarkMode ? 'theme-dark' : ''
      }`}
    >
      {/* Top Bar */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between py-2 px-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#F97316] text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="type-section-title text-[#1C1B18]">CampusOS</span>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="type-button px-3.5 py-2 rounded-xl bg-white hover:bg-[#ECE7DF] border border-[#EAE5DC] text-[#1C1B18] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#F97316]" />
              <span>Back to Workspace</span>
            </button>
          )}

          <button
            onClick={onToggleDarkMode}
            className="type-button px-3.5 py-2 rounded-xl bg-[#F6F3EC] hover:bg-[#ECE7DF] border border-[#EAE5DC] text-[#1C1B18] flex items-center gap-2 transition-colors cursor-pointer"
          >
            {isDarkMode ? (
              <>
                <Moon className="w-4 h-4 text-[#F97316]" />
                <span>Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-[#F97316]" />
                <span>Light Mode</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Sign-In Card */}
      <main className="max-w-4xl w-full mx-auto my-auto py-6">
        <div className="bg-white rounded-3xl border border-[#EAE5DC] shadow-[0_16px_48px_rgba(28,27,24,0.06)] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left Column: Value Proposition */}
          <div className="lg:col-span-7 p-7 sm:p-10 space-y-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#EAE5DC]">
            <div className="space-y-4">
              <span className="type-caption font-semibold inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF5EC] text-[#EA580C] border border-[#FDBA74]/50">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Personal Student Workspace</span>
              </span>

              <h1 className="type-screen-title text-[#1C1B18]">
                CampusOS Dashboard
              </h1>

              <p className="type-body text-[#57534E]">
                Turn scattered college circulars, notices, and deadlines into prioritized, actionable tasks—synced to your Google account, Campus Email, or stored locally in Guest Mode.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE5DC]">
                <div className="w-8 h-8 rounded-xl bg-[#FFF0E5] text-[#F97316] flex items-center justify-center shrink-0 mt-0.5">
                  <FileUp className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="type-section-title text-[#1C1B18]">
                    Fresh Per-User Board
                  </h2>
                  <p className="type-caption mt-0.5">
                    Every account starts with a clean, empty board. Only notices and PDFs you upload appear in your workspace.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE5DC]">
                <div className="w-8 h-8 rounded-xl bg-[#FFF0E5] text-[#F97316] flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="type-section-title text-[#1C1B18]">
                    Personalized Priority & Deadlines
                  </h2>
                  <p className="type-caption mt-0.5">
                    Customize your branch and academic year so every circular is scored specifically for you.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE5DC]">
                <div className="w-8 h-8 rounded-xl bg-[#FFF0E5] text-[#F97316] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="type-section-title text-[#1C1B18]">
                    Cloud Sync or Local Guest Cache
                  </h2>
                  <p className="type-caption mt-0.5">
                    Sign in with Google or your email for per-user isolation, or continue as a Guest using browser cache and cookies.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Google Sign-In, Email Sign-In & Guest Login Actions */}
          <div className="lg:col-span-5 p-7 sm:p-9 bg-[#F6F3EC] flex flex-col justify-center space-y-4">
            <div className="space-y-1.5 text-center">
              <h2 className="type-section-title text-[#1C1B18]">
                Sign in to your workspace
              </h2>
              <p className="type-caption text-[#78736A]">
                Each user gets a separate, clean workspace with zero initial entries.
              </p>
            </div>

            <div className="space-y-2.5">
              {/* 1. Google OAuth Button */}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="type-button w-full py-3.5 px-5 rounded-2xl bg-[#1C1B18] hover:bg-[#33312C] disabled:opacity-50 text-white flex items-center justify-center gap-3 shadow-sm transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 21.4 7.4 24 12 24z"
                  />
                </svg>
                <span>{isLoading ? 'Signing in...' : 'Continue with Google'}</span>
              </button>

              {/* 2. Email / Campus ID Sign-In Toggle or Form */}
              {!showEmailForm ? (
                <button
                  type="button"
                  onClick={() => setShowEmailForm(true)}
                  disabled={isLoading}
                  className="type-button w-full py-3 px-5 rounded-2xl bg-white hover:bg-[#ECE7DF] text-[#1C1B18] border border-[#E5E0D5] flex items-center justify-center gap-2.5 shadow-2xs transition-all cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-[#F97316]" />
                  <span>Sign in with Email / Campus ID</span>
                </button>
              ) : (
                <form
                  onSubmit={handleEmailSubmit}
                  className="p-3.5 rounded-2xl bg-white border border-[#E5E0D5] space-y-2.5"
                >
                  <div>
                    <label className="type-caption block mb-1 text-[#57534E]">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="e.g. Aarav Sharma"
                      className="type-body w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EAE5DC] text-[#1C1B18] focus:outline-none focus:border-[#F97316]"
                    />
                  </div>
                  <div>
                    <label className="type-caption block mb-1 text-[#57534E]">
                      College or Personal Email
                    </label>
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="you@college.edu"
                      className="type-body w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EAE5DC] text-[#1C1B18] focus:outline-none focus:border-[#F97316]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="type-button w-full py-2.5 px-4 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Open Personal Workspace</span>
                  </button>
                </form>
              )}

              {/* 3. Continue as Guest Button */}
              <button
                onClick={onGuestSignIn}
                disabled={isLoading}
                className="type-button w-full py-3 px-5 rounded-2xl bg-white hover:bg-[#ECE7DF] disabled:opacity-50 text-[#1C1B18] border border-[#E5E0D5] flex items-center justify-center gap-2.5 shadow-2xs transition-all cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-[#F97316]" />
                <span>Continue as Guest</span>
              </button>
            </div>

            {errorMsg && (
              <div className="type-caption p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-left">
                {errorMsg}
              </div>
            )}

            <p className="type-caption text-center">
              Guest & Email sessions persist your personal board using browser cache & cookies on any host (including GitHub Pages).
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center py-2">
        <p className="type-caption">
          CampusOS · Personal Academic Circular Prioritizer
        </p>
      </footer>
    </div>
  );
};
