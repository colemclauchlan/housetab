import { createClient } from "@/lib/supabase/server";
import { logout } from "./login/actions";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">HouseTab</h1>
        <form action={logout}>
          <button
            type="submit"
            className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100"
          >
            Sign out
          </button>
        </form>
      </div>

      <p className="text-sm opacity-70">
        Signed in as <span className="font-medium">{user?.email}</span>.
      </p>
      <p className="text-sm opacity-60">
        Household bill-splitting dashboard. Periods, bill entry, and the paid checklist land in the
        M1 milestones ahead.
      </p>
    </main>
  );
}
