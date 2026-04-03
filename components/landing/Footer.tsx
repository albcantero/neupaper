import Link from "next/link";

const navLinks = [
  { href: "/vault", label: "Open Vault" },
  { href: "#features", label: "Features" },
  { href: "#bento", label: "Overview" },
  { href: "https://github.com/albcantero/neupaper", label: "GitHub" },
];

export function Footer() {
  return (
    <footer className="mx-auto max-w-[1250px] *:px-8">
      <div className="flex flex-col gap-4 py-2">
        <div className="flex items-center justify-between">
          <Link href="/">
            <div className="h-7 w-28" style={{ backgroundColor: "var(--accent-display)", mask: "url(/logo-app-name.svg) no-repeat left center / contain", WebkitMask: "url(/logo-app-name.svg) no-repeat left center / contain" }} />
          </Link>
        </div>

        <nav>
          <ul className="flex flex-wrap gap-4 font-medium text-muted-foreground text-sm md:gap-6">
            {navLinks.map((link) => (
              <li key={link.label}>
                <Link className="hover:text-foreground transition-colors" href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border py-3 text-muted-foreground text-xs">
        <p>&copy; {new Date().getFullYear()} Neupaper</p>
        <span className="inline-flex items-center gap-1">
          <span>Built by</span>
          <a className="inline-flex items-center gap-1 text-foreground/80 hover:text-foreground hover:underline" href="https://x.com/albcantero" target="_blank" rel="noreferrer">
            <img alt="Alberto Cantero" className="size-4 rounded-full" height="auto" width="auto" src="https://github.com/albcantero.png" />
            Alberto Cantero
          </a>
        </span>
      </div>
    </footer>
  );
}
