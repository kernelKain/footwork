type AppHeaderProps = {
  path: string;
  modeLabel: string;
  onNavigate: (event: { preventDefault: () => void; currentTarget: { href: string } }) => void;
};

const LINKS = [
  { href: "/", label: "Walk" },
  { href: "/studio", label: "Soundprint" },
  { href: "/about", label: "How it works" },
];

export function AppHeader({ path, modeLabel, onNavigate }: AppHeaderProps) {
  return (
    <header className="app-header">
      <a className="brand" href="/" onClick={onNavigate}>
        Footwork
      </a>
      <nav className="app-nav" aria-label="Primary">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            aria-current={path === link.href ? "page" : undefined}
            onClick={onNavigate}
          >
            {link.label}
          </a>
        ))}
      </nav>
      <p className="mode-badge">
        Mode <strong>{modeLabel}</strong>
      </p>
    </header>
  );
}
