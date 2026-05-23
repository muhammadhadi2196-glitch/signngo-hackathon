import { getSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata = {
  title: "Create account — signNGO",
};

export default async function SignupPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!error && user) redirect("/dashboard");

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Free during beta. No credit card required.
        </p>
      </div>
      <SignupForm />
    </>
  );
}
