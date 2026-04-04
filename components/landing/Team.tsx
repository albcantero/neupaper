const team = [
  {
    src: "/images/me.png",
    name: "Alberto Cantero",
    role: "Chief Everything Officer",
    zoom: "scale-150 object-[50%_30%]",
  },
  {
    src: "/images/cat1.png",
    name: "Merlín",
    role: "Senior Keyboard Blocker",
  },
  {
    src: "/images/cat2.png",
    name: "Nana",
    role: "Lead Nap Architect",
  },
  {
    src: "/images/coffee.png",
    name: "The Coffee Setup",
    role: "Core Infrastructure",
  },
];

export function Team() {
  return (
    <section className="max-w-[1250px] mx-auto px-8 bg-card py-10">
      <h2 className="text-[26px] font-semibold mb-8">Meet the team behind Neupaper.</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {team.map((member) => (
          <div key={member.name} className="flex flex-col gap-4">
            <div className="aspect-square overflow-hidden rounded-lg relative">
              <img
                src={member.src}
                alt={member.name}
                loading="lazy"
                className={`w-full h-full object-cover ${(member as any).zoom || ""}`}
              />
              <div className="absolute inset-0 bg-background/30" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">{member.name}</span>
              <span className="text-sm text-muted-foreground">{member.role}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
