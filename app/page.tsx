export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">HouseTab</h1>
      <p className="text-sm opacity-80">
        Household bill-splitting dashboard for a house of 6. The admin logs each bill; a Telegram
        bot posts the monthly breakdown to the house group and tracks who has paid.
      </p>
      <p className="text-sm opacity-60">
        Scaffold is up. Dashboard, auth, and the bot land in the milestones ahead.
      </p>
    </main>
  );
}
