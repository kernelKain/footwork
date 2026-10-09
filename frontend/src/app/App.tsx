import { demoFixture } from "../contracts/demoFixture";
import { validateDemoFixture } from "../contracts/validate";
import { useRoute } from "./useRoute";
import { AppHeader } from "../components/AppHeader";
import { Notice } from "../components/Notice";
import { WalkScreen } from "../recording/WalkScreen";
import { StudioScreen } from "../studio/StudioScreen";
import { SystemScreen } from "../ui/SystemScreen";

export function App() {
  const { path, navigate } = useRoute();
  const fixture = validateDemoFixture(demoFixture);

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
  if (path === "/about") screen = <WalkScreen onNavigate={navigate} />;
  if (path === "/system") screen = <SystemScreen />;

  return (
    <div className="app-shell">
      <AppHeader path={path} onNavigate={navigate} />
      <main className="app-main">{fixture.ok ? screen : <Notice errors={fixture.errors} />}</main>
    </div>
  );
}
