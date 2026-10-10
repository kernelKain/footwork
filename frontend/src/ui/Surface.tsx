import { useId, type ReactNode } from "react";

export function Surface({
  elevated = false,
  title,
  children,
}: {
  elevated?: boolean;
  title: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className={elevated ? "ui-card ui-card-raised" : "ui-card"} aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}
