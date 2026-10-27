import React, { useState } from 'react';
import { Sparkles, CheckCircle2, Calendar, FileUp, ShieldCheck, Sun, Moon, UserCheck } from 'lucide-react';

interface SignInViewProps {
  onSignIn: () => Promise<void>;
  onGuestSignIn: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const SignInView: React.FC<SignInViewProps> = ({
  onSignIn,
  onGuestSignIn,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await onSignIn();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        // User closed popup manually
      } else if (err?.code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        setErrorMsg(
          `To use Google Sign-In on ${host}, add "${host}" in Firebase Console → Authentication → Settings → Authorized domains, or click "Continue as Guest" below.`
        );
      } else {
        setErrorMsg(err?.message || 'Unable to sign in right now. Please try again or continue as Guest.');
      }
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
                Turn scattered college circulars, notices, and deadlines into prioritized, actionable tasks—synced to your Google account or stored locally in Guest Mode.
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
                    Sign in with Google for cloud sync across devices, or continue as a Guest using browser cache and cookies.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Google Sign-In & Guest Login Actions */}
          <div className="lg:col-span-5 p-7 sm:p-10 bg-[#F6F3EC] flex flex-col justify-center space-y-5">
            <div className="space-y-2 text-center">
              <h2 className="type-section-title text-[#1C1B18]">
                Sign in to get started
              </h2>
              <p className="type-caption text-[#78736A]">
                Sign in with Google or continue as a Guest to open your personal notice board.
              </p>
            </div>

            <div className="space-y-3">
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

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-[#E2DDD2]" />
                <span className="type-caption px-3 text-[#78736A]">or</span>
                <div className="flex-grow border-t border-[#E2DDD2]" />
              </div>

              <button
                onClick={onGuestSignIn}
                disabled={isLoading}
                className="type-button w-full py-3.5 px-5 rounded-2xl bg-white hover:bg-[#ECE7DF] disabled:opacity-50 text-[#1C1B18] border border-[#E5E0D5] flex items-center justify-center gap-2.5 shadow-2xs transition-all cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-[#F97316]" />
                <span>Continue as Guest</span>
              </button>
            </div>

            {errorMsg && (
              <div className="type-caption p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-center">
                {errorMsg}
              </div>
            )}

            <p className="type-caption text-center">
              Guest mode stores your notices and tasks in your browser’s local cache & cookies. Switch accounts anytime from the sidebar.
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
