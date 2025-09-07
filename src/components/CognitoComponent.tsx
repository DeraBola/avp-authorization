"use client";

import { useAuth } from "react-oidc-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";

export default function CognitoComponent() {
  const auth = useAuth();
  const router = useRouter();

  console.log("authCognito: ", auth);

  // 🔹 Protect this page: redirect to /login if not authenticated
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.push("/login");
    }
  }, [auth.isLoading, auth.isAuthenticated, router]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      const tenant = window.location.hostname.split(".")[0]; // xyz
      console.log("tenant: ", tenant);
      // Call your API to set the tenant for the user
      fetch("/api/set-tenant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.user?.id_token}`, // pass ID token
        },
        body: JSON.stringify({ tenant }),
      });
    }
  }, [auth.isAuthenticated]);

  const signOutRedirect = async () => {
    const clientId = "7i1ep58u5qm8vpt3914608vm6f";
    const logoutUri = "http://localhost:3000/login"; // must be allowed in Cognito
    const cognitoDomain =
      "https://eu-north-1wrickx15x.auth.eu-north-1.amazoncognito.com";

    // 1. Clear local session
    await auth.removeUser();

    // 2. Redirect to Cognito logout
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(
      logoutUri
    )}`;
  };

  const signOutLocal = async () => {
    await auth.removeUser();
    router.push("/login");
  };

  if (auth.isLoading) {
    return <div className="flex items-center justify-center">Loading...</div>;
  }

  if (auth.error) {
    return (
      <div className="flex items-center justify-center">
        Encountering error... {auth.error.message}
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    // while redirecting, you can render nothing or a loader
    return null;
  }

  return (
    <div className="flex flex-col items-center h-full w-full justify-start">
      <div className="flex w-full justify-center items-center flex-col gap-4 border-2 border-blue-800">
        <pre>Hello: {auth.user?.profile.name}</pre>
        <Image
          src={auth.user?.profile?.picture || "/default-avatar.png"}
          alt={auth.user?.profile?.picture || "User Avatar"}
          width={100}
          height={72}
          className="rounded-full mb-4"
        />
        <div className="flex w-full flex-col gap-2 items-center justify-center p-4">
          <p className="break-all whitespace-pre-wrap">
            <span className="font-bold">ID Token: </span>
            {auth.user?.id_token}
          </p>
          <p className="break-all whitespace-pre-wrap">
            <span className="font-bold"> Access Token: </span>
            {auth.user?.access_token}
          </p>
          <p className="break-all whitespace-pre-wrap">
            <span className="font-bold">Refresh Token: </span>
            {auth.user?.refresh_token}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-start m-4">
        <button
          className="bg-green-500 text-white px-4 py-2 rounded m-10"
          onClick={signOutLocal}
        >
          Sign out from Session storage or Cookies
        </button>

        <button
          className="bg-red-500 text-white px-4 py-2 rounded ml-2"
          onClick={signOutRedirect}
        >
          Sign out from Amazon Cognito
        </button>
      </div>

    </div>
  );
}
