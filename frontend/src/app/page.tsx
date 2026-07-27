import InsurancePlanner from "@/components/insurance-planner";

export default function Home() {
  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="ClearCover home">
          <span className="brand-mark">CC</span>
          <span>
            <strong>ClearCover</strong>
            <small>Singapore planning prototype</small>
          </span>
        </a>
        <span className="privacy-chip">
          <span aria-hidden="true" />
          Private by design
        </span>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">Fictional insurance planning · Singapore</p>
            <h1 id="hero-title">
              Understand the match.
              <br />
              <em>Keep the choice yours.</em>
            </h1>
            <p className="hero-description">
              Describe a few non-medical planning details in a guided chat,
              review what was understood, and compare three fictional plan
              categories using transparent rules.
            </p>
          </div>

          <aside className="prototype-note">
            <span>Learning prototype</span>
            <strong>Not financial advice.</strong>
            <p>
              Every provider, plan, premium and coverage amount shown here is
              fictional. Chat answers are processed only to fill the criteria
              you review and are not saved by this prototype.
            </p>
          </aside>
        </section>

        <InsurancePlanner />

        <section className="principles" aria-labelledby="principles-heading">
          <div>
            <p className="eyebrow">Built for clarity</p>
            <h2 id="principles-heading">Three checks. No black box.</h2>
          </div>
          <ol>
            <li>
              <span>01</span>
              <strong>Age range</strong>
              <p>Is the entered age within the fictional plan range?</p>
            </li>
            <li>
              <span>02</span>
              <strong>Coverage needs</strong>
              <p>Does the plan include every selected category?</p>
            </li>
            <li>
              <span>03</span>
              <strong>Annual budget</strong>
              <p>Is the fictional annual premium within budget?</p>
            </li>
          </ol>
        </section>
      </main>

      <footer>
        <div className="brand footer-brand">
          <span className="brand-mark">CC</span>
          <span>
            <strong>ClearCover</strong>
            <small>Fictional learning prototype</small>
          </span>
        </div>
        <p>
          This demonstration does not assess real eligibility, underwriting,
          exclusions, pricing, claims or policy terms. Verify official
          information and speak with an appropriately licensed professional.
        </p>
        <span>Prototype · 2026</span>
      </footer>
    </>
  );
}
