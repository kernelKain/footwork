import type { ReactNode } from "react";

export function StateMessage({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "status" | "alert";
  children: ReactNode;
}) {
  return (
    <section
      className={tone === "alert" ? "notice" : "panel"}
      role={tone}
      aria-labelledby="preview-state-title"
    >
      <h2 id="preview-state-title">{title}</h2>
      {children}
    </section>
  );
}
