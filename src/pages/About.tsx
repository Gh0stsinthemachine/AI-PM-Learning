import React from 'react';
import { Board } from '../components/Header';
import { useCapabilities } from '../runtime/capabilities';

export function About() {
  const caps = useCapabilities();
  const [perm, setPerm] = React.useState<string>('');
  React.useEffect(() => {
    let alive = true;
    const api = caps.permissions.api;
    if (!api) return;
    api.state('sample').then((s) => alive && setPerm(s), () => undefined);
    return () => {
      alive = false;
    };
  }, [caps.permissions.api]);

  const live = !caps.inViewer
    ? 'Not available here. Live answers work when you open this page in claude.ai.'
    : caps.sampleOff || perm === 'denied'
      ? 'Off for this visit. You can turn it on from this page’s Permissions menu.'
      : caps.sample.status === 'pending'
        ? 'Checking…'
        : caps.sample.status === 'absent'
          ? 'Not available in this view. You will see worked examples instead.'
          : perm === 'granted'
            ? 'Allowed. Live answers use your own Claude plan.'
            : 'Ready. Claude will ask you to allow this page the first time you use a live piece.';

  return (
    <>
      <Board line={0} bullet="i" title="About" />
      <section className="panel">
        <h2>What this is</h2>
        <p>AI PM 102 is a short-round course in AI product management. Each round takes about 20 minutes. It starts at 101 and goes deeper, so you can build up from the basics.</p>
        <p>The topics follow the nine sections of Aakash Gupta&rsquo;s AI PM Learning Roadmap, which inspired the course. All the writing, examples and exercises here are original, and this course is not affiliated with or endorsed by him.</p>
      </section>
      <section className="panel">
        <h2>Live answers</h2>
        <p data-testid="about-live">{live}</p>
        <p className="muted small">Some pieces, like the Ask box and the prompt runner, ask Claude live. They use your own Claude plan, and they only run when you click. Everything also works without them.</p>
      </section>
      <section className="panel">
        <h2>What is saved, and where</h2>
        <p>Your progress and notes are saved privately to your account when the page is open in claude.ai. Outside claude.ai they stay in this browser. The course does not collect anything else and has no ads or tracking.</p>
      </section>
      <section className="panel">
        <h2>Facts that change</h2>
        <p>Tools, models, prices and rules change quickly. Pages that mention them carry a &ldquo;last checked&rdquo; note and a link to the source. Check the source before you rely on a detail, especially prices and legal points.</p>
      </section>
    </>
  );
}
