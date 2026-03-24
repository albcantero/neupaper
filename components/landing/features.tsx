export function Features() {
  return (
    <section className="max-w-5xl mx-auto px-8 py-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Column one</h2>
          <p className="text-muted-foreground">
            Placeholder text for the first column.
          </p>
        </div>
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Column two</h2>
          <p className="text-muted-foreground">
            Placeholder text for the second column.
          </p>
        </div>
      </div>
    </section>
  );
}
