import { Suspense } from "react";
import { SignInForm } from "@/components/admin/SignInForm";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-lw-bg-subtle px-lw-base py-lw-2xl">
      <Suspense>
        <SignInForm />
      </Suspense>
    </div>
  );
}
