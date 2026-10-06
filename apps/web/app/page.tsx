import { Button } from '@repo/ui/components/button';

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">Sprintwise</h1>
      <p className="text-lg text-muted-foreground">
        Describe a product idea and watch an AI team turn it into user stories,
        a Kanban board and a plan you can approve.
      </p>
      <div>
        <Button size="lg" disabled>
          Start a project
        </Button>
      </div>
    </main>
  );
}
