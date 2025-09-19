"use client";

import { useAuth } from "react-oidc-context";
import { useRouter } from "next/navigation";
import { useEffect, useCallback, useMemo } from "react";
import Image from "next/image";

export default function CognitoComponent() {
  const auth = useAuth();
  const router = useRouter();

  console.log("authCognito:", auth);

  // Precompute user attributes (memoized)
  const formData = useMemo(
    () => ({
      department: "Customer-support",
      status: "Active",
      location: "New York",
      time: "08:00-14:00", // 24-hour format: 8AM-2PM
    }),
    []
  );

  // API helpers
  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch("/api/permissions", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.user?.id_token}`,
        },
      });
      if (!res.ok) throw new Error(`Failed to fetch permissions`);
      return await res.json();
    } catch (err) {
      console.error("Error fetching permissions:", err);
    }
  }, [auth.user?.id_token]);

  // const deleteCandidate = useCallback(async () => {
  //   try {
  //     const res = await fetch("/api/candidates/12", {
  //       method: "DELETE",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${auth.user?.id_token}`,
  //       },
  //     });
  //     if (!res.ok) throw new Error(`Failed to delete candidate`);
  //     return await res.json();
  //   } catch (err) {
  //     console.error("Error deleting candidate:", err);
  //   }
  // }, [auth.user?.id_token]);

  // const updateUserAttributes = useCallback(async () => {
  //   try {
  //     const res = await fetch("/api/update-user-attributes", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${auth.user?.id_token}`,
  //       },
  //       body: JSON.stringify(formData),
  //     });
  //     if (!res.ok) throw new Error(`Failed to update user attributes`);
  //     return await res.json();
  //   } catch (err) {
  //     console.error("Error updating user attributes:", err);
  //   }
  // }, [auth.user?.id_token, formData]);

  // Protect page & trigger data fetching when authenticated
  
const authorizeCandidate = useCallback(async () => {
    try {
      const res = await fetch("/api/authorize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.user?.id_token}`,
        },
         body: JSON.stringify({
          action: "ReadCandidate",
          candidateId: "123",
        }),
      });
      if (!res.ok) throw new Error(`Failed to authorize candidate`);
      return await res.json();
    } catch (err) {
      console.error("Error authorizing candidate:", err);
    }
  }, [auth.user?.id_token]);


  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.push("/login");
    }

    if (auth.isAuthenticated) {
      Promise.all([fetchPermissions(), authorizeCandidate()]);
    }
  }, [auth.isLoading, auth.isAuthenticated, router, fetchPermissions]);

  // Sign-out helpers
  const signOutRedirect = async () => {
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
    const logoutUri = "http://localhost:3000/login"; // must match Cognito callback settings
    const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;

    await auth.removeUser();
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(
      logoutUri
    )}`;
  };

  const signOutLocal = async () => {
    await auth.removeUser();
    router.push("/login");
  };

  // Loading & error states
  if (auth.isLoading) {
    return <div className="flex items-center justify-center">Loading...</div>;
  }

  if (auth.error) {
    return (
      <div className="flex items-center justify-center text-red-600">
        Encountered error: {auth.error.message}
      </div>
    );
  }

  if (!auth.isAuthenticated) return null;

  return (
    <div className="flex flex-col items-center h-full w-full justify-start">
      <div className="flex w-full justify-center items-center flex-col gap-4 border-2 border-blue-800 p-4 rounded-xl">
        <pre>Hello: {auth.user?.profile?.name}</pre>
        <Image
          src={auth.user?.profile?.picture || "/default-avatar.png"}
          alt="User Avatar"
          width={100}
          height={72}
          className="rounded-full mb-4"
        />
        <div className="flex w-full flex-col gap-2 items-center justify-center">
          <p className="break-all whitespace-pre-wrap">
            <span className="font-bold">ID Token: </span>
            {auth.user?.id_token}
          </p>
          <p className="break-all whitespace-pre-wrap">
            <span className="font-bold">Access Token: </span>
            {auth.user?.access_token}
          </p>
          <p className="break-all whitespace-pre-wrap">
            <span className="font-bold">Refresh Token: </span>
            {auth.user?.refresh_token}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-start m-4 gap-4">
        <button
          className="bg-green-500 text-white px-4 py-2 rounded shadow hover:bg-green-600 transition"
          onClick={signOutLocal}
        >
          Sign out (Local Session)
        </button>

        <button
          className="bg-red-500 text-white px-4 py-2 rounded shadow hover:bg-red-600 transition"
          onClick={signOutRedirect}
        >
          Sign out (Cognito)
        </button>
      </div>
    </div>
  );
}
