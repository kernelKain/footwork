import { useEffect, useState } from "react";
import type { DemoFixture, SoundprintResult } from "../contracts/types";
import { readShareToken, readSharedPiece } from "./liveJob";
import { StudioScreen } from "./StudioScreen";

type OpenedPiece = { result: SoundprintResult; audioUrl: string | null };

export function SharedScreen({
  fixture,
  onNavigate,
}: {
  fixture: DemoFixture;
  onNavigate: (event: { preventDefault: () => void; currentTarget: { href: string } }) => void;
}) {
  const [opened, setOpened] = useState<OpenedPiece | null>(null);
  const [state, setState] = useState<"loading" | "missing" | "ready">("loading");

  useEffect(() => {
    const token = readShareToken();
    if (!token) {
      setState("missing");
      return;
    }
    let cancel = false;
    void readSharedPiece(token).then((piece) => {
      if (cancel) return;
      if (!piece) {
        setState("missing");
        return;
      }
      setOpened(piece);
      setState("ready");
    });
    return () => {
      cancel = true;
    };
  }, []);

  if (state === "ready" && opened) {
    return <StudioScreen fixture={fixture} onNavigate={onNavigate} opened={opened} />;
  }
  if (state === "loading") {
    return (
      <section className="stack" aria-labelledby="shared-title">
        <h1 id="shared-title">Opening this Soundprint</h1>
        <p>The link is being checked. It does not contain a location.</p>
      </section>
    );
  }
  return (
    <section className="stack" aria-labelledby="shared-title">
      <h1 id="shared-title">This link does not open a Soundprint.</h1>
      <p>It may have expired. A share link lasts about an hour and does not contain a location.</p>
      <a className="ui-button ui-button-secondary" href="/" onClick={onNavigate}>
        Back to the walk
      </a>
    </section>
  );
}
