import { demoFixture } from "../contracts/demoFixture";
import { validateDemoFixture } from "../contracts/validate";
import { AboutScreen } from "./AboutScreen";
import { useRoute } from "./useRoute";
import { AppHeader } from "../components/AppHeader";
import { Notice } from "../components/Notice";
import { WalkScreen } from "../recording/WalkScreen";
import { StudioScreen } from "../studio/StudioScreen";

export function App() {
  const { path, navigate } = useRoute();
  const fixture = validateDemoFixture(demoFixture);
  const modeLabel = fixture.ok ? "Synthetic fixture" : "Fixture error";

  let screen = (
    <section className="stack" aria-labelledby="missing-title">
      <h1 id="missing-title">Page not found</h1>
      <p>That address is not part of Footwork.</p>
      <a className="action" href="/" onClick={navigate}>
        Back to the walk
      </a>
    </section>
  );
  if (path === "/") screen = <WalkScreen onNavigate={navigate} />;
  if (path === "/studio" && fixture.ok)
    screen = <StudioScreen fixture={fixture.value} onNavigate={navigate} />;
  if (path === "/about") screen = <AboutScreen />;

  return (
    <div className="app-shell">
      <AppHeader path={path} modeLabel={modeLabel} onNavigate={navigate} />
      <main className="app-main">{fixture.ok ? screen : <Notice errors={fixture.errors} />}</main>
    </div>
  );
}
