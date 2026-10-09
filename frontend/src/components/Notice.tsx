export function Notice({ errors }: { errors: string[] }) {
  return (
    <section className="notice" role="alert" aria-labelledby="fixture-error-title">
      <h1 id="fixture-error-title">The preview fixture failed validation</h1>
      <p>This screen is not showing a Soundprint. Reload after the fixture file is corrected.</p>
      <ul>
        {errors.slice(0, 8).map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </section>
  );
}
