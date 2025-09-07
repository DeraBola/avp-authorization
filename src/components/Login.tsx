"use client";

import { useAuth } from "react-oidc-context";

export default function Login() {
  const auth = useAuth();


  const handleGoogleLogin = () => {
    auth.signinRedirect({ extraQueryParams: { identity_provider: "Google" } });
  };

  const handleLinkedInLogin = () => {
    auth.signinRedirect({
      extraQueryParams: { identity_provider: "LinkedIn" },
    });
  };

  if (auth.isLoading) return <div>Loading...</div>;
  if (auth.error) return <div>Encountering error... {auth.error.message}</div>;

  return (
    <div className="flex justify-start items-center flex-col h-screen gap-10">
      <h4>Hey User Sign In</h4>
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={() => auth.signinRedirect()}
      >
        Sign in
      </button>
      <button
        className="px-4 py-2 rounded bg-green-600 text-white hover:bg-blue-700"
        onClick={handleGoogleLogin}
      >
        Continue with Google
      </button>
      <button
        className="px-4 py-2 rounded bg-yellow-600 text-white hover:bg-blue-700"
        onClick={handleLinkedInLogin}
      >
        Continue with LinkedIn
      </button>
    </div>
  );
}
