import { useId, type ReactNode } from "react";

export function Alert({
  tone = "status",
  title,
  children,
}: {
  tone?: "status" | "alert";
  title: string;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section className="ui-alert" role={tone} aria-labelledby={titleId}>
      <h2 id={titleId}>{title}</h2>
      {children}
    </section>
  );
}
