"use client";

import { ReactNode } from "react";
import { Toaster } from "react-hot-toast";

type Props = {
  children: ReactNode;
};

export function ClientProviders({ children }: Props) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            fontSize: "0.875rem",
            borderRadius: "0.75rem",
            background: "#020617",
            color: "#f8fafc",
          },
        }}
      />
    </>
  );
}
