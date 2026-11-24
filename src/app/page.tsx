import FretboardApp from "@/components/FretboardApp";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center gap-8 bg-zinc-50 px-6 py-10 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">GuitarTools</h1>
        <p className="mx-auto mt-2 max-w-md text-zinc-600 dark:text-zinc-400">
          Interaktivt gripebrett — se triaden til en akkord over hele halsen og
          lær sammenhengen mellom akkorder og toner.
        </p>
      </header>
      <FretboardApp />
    </main>
  );
}
