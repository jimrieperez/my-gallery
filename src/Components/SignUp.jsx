import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const supabase = useSupabaseClient();

  const signUp = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (password.length < 6) {
      setMessage("Your password must be at least 6 characters.");
      return;
    }
    if (!name.trim()) {
      setMessage("Please enter a display name.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() } } });
    if (error) {
      const errorText = error.message.toLowerCase();
      const message = errorText.includes("rate limit")
        ? "Supabase email sending is rate-limited. Disable email confirmation in Supabase Auth settings or wait before trying again."
        : errorText.includes("signups not allowed")
          ? "New signups are disabled in Supabase Auth settings. Enable user signups and try again."
          : error.message;
      setMessage(message);
      console.log(error);
    } else if (data.session) {
      navigate("/gallerypage");
    } else {
      setMessage("Account created. Check your email and confirm your account before signing in.");
    }
    setSubmitting(false);
  };

  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <div className="brand-mark">MG<span>.</span></div>
        <div className="intro-copy">
          <p className="eyebrow">Start your collection</p>
          <h1>Make room for<br /><em>new memories.</em></h1>
          <p className="intro-note">Your images deserve a home that feels as considered as the work itself.</p>
        </div>
        <p className="intro-footer">EST. 2024 <span>/</span> PERSONAL GALLERY</p>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <p className="eyebrow">Create account</p>
          <h2>Start your archive.</h2>
          <p className="form-note">Just the essentials. You can add the rest later.</p>
          {message && <p className="auth-message" role="status">{message}</p>}
          <form onSubmit={signUp} className="auth-form auth-form-block">
            <label htmlFor="name">Your name</label>
            <input id="name" className="modern-input" type="text" placeholder="What should we call you?" onChange={(e) => setName(e.target.value)} required />
            <label htmlFor="signup-email">Email address</label>
            <input id="signup-email" className="modern-input" type="email" placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} required />
            <label htmlFor="signup-password">Password</label>
            <input id="signup-password" className="modern-input" type="password" placeholder="Choose a password" minLength="6" onChange={(e) => setPassword(e.target.value)} required />
            <button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create account"} <span>↗</span></button>
            <p className="switch-auth">Already have an account? <Link to="/signin">Sign in</Link></p>
          </form>
        </div>
      </section>
    </main>
  );
};

export default SignUp;
