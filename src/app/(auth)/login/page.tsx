import { getSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign in — signNGO",
};

export default async function LoginPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!error && user) redirect("/dashboard");

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
          Sign in to your account
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Welcome back. Enter your credentials below.
        </p>
      </div>
      <LoginForm />
    </>
  );
}
