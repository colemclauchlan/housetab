import { login } from "./actions";

export const metadata = { title: "Sign in · HouseTab" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">HouseTab</h1>
        <p className="text-sm opacity-70">Admin sign in</p>
      </div>

      <form action={login} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="rounded border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>

        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="rounded bg-foreground px-3 py-2 font-medium text-background hover:opacity-90"
        >
          Sign in
        </button>
      </form>

      <p className="text-xs opacity-50">
        No public signup — this dashboard is for the household admin only.
      </p>
    </main>
  );
}
