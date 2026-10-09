import { Logo } from "../ui/Logo";

type AppHeaderProps = {
  path: string;
  onNavigate: (event: { preventDefault: () => void; currentTarget: { href: string } }) => void;
};

export function AppHeader({ path, onNavigate }: AppHeaderProps) {
  return (
    <header className="app-header">
      <a className="brand" href="/" aria-label="Footwork" onClick={onNavigate}>
        <Logo variant="mark" size={32} decorative />
        <span aria-hidden="true">Footwork</span>
      </a>
      {path === "/" ? (
        <a className="ui-button ui-button-secondary" href="/studio" onClick={onNavigate}>
          Hear an example
        </a>
      ) : null}
    </header>
  );
}
