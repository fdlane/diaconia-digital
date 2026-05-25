"use client";

import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function SsoCallbackPage() {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const router = useRouter();
  const hasRun = useRef(false);

  useEffect(() => {
    async function finishSso() {
      if (!clerk.loaded || hasRun.current) return;
      hasRun.current = true;

      const navigateHome = async ({ decorateUrl }: { decorateUrl: (url: string) => string }) => {
        const url = decorateUrl("/");
        if (url.startsWith("http")) {
          window.location.href = url;
        } else {
          router.push(url);
        }
      };

      if (signIn.status === "complete") {
        await signIn.finalize({ navigate: navigateHome });
        return;
      }

      if (signUp.status === "complete") {
        await signUp.finalize({ navigate: navigateHome });
        return;
      }

      if (signUp.isTransferable) {
        const { error } = await signIn.create({ transfer: true });
        if (!error && (signIn as any).status === "complete") {
          await signIn.finalize({ navigate: navigateHome });
          return;
        }
      }

      router.push("/");
    }

    void finishSso();
  }, [clerk.loaded, router, signIn, signUp]);

  return (
    <div className="signin-page">
      <div className="custom-auth-card">
        <div className="custom-auth-heading">
          <h1>Diaconia</h1>
          <p>Completing secure sign in...</p>
        </div>
      </div>
    </div>
  );
}
