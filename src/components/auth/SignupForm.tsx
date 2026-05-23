"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input, Button, useToast } from "@/components/ui";
import { GoogleButton } from "./GoogleButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

export function SignupForm() {
  const router = useRouter();
  const { success, error: showError } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.name },
      },
    });

    if (error) {
      showError(error.message);
      return;
    }

    // Ensure session cookie is set before calling the server
    await supabase.auth.getUser();

    await fetch("/api/auth/register-after-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name }),
    });

    success("Account created!");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <GoogleButton />

      <div className="relative flex items-center gap-3 my-1">
        <div className="flex-1 border-t border-slate-200" />
        <span className="text-xs text-slate-400">or</span>
        <div className="flex-1 border-t border-slate-200" />
      </div>

      <Input
        label="Full name"
        type="text"
        placeholder="Jane Smith"
        autoComplete="name"
        error={errors.name?.message}
        {...register("name")}
      />
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="Password"
        type="password"
        placeholder="Min. 8 characters"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />

      <Button
        type="submit"
        variant="accent"
        size="md"
        className="w-full mt-1"
        loading={isSubmitting}
      >
        Create account
      </Button>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );
}
