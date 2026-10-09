import { useState } from "react";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Disclosure } from "../ui/Disclosure";
import { HoldButton } from "../ui/HoldButton";
import { IconButton } from "../ui/IconButton";
import { Logo } from "../ui/Logo";
import { RecordingIndicator } from "../ui/RecordingIndicator";
import { RouteMarks, Waveform } from "../ui/RouteMarks";
import { Sheet } from "../ui/Sheet";
import { Skeleton } from "../ui/Skeleton";
import { StatusChip } from "../ui/StatusChip";
import { Surface } from "../ui/Surface";
import { TimerDisplay } from "../ui/TimerDisplay";

export function SystemScreen() {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div className="ui-catalog">
      <h1>Night Trail Studio</h1>
      <p>This catalog is not part of the public walk. It shows the brand and controls.</p>
      <Logo variant="wordmark" size={32} />
      <Logo variant="mark" size={16} />
      <Logo variant="mono" size={32} />
      <div className="actions">
        <Button>Start walking</Button>
        <Button variant="secondary">Hear an example</Button>
        <Button variant="quiet">How it works</Button>
        <Button variant="destructive">End walk</Button>
        <Button loading>Start walking</Button>
        <Button disabled>Unavailable</Button>
        <IconButton label="Close catalog">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </IconButton>
      </div>
      <HoldButton
        label="Hold to end"
        confirmLabel="Confirm end"
        onConfirm={() => setConfirmed(true)}
      />
      {confirmed ? <p role="status">Walk end confirmed</p> : null}
      <Surface title="Walk card">
        <p>A walk becomes a short piece of music.</p>
      </Surface>
      <Surface elevated title="Raised panel">
        <p>Elevated surfaces stay opaque.</p>
      </Surface>
      <StatusChip label="Example" />
      <StatusChip label="Turn" tone="music" />
      <StatusChip label="Recording" tone="live" />
      <Alert title="Location is off" tone="alert">
        <p>Allow location for this site in the browser settings, then try again.</p>
      </Alert>
      <button type="button" className="ui-button ui-button-secondary" onClick={() => setOpen(true)}>
        Open details
      </button>
      <Sheet open={open} title="Walk details" onClose={() => setOpen(false)}>
        <p>Missing time is not filled in.</p>
      </Sheet>
      <Disclosure title="How the route is read">
        <p>The line is the walk. The square is a musical moment.</p>
      </Disclosure>
      <Skeleton label="Loading the route" />
      <RecordingIndicator />
      <TimerDisplay label="Elapsed time" value="12:04" />
      <RouteMarks />
      <Waveform />
    </div>
  );
}
