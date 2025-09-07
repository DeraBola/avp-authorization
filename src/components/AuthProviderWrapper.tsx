"use client";

import { AuthProvider } from "react-oidc-context";

import { ReactNode } from "react";
import { cognitoAuthConfig } from "@/lib/CognitoConfig";

export default function AuthProviderWrapper({ children }: { readonly children: ReactNode }) {
  return <AuthProvider {...cognitoAuthConfig}>{children}</AuthProvider>;
}
