import { Link } from "react-router-dom";

const ChoicePage = () => (
  <main className="choice-shell">
    <div className="choice-topline"><div className="brand-mark">MG<span>.</span></div><span>PERSONAL GALLERY / 2026</span></div>
    <section className="choice-content">
      <p className="eyebrow">A considered place for images</p>
      <h1>See what is<br /><em>worth keeping.</em></h1>
      <p className="choice-note">Explore the public collection or enter your private archive.</p>
      <div className="choice-actions"><Link className="choice-primary" to="/view">View gallery <span>↗</span></Link><Link className="choice-secondary" to="/signin">Sign in <span>↗</span></Link></div>
    </section>
    <p className="choice-footer">A QUIET DIGITAL ARCHIVE <span>•</span> EST. 2024</p>
  </main>
);

export default ChoicePage;
