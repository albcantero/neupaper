export function SectionIntro({ label, title, description }: { label: string; title: string; description?: string }) {
  return (
    <section className="max-w-[1250px] mx-auto px-4 pt-8 pb-5">
      <div className="flex flex-col gap-1">
        <p className="font-medium text-[15px] tracking-tight uppercase font-mono-display text-accent-display">
          {label}
        </p>
        <h2 className="text-5xl font-medium tracking-tight max-w-3xl leading-tight">
          {title}
        </h2>
        {description && (
          <p className="text-lg text-muted-foreground/75 max-w-xl mt-2">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
