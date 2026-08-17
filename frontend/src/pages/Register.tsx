import { useState } from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  UserRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
  Sparkles,
  CreditCard,
  TrendingUp,
  Bot,
  Zap,
  Cloud,
} from "lucide-react";

import {
  registerUser,
} from "../services/api";


// ==========================================================
// FORM STATE
// ==========================================================

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  terms: boolean;
};


// ==========================================================
// REGISTER COMPONENT
// ==========================================================

export default function Register() {

  const navigate = useNavigate();

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirm, setShowConfirm] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [error, setError] =
    useState("");


  // ========================================================
  // FORM
  // ========================================================

  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "Customer",
    terms: false,
  });


  // ========================================================
  // UPDATE FORM
  // ========================================================

  const updateForm = (
    key: keyof FormState,
    value: string | boolean
  ) => {

    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));

  };


  // ========================================================
  // PASSWORD RULES
  // ========================================================

  const passwordRules = [

    {
      label: "8 characters",
      valid: form.password.length >= 8,
    },

    {
      label: "Uppercase",
      valid: /[A-Z]/.test(form.password),
    },

    {
      label: "Number",
      valid: /[0-9]/.test(form.password),
    },

    {
      label: "Special symbol",
      valid: /[^A-Za-z0-9]/.test(form.password),
    },

  ];


  const passwordScore =
    passwordRules.filter(
      (item) => item.valid
    ).length;


  // ========================================================
  // REGISTER
  // ========================================================

  const submitRegister = async (
    event: React.FormEvent
  ) => {

    event.preventDefault();

    setError("");


    // ------------------------------------------------------
    // Required fields
    // ------------------------------------------------------

    if (!form.firstName.trim()) {

      setError("Please enter your first name.");

      return;
    }


    if (!form.lastName.trim()) {

      setError("Please enter your last name.");

      return;
    }


    if (!form.email.trim()) {

      setError("Please enter your email address.");

      return;
    }


    // ------------------------------------------------------
    // Password confirmation
    // ------------------------------------------------------

    if (
      form.password !==
      form.confirmPassword
    ) {

      setError(
        "Passwords do not match."
      );

      return;
    }


    // ------------------------------------------------------
    // Password strength
    // ------------------------------------------------------

    if (passwordScore !== 4) {

      setError(
        "Please complete all password requirements."
      );

      return;
    }


    // ------------------------------------------------------
    // Terms
    // ------------------------------------------------------

    if (!form.terms) {

      setError(
        "Please accept the Terms and Privacy Policy."
      );

      return;
    }


    try {

      setLoading(true);


      // ====================================================
      // BACKEND PAYLOAD
      // ====================================================
      //
      // Backend RegisterRequest expects:
      //
      // first_name
      // last_name
      // email
      // phone
      // password
      // role
      //
      // ====================================================

      const registrationData = {

        first_name:
          form.firstName.trim(),

        last_name:
          form.lastName.trim(),

        email:
          form.email.trim(),

        phone:
          "",

        password:
          form.password,

        role:
          form.role.toLowerCase(),

      };


      console.log(
        "REGISTER PAYLOAD 👉",
        registrationData
      );


      await registerUser(
        registrationData
      );


      // ====================================================
      // SUCCESS
      // ====================================================

      setSuccess(true);


      setTimeout(() => {

        navigate("/login");

      }, 1500);


    } catch (err: any) {

      console.error(
        "REGISTRATION ERROR 👉",
        err
      );


      // ----------------------------------------------------
      // Show actual FastAPI validation error when available
      // ----------------------------------------------------

      if (
        err?.response?.data?.detail
      ) {

        const detail =
          err.response.data.detail;


        if (Array.isArray(detail)) {

          const messages =
            detail.map(
              (item: any) =>
                item.msg
            );

          setError(
            messages.join(", ")
          );

        } else {

          setError(
            String(detail)
          );

        }

      } else {

        setError(
          "Registration failed. Please try again."
        );

      }

    } finally {

      setLoading(false);

    }

  };


  // ========================================================
  // UI
  // ========================================================

  return (

    <div style={styles.page}>


      {/* ==================================================
          BACK BUTTON
      ================================================== */}

      <Link
        to="/"
        style={styles.back}
      >

        <ArrowLeft size={18} />

        Back

      </Link>


      {/* ==================================================
          BACKGROUND EFFECTS
      ================================================== */}

      <div
        style={styles.oliveGlow}
      />

      <div
        style={styles.bronzeGlow}
      />


      {/* ==================================================
          MAIN CONTAINER
      ================================================== */}

      <div style={styles.container}>


        {/* ==================================================
            LEFT SHOWCASE
        ================================================== */}

        <section style={styles.showcase}>


          {/* BRAND */}

          <div style={styles.brand}>

            <div style={styles.logoCircle}>
              B
            </div>

            <span>
              BillSphere
            </span>

          </div>


          {/* HERO */}

          <h1 style={styles.heroTitle}>

            Create your

            <br />

            <span style={styles.gradient}>
              intelligent
            </span>

            <br />

            billing ecosystem.

          </h1>


          <p style={styles.heroText}>

            Join the next generation of SaaS
            companies automating subscriptions,
            invoices and payments with AI powered
            billing.

          </p>


          {/* ==================================================
              MINI DASHBOARD
          ================================================== */}

          <div style={styles.previewCard}>


            <div style={styles.previewHeader}>

              <Bot size={20} />

              AI Billing Assistant

            </div>


            <div style={styles.metric}>

              <div>

                <small>
                  Monthly Revenue
                </small>

                <h2>
                  ₹24,85,500
                </h2>

              </div>


              <TrendingUp size={35} />

            </div>


            <div style={styles.progress}>

              <span
                style={styles.progressBar}
              />

            </div>


            <div style={styles.previewFooter}>


              <div>

                <CreditCard size={16} />

                12,450 Active

              </div>


              <div>

                <Zap size={16} />

                98% Success

              </div>


            </div>

          </div>


          {/* ==================================================
              FEATURES
          ================================================== */}

          <div style={styles.features}>


            <PremiumFeature
              icon={<ShieldCheck />}
              title="Enterprise Security"
              text="Bank-grade protection"
            />


            <PremiumFeature
              icon={<Sparkles />}
              title="AI Automation"
              text="Smart billing workflows"
            />


            <PremiumFeature
              icon={<Cloud />}
              title="Cloud Platform"
              text="Scale globally"
            />


          </div>


        </section>


        {/* ==================================================
            REGISTER CARD
        ================================================== */}

        <section style={styles.card}>


          {/* SUCCESS */}

          {success && (

            <div
              style={styles.successBox}
            >

              <Check size={30} />

              Account Created Successfully

            </div>

          )}


          <h2 style={styles.title}>
            Create Account
          </h2>


          <p style={styles.subtitle}>
            Start your premium billing journey
          </p>


          {/* ==================================================
              FORM
          ================================================== */}

          <form
            onSubmit={submitRegister}
          >


            {/* FIRST NAME */}

            <PremiumInput
              icon={<UserRound />}
              placeholder="First Name"
              value={form.firstName}
              onChange={(value: string) =>
                updateForm(
                  "firstName",
                  value
                )
              }
            />


            {/* LAST NAME */}

            <PremiumInput
              icon={<UserRound />}
              placeholder="Last Name"
              value={form.lastName}
              onChange={(value: string) =>
                updateForm(
                  "lastName",
                  value
                )
              }
            />


            {/* ROLE */}

            <select
              style={styles.select}
              value={form.role}
              onChange={(event) =>
                updateForm(
                  "role",
                  event.target.value
                )
              }
            >

              <option value="Customer">
                Customer
              </option>

              <option value="Admin">
                Admin
              </option>

            </select>


            {/* EMAIL */}

            <PremiumInput
              icon={<Mail />}
              placeholder="Email Address"
              type="email"
              value={form.email}
              onChange={(value: string) =>
                updateForm(
                  "email",
                  value
                )
              }
            />


            {/* PASSWORD */}

            <div
              style={styles.inputWrapper}
            >

              <Lock />


              <input
                style={styles.input}
                placeholder="Password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={form.password}
                onChange={(event) =>
                  updateForm(
                    "password",
                    event.target.value
                  )
                }
              />


              <span
                style={styles.eyeButton}
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
              >

                {showPassword
                  ? <EyeOff />
                  : <Eye />
                }

              </span>

            </div>


            {/* ==================================================
                PASSWORD REQUIREMENTS
            ================================================== */}

            <div
              style={styles.passwordArea}
            >


              <div
                style={styles.passwordTitle}
              >

                Password Strength

                <strong>

                  {
                    passwordScore === 4
                      ? "Strong"
                      : passwordScore >= 2
                        ? "Medium"
                        : "Weak"
                  }

                </strong>

              </div>


              <div
                style={styles.strengthBar}
              >

                <span
                  style={{
                    width:
                      `${passwordScore * 25}%`,

                    height: "100%",

                    display: "block",

                    background:
                      "linear-gradient(90deg,#b8895a,#8fae4a)",
                  }}
                />

              </div>


              <div
                style={styles.rules}
              >

                {passwordRules.map(
                  (rule, index) => (

                    <div
                      key={index}
                      style={{
                        ...styles.rule,

                        background:
                          rule.valid
                            ? "rgba(143,174,74,.14)"
                            : "rgba(255,100,100,.08)",

                        color:
                          rule.valid
                            ? "#9bb254"
                            : "#ff7373",
                      }}
                    >

                      {rule.valid
                        ? <Check size={13} />
                        : "•"
                      }

                      {rule.label}

                    </div>

                  )
                )}

              </div>

            </div>


            {/* CONFIRM PASSWORD */}

            <PremiumInput
              icon={<Lock />}
              placeholder="Confirm Password"
              type={
                showConfirm
                  ? "text"
                  : "password"
              }
              value={form.confirmPassword}
              onChange={(value: string) =>
                updateForm(
                  "confirmPassword",
                  value
                )
              }
              eye={true}
              show={showConfirm}
              toggle={() =>
                setShowConfirm(
                  !showConfirm
                )
              }
            />


            {/* TERMS */}

            <label
              style={styles.terms}
            >

              <input
                type="checkbox"
                checked={form.terms}
                onChange={(event) =>
                  updateForm(
                    "terms",
                    event.target.checked
                  )
                }
              />

              <span>

                I agree to{" "}

                <b>
                  Terms
                </b>

                {" "}and{" "}

                <b>
                  Privacy Policy
                </b>

              </span>

            </label>


            {/* ERROR */}

            {error && (

              <div
                style={styles.errorBox}
              >

                {error}

              </div>

            )}


            {/* SUBMIT */}

            <button
              type="submit"
              style={{
                ...styles.button,

                opacity:
                  form.terms
                    ? 1
                    : 0.5,
              }}

              disabled={
                !form.terms ||
                loading
              }
            >

              {loading

                ? (
                  "Creating Account..."
                )

                : (
                  <>
                    Create Account

                    <ArrowRight
                      size={18}
                    />
                  </>
                )

              }

            </button>


            {/* DIVIDER */}

            <div
              style={styles.divider}
            >

              <span
                style={styles.dividerLine}
              />

              or

              <span
                style={styles.dividerLine}
              />

            </div>


            {/* LOGIN */}

            <div
              style={styles.loginBox}
            >

              Already have a
              BillSphere account?

              <Link
                to="/login"
                style={styles.loginLink}
              >

                Login

              </Link>

            </div>


          </form>

        </section>

      </div>

    </div>

  );

}


// ==========================================================
// PREMIUM INPUT
// ==========================================================

function PremiumInput({
  icon,
  placeholder,
  value,
  onChange,
  type = "text",
  eye,
  show,
  toggle,
}: any) {

  return (

    <div
      style={styles.inputWrapper}
    >

      {icon}


      <input
        style={styles.input}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
      />


      {eye && (

        <span
          style={styles.eyeButton}
          onClick={toggle}
        >

          {show
            ? <EyeOff />
            : <Eye />
          }

        </span>

      )}

    </div>

  );

}


// ==========================================================
// FEATURE COMPONENT
// ==========================================================

function PremiumFeature({
  icon,
  title,
  text,
}: any) {

  return (

    <div
      style={styles.featureItem}
    >

      <div
        style={styles.featureIcon}
      >

        {icon}

      </div>


      <div>

        <strong>
          {title}
        </strong>

        <small>
          {text}
        </small>

      </div>

    </div>

  );

}


// ==========================================================
// STYLES
// ==========================================================

const styles: any = {

  page: {

    minHeight: "100vh",

    background:
      "radial-gradient(circle at top left,#2f3a12 0%,#0a0a06 35%,#050503 100%)",

    color: "#f7f2e2",

    fontFamily:
      "Inter,Arial,sans-serif",

    overflow: "hidden",

    position: "relative",

  },


  back: {

    position: "absolute",

    top: "35px",

    left: "45px",

    display: "flex",

    alignItems: "center",

    gap: "8px",

    color: "#a6a290",

    textDecoration: "none",

    fontSize: "14px",

    zIndex: 5,

  },


  oliveGlow: {

    position: "absolute",

    width: "600px",

    height: "600px",

    background:
      "radial-gradient(circle,#5a6b2855,transparent 70%)",

    top: "-100px",

    left: "-100px",

    filter: "blur(60px)",

  },


  bronzeGlow: {

    position: "absolute",

    width: "500px",

    height: "500px",

    background:
      "radial-gradient(circle,#d4af3733,transparent 70%)",

    right: "-150px",

    bottom: "-100px",

    filter: "blur(80px)",

  },


  container: {

    minHeight: "100vh",

    display: "grid",

    gridTemplateColumns:
      "1fr 460px",

    gap: "80px",

    alignItems: "center",

    padding:
      "70px 100px",

  },


  showcase: {

    maxWidth: "600px",

  },


  brand: {

    display: "flex",

    alignItems: "center",

    gap: "12px",

    fontSize: "22px",

    fontWeight: 800,

    marginBottom: "35px",

  },


  logoCircle: {

    width: "45px",

    height: "45px",

    borderRadius: "50%",

    background:
      "linear-gradient(135deg,#d4af37,#f7f2e2)",

    color: "#111",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    fontWeight: 900,

    fontSize: "22px",

  },


  heroTitle: {

    fontSize: "68px",

    lineHeight: "1",

    letterSpacing: "-3px",

    margin: 0,

  },


  heroText: {

    marginTop: "25px",

    fontSize: "18px",

    lineHeight: "1.7",

    color: "#a6a290",

    maxWidth: "500px",

  },


  previewCard: {

    marginTop: "40px",

    padding: "25px",

    borderRadius: "28px",

    background:
      "rgba(255,255,255,0.06)",

    border:
      "1px solid rgba(143,174,74,.22)",

    backdropFilter:
      "blur(25px)",

    boxShadow:
      "0 30px 90px rgba(0,0,0,.5)",

  },


  previewHeader: {

    display: "flex",

    gap: "10px",

    alignItems: "center",

    color: "#e8d9a0",

    fontWeight: 700,

  },


  metric: {

    display: "flex",

    justifyContent:
      "space-between",

    alignItems: "center",

    marginTop: "25px",

  },


  progress: {

    height: "8px",

    background: "#1a1a12",

    borderRadius: "20px",

    overflow: "hidden",

    marginTop: "20px",

  },


  progressBar: {

    display: "block",

    height: "100%",

    width: "80%",

    background:
      "linear-gradient(90deg,#d4af37,#5a6b28)",

    borderRadius: "20px",

  },


  previewFooter: {

    display: "flex",

    justifyContent:
      "space-between",

    marginTop: "20px",

    color: "#a6a290",

    fontSize: "13px",

  },


  features: {

    display: "flex",

    gap: "15px",

    marginTop: "25px",

  },


  featureItem: {

    display: "flex",

    alignItems: "center",

    gap: "12px",

    padding: "14px",

    borderRadius: "18px",

    background:
      "rgba(255,255,255,.04)",

    border:
      "1px solid rgba(143,174,74,.18)",

  },


  featureIcon: {

    color: "#e8d9a0",

  },


  card: {

    background:
      "rgba(255,255,255,.05)",

    border:
      "1px solid rgba(143,174,74,.22)",

    borderRadius: "32px",

    padding: "38px",

    backdropFilter:
      "blur(30px)",

    boxShadow:
      "0 40px 100px rgba(0,0,0,.6), 0 0 60px rgba(184,137,90,.08)",

  },


  title: {

    fontSize: "32px",

    marginBottom: "8px",

  },


  subtitle: {

    color: "#a6a290",

    marginBottom: "25px",

  },


  inputWrapper: {

    height: "52px",

    display: "flex",

    alignItems: "center",

    gap: "12px",

    background:
      "rgba(0,0,0,.45)",

    border:
      "1px solid rgba(143,174,74,.2)",

    borderRadius: "16px",

    padding: "0 16px",

    marginBottom: "15px",

    color: "#a6a290",

  },


  input: {

    background: "transparent",

    border: "none",

    outline: "none",

    color: "#f7f2e2",

    width: "100%",

    fontSize: "14px",

  },


  eyeButton: {

    cursor: "pointer",

    display: "flex",

    alignItems: "center",

    color: "#a6a290",

  },


  select: {

    height: "52px",

    width: "100%",

    background:
      "rgba(0,0,0,.45)",

    color: "#f7f2e2",

    border:
      "1px solid rgba(143,174,74,.2)",

    borderRadius: "16px",

    padding: "0 16px",

    marginBottom: "15px",

    outline: "none",

  },


  passwordArea: {

    marginBottom: "15px",

  },


  passwordTitle: {

    display: "flex",

    justifyContent:
      "space-between",

    fontSize: "13px",

    color: "#a6a290",

  },


  strengthBar: {

    height: "7px",

    background: "#1a1a12",

    borderRadius: "20px",

    marginTop: "10px",

    overflow: "hidden",

  },


  rules: {

    display: "flex",

    flexWrap: "wrap",

    gap: "8px",

    marginTop: "12px",

  },


  rule: {

    fontSize: "12px",

    padding: "6px 10px",

    borderRadius: "20px",

    display: "flex",

    gap: "5px",

    alignItems: "center",

  },


  terms: {

    display: "flex",

    gap: "10px",

    alignItems: "center",

    color: "#a6a290",

    fontSize: "13px",

    marginTop: "20px",

  },


  button: {

    width: "100%",

    height: "54px",

    marginTop: "22px",

    border: "none",

    borderRadius: "30px",

    background:
      "linear-gradient(100deg,#f7f2e2,#e8d9a0 30%,#d4af37 55%,#b8895a 75%,#5a6b28)",

    fontWeight: 800,

    fontSize: "15px",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    gap: "10px",

    cursor: "pointer",

    color: "#0a0a06",

    boxShadow:
      "0 0 40px rgba(184,137,90,.4)",

  },


  divider: {

    display: "flex",

    alignItems: "center",

    gap: "15px",

    color: "#66655a",

    margin: "25px 0",

  },


  dividerLine: {

    height: "1px",

    background:
      "rgba(143,174,74,.25)",

    flex: 1,

  },


  loginBox: {

    textAlign: "center",

    color: "#a6a290",

    fontSize: "14px",

  },


  loginLink: {

    color: "#e8d9a0",

    marginLeft: "6px",

    fontWeight: 700,

  },


  successBox: {

    background:
      "rgba(143,174,74,.15)",

    border:
      "1px solid #8fae4a",

    padding: "15px",

    borderRadius: "18px",

    display: "flex",

    gap: "10px",

    alignItems: "center",

    marginBottom: "20px",

    color: "#9bb254",

  },


  errorBox: {

    background:
      "rgba(255,80,80,.12)",

    border:
      "1px solid #ff5555",

    padding: "12px",

    borderRadius: "15px",

    marginTop: "15px",

    color: "#ff7777",

  },


  gradient: {

    background:
      "linear-gradient(90deg,#f7f2e2,#e8d9a0,#d4af37,#b8895a)",

    WebkitBackgroundClip: "text",

    color: "transparent",

  },

};