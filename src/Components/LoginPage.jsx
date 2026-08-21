import { useState } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { Link, useNavigate } from "react-router-dom";

const LoginPage = () => {
  const user = useUser();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const supabase = useSupabaseClient();

  if (user) navigate("/gallerypage");

  const loginWithPass = async (e) => {
    e.preventDefault();
    setLoginMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const message = error.message.toLowerCase().includes("email not confirmed")
        ? "Please confirm your email address using the link we sent before signing in."
        : error.message;
      setLoginMessage(message);
      console.log(error);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <div className="brand-mark">MG<span>.</span></div>
        <div className="intro-copy">
          <p className="eyebrow">A private visual archive</p>
          <h1>Keep the things<br /><em>worth seeing.</em></h1>
          <p className="intro-note">A quiet place for your images, ideas, and the moments you want to return to.</p>
        </div>
        <p className="intro-footer">EST. 2024 <span>/</span> PERSONAL GALLERY</p>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <p className="eyebrow">Welcome back</p>
          <h2>Enter your archive.</h2>
          <p className="form-note">Sign in to pick up where you left off.</p>
          {loginMessage && <p className="auth-message" role="alert">{loginMessage}</p>}
          <div className="auth-form-block">
            <form onSubmit={loginWithPass} className="auth-form">
              <h3>Password sign in</h3>
              <label htmlFor="password-email">Email address</label>
              <input id="password-email" className="modern-input" type="email" placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} required />
              <label htmlFor="password">Password</label>
              <input id="password" className="modern-input" type="password" placeholder="Your password" onChange={(e) => setPassword(e.target.value)} required />
              <button className="secondary-button" type="submit">Sign in <span>↗</span></button>
            </form>
            <p className="switch-auth">New here? <Link to="/signuppage">Create an account</Link></p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
