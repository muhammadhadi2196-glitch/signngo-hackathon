"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Input, Button } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { CheckCircle } from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    const supabase = getSupabaseBrowserClient();
    const origin = window.location.origin;
    await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${origin}/auth/callback?type=recovery`,
    });
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
            Check your email
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            We&apos;ve sent you a password reset link. It may take a few minutes
            to arrive.
          </p>
        </div>
        <Link
          href="/login"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
          Reset your password
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Button
          type="submit"
          variant="accent"
          size="md"
          className="w-full"
          loading={isSubmitting}
        >
          Send reset link
        </Button>
        <p className="text-center text-sm text-slate-500">
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Back to sign in
          </Link>
        </p>
      </form>
    </>
  );
}
