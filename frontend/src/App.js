import { useState, useEffect } from "react";
import { api } from "./api/api";

const FIELD_LABELS = {
  full_name: "Full Name", dob: "Date of Birth", gender: "Gender",
  mobile: "Mobile Number", email: "Email Address", father_name: "Father's Name",
  address: "Full Address", district: "District", state: "State",
  pincode: "Pincode", caste_category: "Caste Category",
  annual_income: "Annual Family Income (₹)",
};
const GENDER_OPTIONS = ["Male", "Female", "Other"];
const CASTE_OPTIONS = ["General", "OBC", "SC", "ST"];

// ── shared styles ──────────────────────────────────────────────
const S = {
  input: (af, err) => ({
    width: "100%", padding: "10px 13px", borderRadius: "7px",
    border: `1.5px solid ${err ? "#c0392b" : af ? "#1e8449" : "#cdd5dc"}`,
    background: af ? "#eafaf1" : "#fff", fontSize: "14px",
    color: "#1a2332", outline: "none", boxSizing: "border-box",
  }),
  select: (af, err) => ({
    width: "100%", padding: "10px 13px", borderRadius: "7px",
    border: `1.5px solid ${err ? "#c0392b" : af ? "#1e8449" : "#cdd5dc"}`,
    background: af ? "#eafaf1" : "#fff", fontSize: "14px",
    color: "#1a2332", outline: "none", boxSizing: "border-box",
  }),
  label: { display: "block", fontSize: "11px", fontWeight: "600", letterSpacing: "0.06em", color: "#5d6b7a", marginBottom: "5px", textTransform: "uppercase" },
  afBadge: { fontSize: "10px", padding: "2px 6px", borderRadius: "3px", background: "#d5f5e3", color: "#1e8449", fontWeight: "700", marginLeft: "7px" },
  errText: { fontSize: "11px", color: "#c0392b", marginTop: "3px" },
  btnPrimary: { background: "#1a3a5c", color: "#fff", border: "none", padding: "11px 28px", borderRadius: "7px", fontWeight: "600", fontSize: "14px", cursor: "pointer", letterSpacing: "0.02em" },
  btnGreen: { background: "#1e8449", color: "#fff", border: "none", padding: "11px 28px", borderRadius: "7px", fontWeight: "600", fontSize: "14px", cursor: "pointer" },
  btnOutline: { background: "transparent", color: "#1a3a5c", border: "1.5px solid #1a3a5c", padding: "10px 24px", borderRadius: "7px", fontWeight: "600", fontSize: "14px", cursor: "pointer" },
  card: { background: "#fff", borderRadius: "11px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: "1.25rem", overflow: "hidden" },
  cardHead: (color = "#1a3a5c") => ({ background: color, color: "#fff", padding: "14px 20px" }),
  cardBody: { padding: "20px" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" },
  alertGreen: { background: "#eafaf1", border: "1px solid #a9dfbf", borderRadius: "8px", padding: "11px 15px", color: "#1e8449", fontSize: "13px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" },
  alertBlue: { background: "#ebf5fb", border: "1px solid #a9cce3", borderRadius: "8px", padding: "11px 15px", color: "#1a5276", fontSize: "13px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" },
  alertYellow: { background: "#fef9e7", border: "1px solid #f9e79f", borderRadius: "8px", padding: "11px 15px", color: "#7d6608", fontSize: "13px", marginBottom: "14px" },
  alertRed: { background: "#fdedec", border: "1px solid #f1948a", borderRadius: "8px", padding: "11px 15px", color: "#922b21", fontSize: "13px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" },
  stepBar: { display: "flex", marginBottom: "2rem" },
  step: (a, d) => ({ flex: 1, textAlign: "center", padding: "8px 4px", borderBottom: `3px solid ${d ? "#1e8449" : a ? "#1a3a5c" : "#e1e8ef"}`, fontSize: "12px", fontWeight: d || a ? "700" : "400", color: d ? "#1e8449" : a ? "#1a3a5c" : "#a0aec0" }),
  successBox: { textAlign: "center", padding: "3rem 2rem", background: "#fff", borderRadius: "11px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
};

// ── Field component ────────────────────────────────────────────
function Field({ name, value, onChange, autofilled, error }) {
  const label = FIELD_LABELS[name] || name;
  return (
    <div>
      <label style={S.label}>{label}{autofilled && <span style={S.afBadge}>AUTO-FILLED</span>}</label>
      {name === "gender" || name === "caste_category" ? (
        <select value={value || ""} onChange={e => onChange(name, e.target.value)} style={S.select(autofilled, error)}>
          <option value="">Select {label}</option>
          {(name === "gender" ? GENDER_OPTIONS : CASTE_OPTIONS).map(o => <option key={o}>{o}</option>)}
        </select>
      ) : name === "address" ? (
        <textarea value={value || ""} onChange={e => onChange(name, e.target.value)} rows={2}
          style={{ ...S.input(autofilled, error), resize: "vertical" }} placeholder="Enter full address" />
      ) : (
        <input
          type={name === "dob" ? "date" : name === "annual_income" ? "number" : name === "email" ? "email" : "text"}
          value={value || ""} onChange={e => onChange(name, e.target.value)}
          style={S.input(autofilled, error)}
          placeholder={name === "mobile" ? "10-digit mobile" : `Enter ${label.toLowerCase()}`}
        />
      )}
      {error && <div style={S.errText}>⚠ {error}</div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ════════════════════════════════════════════════════════════════
function LoginPage({ onLogin, onGoRegister }) {
  const [tab, setTab] = useState("login"); // login | otp
  const [mobile, setMobile] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverErr, setServerErr] = useState("");

  const validate = () => {
    const e = {};
    if (!/^[6-9]\d{9}$/.test(mobile)) e.mobile = "Enter valid 10-digit mobile number";
    if (!/^\d{4}$/.test(aadhaar)) e.aadhaar = "Enter last 4 digits of Aadhaar";
    return e;
  };

  const handleLogin = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setLoading(true); setServerErr("");
    try {
      const res = await api.login(mobile, aadhaar);
      if (res.success) {
        onLogin({ citizen_id: res.citizen_id, full_name: res.full_name, mobile: res.mobile });
      } else {
        setServerErr(res.message);
      }
    } catch {
      setServerErr("Connection error. Make sure backend is running on port 8000.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0d2137 0%, #1a3a5c 50%, #1a5276 100%)", display: "flex", flexDirection: "column" }}>

      {/* top bar */}
      <div style={{ padding: "14px 2rem", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ width: "30px", height: "20px", background: "linear-gradient(#FF9933 33%, white 33%, white 66%, #138808 66%)", borderRadius: "2px", border: "1px solid rgba(255,255,255,0.3)", flexShrink: 0 }} />
        <span style={{ color: "white", fontWeight: "700", fontSize: "15px", letterSpacing: "0.03em" }}>eDistrict 2.0</span>
        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px" }}>Government of Chhattisgarh</span>
        <span style={{ marginLeft: "auto", fontSize: "11px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.04em" }}>MODULE 2 — SMART CITIZEN PROFILE</span>
      </div>

      {/* hero + card */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
        <div style={{ display: "flex", gap: "60px", alignItems: "center", maxWidth: "860px", width: "100%" }}>

          {/* left hero text */}
          <div style={{ flex: 1, color: "white" }}>
            <div style={{ fontSize: "11px", letterSpacing: "0.12em", color: "rgba(255,255,255,0.5)", marginBottom: "14px", textTransform: "uppercase" }}>Smart Citizen Portal</div>
            <h1 style={{ fontSize: "32px", fontWeight: "800", lineHeight: "1.2", marginBottom: "16px", color: "white" }}>
              One profile.<br />Every service.
            </h1>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.65)", lineHeight: "1.7", marginBottom: "24px" }}>
              Register once and your details auto-fill across income certificates, domicile, caste certificates, scholarships and more.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                ["Auto-fill across all services", "No re-entering your name, address, caste every time"],
                ["Unified document vault", "Reuse Aadhaar, caste cert, marksheets instantly"],
                ["Expiry tracking", "Get alerts before your income cert or ration card expires"],
              ].map(([title, sub]) => (
                <div key={title} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                    <span style={{ fontSize: "10px", color: "#5dade2" }}>✓</span>
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.9)" }}>{title}</div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* login card */}
          <div style={{ width: "360px", flexShrink: 0, background: "#fff", borderRadius: "14px", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
            {/* card header */}
            <div style={{ background: "#f7f9fc", borderBottom: "1px solid #e8edf2", padding: "20px 24px 0" }}>
              <div style={{ display: "flex", gap: "0" }}>
                {["login", "otp"].map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    flex: 1, padding: "10px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: tab === t ? "700" : "500",
                    background: "transparent", color: tab === t ? "#1a3a5c" : "#8fa0b0",
                    borderBottom: `2.5px solid ${tab === t ? "#1a3a5c" : "transparent"}`,
                    transition: "all 0.15s", letterSpacing: "0.02em",
                  }}>
                    {t === "login" ? "Login with Aadhaar" : "Login with OTP"}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: "24px" }}>
              {serverErr && (
                <div style={S.alertRed}>
                  <span style={{ fontSize: "16px" }}>⚠</span>
                  <span>{serverErr}</span>
                </div>
              )}

              {tab === "login" ? (
                <>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={S.label}>Registered Mobile Number</label>
                    <input type="text" maxLength={10} value={mobile}
                      onChange={e => { setMobile(e.target.value); setErrors(p => ({ ...p, mobile: null })); setServerErr(""); }}
                      style={S.input(false, errors.mobile)} placeholder="10-digit mobile number"
                      onKeyDown={e => e.key === "Enter" && handleLogin()}
                    />
                    {errors.mobile && <div style={S.errText}>⚠ {errors.mobile}</div>}
                  </div>
                  <div style={{ marginBottom: "20px" }}>
                    <label style={S.label}>Aadhaar — Last 4 Digits</label>
                    <input type="text" maxLength={4} value={aadhaar}
                      onChange={e => { setAadhaar(e.target.value); setErrors(p => ({ ...p, aadhaar: null })); setServerErr(""); }}
                      style={S.input(false, errors.aadhaar)} placeholder="e.g. 4821"
                      onKeyDown={e => e.key === "Enter" && handleLogin()}
                    />
                    {errors.aadhaar && <div style={S.errText}>⚠ {errors.aadhaar}</div>}
                  </div>
                  <button style={{ ...S.btnPrimary, width: "100%", padding: "12px" }} onClick={handleLogin} disabled={loading}>
                    {loading ? "Verifying..." : "Login →"}
                  </button>
                  
                </>
              ) : (
                <OTPTab mobile={mobile} setMobile={setMobile} onLogin={onLogin} />
              )}

              <div style={{ borderTop: "1px solid #e8edf2", marginTop: "20px", paddingTop: "16px", textAlign: "center" }}>
                <span style={{ fontSize: "13px", color: "#8fa0b0" }}>New citizen? </span>
                <button onClick={onGoRegister} style={{ fontSize: "13px", color: "#1a3a5c", fontWeight: "700", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                  Register here →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "14px", fontSize: "11px", color: "rgba(255,255,255,0.25)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        eDistrict 2.0 · Module 2 Demo · Data stored locally in SQLite
      </div>
    </div>
  );
}

// OTP tab (mock — shows flow)
function OTPTab({ mobile, setMobile, onLogin }) {
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState("");

  const sendOTP = () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) { setErr("Enter valid mobile first"); return; }
    setSent(true); setErr("");
  };

  const verifyOTP = () => {
    if (otp === "123456") {
      // mock success — in real system call backend
      alert("OTP verified! (Demo: use Aadhaar login for actual profile lookup)");
    } else {
      setErr("Invalid OTP. Demo OTP is 123456.");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "14px" }}>
        <label style={S.label}>Mobile Number</label>
        <input type="text" maxLength={10} value={mobile} onChange={e => { setMobile(e.target.value); setErr(""); }}
          style={S.input(false, "")} placeholder="10-digit mobile" />
      </div>
      {!sent ? (
        <button style={{ ...S.btnPrimary, width: "100%", padding: "12px" }} onClick={sendOTP}>Send OTP →</button>
      ) : (
        <>
          <div style={{ ...S.alertGreen, marginBottom: "14px" }}>✓ OTP sent to +91 {mobile}</div>
          <div style={{ marginBottom: "16px" }}>
            <label style={S.label}>Enter OTP</label>
            <input type="text" maxLength={6} value={otp} onChange={e => { setOtp(e.target.value); setErr(""); }}
              style={S.input(false, err)} placeholder="6-digit OTP" />
            {err && <div style={S.errText}>⚠ {err}</div>}
            <div style={{ fontSize: "11px", color: "#8fa0b0", marginTop: "4px" }}>Demo OTP: 123456</div>
          </div>
          <button style={{ ...S.btnPrimary, width: "100%", padding: "12px" }} onClick={verifyOTP}>Verify OTP →</button>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// NAVBAR
// ════════════════════════════════════════════════════════════════
function Navbar({ user, page, onNavigate, onLogout }) {
  return (
    <nav style={{ background: "#1a3a5c", padding: "0 1.5rem", display: "flex", alignItems: "center", gap: "8px", height: "56px", boxShadow: "0 2px 8px rgba(0,0,0,0.18)", position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ width: "28px", height: "19px", background: "linear-gradient(#FF9933 33%, white 33%, white 66%, #138808 66%)", borderRadius: "2px", border: "1px solid rgba(255,255,255,0.25)", flexShrink: 0 }} />
      <span style={{ color: "white", fontWeight: "700", fontSize: "15px", letterSpacing: "0.03em", marginRight: "8px" }}>eDistrict 2.0</span>
      {["home", "apply"].map(p => (
        <button key={p} onClick={() => onNavigate(p)} style={{
          padding: "6px 13px", borderRadius: "5px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "500",
          background: page === p ? "rgba(255,255,255,0.18)" : "transparent",
          color: page === p ? "white" : "rgba(255,255,255,0.65)", transition: "all 0.15s",
        }}>
          {p === "home" ? "🏠 Home" : "📋 Apply"}
        </button>
      ))}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: "20px", padding: "5px 12px", display: "flex", alignItems: "center", gap: "7px" }}>
          <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#5dade2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: "#0d2137" }}>
            {user.full_name?.[0] || "?"}
          </div>
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.full_name}</span>
        </div>
        <button onClick={onLogout} style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>Logout</button>
      </div>
    </nav>
  );
}

// ════════════════════════════════════════════════════════════════
// HOME PAGE (after login)
// ════════════════════════════════════════════════════════════════
function HomePage({ user, onNavigate }) {
  const [apps, setApps] = useState([]);
  useEffect(() => {
    if (user?.citizen_id) api.getApplications(user.citizen_id).then(setApps).catch(() => {});
  }, [user]);

  const STATUS_COLOR = { submitted: "#1a5276", approved: "#1e8449", pending: "#7d6608", rejected: "#922b21" };

  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", padding: "2rem 1rem" }}>
      {/* welcome banner */}
      <div style={{ background: "#1a3a5c", borderRadius: "12px", padding: "22px 24px", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "18px" }}>
        <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#5dade2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: "800", color: "#0d2137", flexShrink: 0 }}>
          {user.full_name?.[0] || "?"}
        </div>
        <div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", marginBottom: "3px" }}>WELCOME BACK</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "white" }}>{user.full_name}</div>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>ID: {user.citizen_id} · Mobile: {user.mobile}</div>
        </div>
        <button style={{ marginLeft: "auto", ...S.btnGreen, padding: "9px 20px", fontSize: "13px" }} onClick={() => onNavigate("apply")}>
          + New Application
        </button>
      </div>

      {/* stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "1.5rem" }}>
        {[
          ["Total Applications", apps.length, "#1a3a5c"],
          ["Approved / Issued", apps.filter(a => ["approved","submitted"].includes(a.status)).length, "#1e8449"],
          ["Pending", apps.filter(a => a.status === "pending").length, "#d68910"],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background: "#fff", borderRadius: "10px", padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize: "11px", color: "#8fa0b0", letterSpacing: "0.05em", marginBottom: "6px", textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: "28px", fontWeight: "800", color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* applications list */}
      <div style={S.card}>
        <div style={S.cardHead()}>
          <div style={{ fontWeight: "600", fontSize: "14px" }}>Your Applications</div>
          <div style={{ fontSize: "12px", opacity: 0.65, marginTop: "2px" }}>All past service applications</div>
        </div>
        <div style={S.cardBody}>
          {apps.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#a0aec0" }}>
              <div style={{ fontSize: "36px", marginBottom: "8px" }}>📋</div>
              <div style={{ fontSize: "14px" }}>No applications yet.</div>
              <button style={{ ...S.btnPrimary, marginTop: "12px", fontSize: "13px", padding: "9px 20px" }} onClick={() => onNavigate("apply")}>Apply for a service →</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {apps.map(a => (
                <div key={a.app_id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 14px", background: "#f7f9fc", borderRadius: "8px", border: "1px solid #e8edf2" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "13px" }}>{a.service_name}</div>
                    <div style={{ fontSize: "11px", color: "#8fa0b0", marginTop: "2px" }}>{a.app_id} · {a.submitted_at?.split("T")[0]}</div>
                  </div>
                  <span style={{ fontSize: "11px", padding: "3px 9px", borderRadius: "4px", fontWeight: "700", background: `${STATUS_COLOR[a.status]}22`, color: STATUS_COLOR[a.status] }}>
                    {a.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* quick apply */}
      <div style={S.card}>
        <div style={{ ...S.cardHead(), background: "#1e8449" }}>
          <div style={{ fontWeight: "600", fontSize: "14px" }}>Quick Apply</div>
          <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "2px" }}>Your profile auto-fills the form</div>
        </div>
        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {[
            ["Income Certificate", "Revenue Dept", "SVC001"],
            ["Domicile Certificate", "Revenue Dept", "SVC002"],
            ["Caste Certificate", "Social Welfare", "SVC003"],
            ["Student Scholarship", "Education Dept", "SVC004"],
          ].map(([name, dept]) => (
            <div key={name} onClick={() => onNavigate("apply")} style={{ padding: "12px 14px", border: "1.5px solid #e8edf2", borderRadius: "8px", cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#1a3a5c"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#e8edf2"}>
              <div style={{ fontWeight: "600", fontSize: "13px", color: "#1a3a5c" }}>{name}</div>
              <div style={{ fontSize: "11px", color: "#8fa0b0", marginTop: "2px" }}>{dept}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// REGISTER PAGE
// ════════════════════════════════════════════════════════════════
function RegisterPage({ onNavigate, onLoginAfterRegister }) {
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const validate = () => {
    const e = {};
    if (!form.full_name?.trim()) e.full_name = "Required";
    else if (!/^[A-Za-z\s]+$/.test(form.full_name)) e.full_name = "Letters only";
    if (!form.dob) e.dob = "Required";
    if (!form.gender) e.gender = "Required";
    if (!form.mobile) e.mobile = "Required";
    else if (!/^[6-9]\d{9}$/.test(form.mobile)) e.mobile = "10 digits, starts 6–9";
    if (!form.district?.trim()) e.district = "Required";
    if (!form.state?.trim()) e.state = "Required";
    if (!form.pincode) e.pincode = "Required";
    else if (!/^\d{6}$/.test(form.pincode)) e.pincode = "6 digits";
    if (!form.aadhaar_last4) e.aadhaar_last4 = "Required";
    else if (!/^\d{4}$/.test(form.aadhaar_last4)) e.aadhaar_last4 = "4 digits";
    if (!form.caste_category) e.caste_category = "Required";
    if (!form.annual_income) e.annual_income = "Required";
    return e;
  };

  const handleChange = (name, val) => {
    setForm(p => ({ ...p, [name]: val }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: null }));
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setLoading(true);
    try {
      const result = await api.createProfile({ ...form, annual_income: parseFloat(form.annual_income) });
      setSuccess(result);
    } catch (err) {
      setErrors({ _global: err.message });
    } finally { setLoading(false); }
  };

  if (success) return (
    <div style={{ maxWidth: "500px", margin: "3rem auto", padding: "0 1rem" }}>
      <div style={S.successBox}>
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>✅</div>
        <h2 style={{ color: "#1e8449", fontWeight: "800", marginBottom: "8px" }}>Profile Created!</h2>
        <div style={{ background: "#eafaf1", borderRadius: "9px", padding: "16px", display: "inline-block", marginBottom: "20px", minWidth: "280px" }}>
          <div style={{ fontSize: "11px", color: "#8fa0b0", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Your Citizen ID</div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#1a3a5c", letterSpacing: "0.06em" }}>{success.citizen_id}</div>
          <div style={{ fontSize: "12px", color: "#8fa0b0", marginTop: "6px" }}>
            Use mobile <strong style={{ color: "#1a3a5c" }}>{success.mobile}</strong> + Aadhaar last 4 to login
          </div>
        </div>
        <div>
          <button style={S.btnPrimary} onClick={() => onLoginAfterRegister(success)}>Go to Dashboard →</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={S.card}>
        <div style={S.cardHead()}>
          <div style={{ fontWeight: "600", fontSize: "15px" }}>New Citizen Registration</div>
          <div style={{ fontSize: "12px", opacity: 0.65, marginTop: "2px" }}>Create your profile once — auto-fill across all services</div>
        </div>
        <div style={S.cardBody}>
          {errors._global && <div style={S.alertRed}><span>⚠</span><span>{errors._global}</span></div>}
          <div style={{ ...S.grid2, marginBottom: "14px" }}>
            <Field name="full_name" value={form.full_name} onChange={handleChange} error={errors.full_name} />
            <Field name="dob" value={form.dob} onChange={handleChange} error={errors.dob} />
          </div>
          <div style={{ ...S.grid3, marginBottom: "14px" }}>
            <Field name="gender" value={form.gender} onChange={handleChange} error={errors.gender} />
            <Field name="mobile" value={form.mobile} onChange={handleChange} error={errors.mobile} />
            <Field name="email" value={form.email} onChange={handleChange} error={errors.email} />
          </div>
          <div style={{ marginBottom: "14px" }}>
            <Field name="father_name" value={form.father_name} onChange={handleChange} error={errors.father_name} />
          </div>
          <div style={{ marginBottom: "14px" }}>
            <Field name="address" value={form.address} onChange={handleChange} error={errors.address} />
          </div>
          <div style={{ ...S.grid3, marginBottom: "14px" }}>
            <Field name="district" value={form.district} onChange={handleChange} error={errors.district} />
            <Field name="state" value={form.state} onChange={handleChange} error={errors.state} />
            <Field name="pincode" value={form.pincode} onChange={handleChange} error={errors.pincode} />
          </div>
          <div style={{ ...S.grid3, marginBottom: "22px" }}>
            <div>
              <label style={S.label}>Aadhaar Last 4 Digits</label>
              <input type="text" maxLength={4} value={form.aadhaar_last4 || ""}
                onChange={e => handleChange("aadhaar_last4", e.target.value)}
                style={S.input(false, errors.aadhaar_last4)} placeholder="e.g. 4821" />
              {errors.aadhaar_last4 && <div style={S.errText}>⚠ {errors.aadhaar_last4}</div>}
            </div>
            <Field name="caste_category" value={form.caste_category} onChange={handleChange} error={errors.caste_category} />
            <Field name="annual_income" value={form.annual_income} onChange={handleChange} error={errors.annual_income} />
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button style={S.btnPrimary} onClick={handleSubmit} disabled={loading}>{loading ? "Saving..." : "Create Profile →"}</button>
            <button style={S.btnOutline} onClick={() => onNavigate("login")}>← Back to Login</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// APPLY PAGE
// ════════════════════════════════════════════════════════════════
function ApplyPage({ user, onNavigate }) {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [selectedSvc, setSelectedSvc] = useState(null);
  const [autofillData, setAutofillData] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [autofilledFields, setAutofilledFields] = useState(new Set());
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => { api.getServices().then(setServices).catch(console.error); }, []);

  const handleServiceSelect = async (svc) => {
    setSelectedSvc(svc); setLoading(true);
    try {
      const data = await api.getAutofill(user.mobile, svc.service_id);
      setAutofillData(data);
      setFormValues(data.prefilled_fields || {});
      setAutofilledFields(new Set(Object.keys(data.prefilled_fields || {})));
      setStep(2);
    } catch (err) { alert("Error: " + err.message); }
    finally { setLoading(false); }
  };

  const handleChange = (name, val) => {
    setFormValues(p => ({ ...p, [name]: val }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: null }));
  };

  const handleSubmit = async () => {
    const requiredFields = selectedSvc.fields_needed.split(",");
    const e = {};
    requiredFields.forEach(f => { if (!formValues[f]) e[f] = "Required"; });
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitting(true);
    try {
      const result = await api.submitApplication(user.citizen_id, selectedSvc.service_id, formValues);
      setSuccess(result); setStep(3);
    } catch (err) { alert("Submission failed: " + err.message); }
    finally { setSubmitting(false); }
  };

  if (step === 3 && success) return (
    <div style={{ maxWidth: "500px", margin: "3rem auto", padding: "0 1rem" }}>
      <div style={S.successBox}>
        <div style={{ fontSize: "48px", marginBottom: "10px" }}>🎉</div>
        <h2 style={{ color: "#1e8449", fontWeight: "800", marginBottom: "8px" }}>Application Submitted!</h2>
        <div style={{ background: "#eafaf1", borderRadius: "9px", padding: "16px", display: "inline-block", minWidth: "300px", marginBottom: "20px" }}>
          {[["Application ID", success.app_id], ["Service", success.service_name], ["Status", "✓ Submitted"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", color: "#8fa0b0" }}>{k}</span>
              <span style={{ fontWeight: "700", color: "#1a3a5c", fontSize: "13px" }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button style={S.btnPrimary} onClick={() => { setStep(1); setSuccess(null); setFormValues({}); setSelectedSvc(null); }}>Apply Another →</button>
          <button style={S.btnOutline} onClick={() => onNavigate("home")}>Dashboard</button>
        </div>
      </div>
    </div>
  );

  const STEPS = ["Select Service", "Fill Form", "Done"];
  const fields = selectedSvc?.fields_needed?.split(",") || [];
  const afCount = autofilledFields.size;

  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={S.stepBar}>
        {STEPS.map((s, i) => <div key={s} style={S.step(step === i + 1, step > i + 1)}>{step > i + 1 ? "✓ " : `${i + 1}. `}{s}</div>)}
      </div>

      {/* step 1: service grid */}
      {step === 1 && (
        <div style={S.card}>
          <div style={S.cardHead()}>
            <div style={{ fontWeight: "600", fontSize: "15px" }}>Select Service</div>
            <div style={{ fontSize: "12px", opacity: 0.65, marginTop: "2px" }}>Your profile will auto-fill the application form</div>
          </div>
          <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {services.map(svc => (
              <div key={svc.service_id} onClick={() => handleServiceSelect(svc)} style={{ border: "2px solid #e8edf2", borderRadius: "9px", padding: "16px", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#1a3a5c"; e.currentTarget.style.background = "#f0f4f8"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8edf2"; e.currentTarget.style.background = "white"; }}>
                <div style={{ fontWeight: "700", fontSize: "14px", color: "#1a3a5c", marginBottom: "3px" }}>{svc.service_name}</div>
                <div style={{ fontSize: "11px", color: "#5d6b7a", marginBottom: "6px" }}>{svc.department}</div>
                <div style={{ fontSize: "12px", color: "#8fa0b0" }}>{svc.description}</div>
              </div>
            ))}
          </div>
          {loading && <div style={{ textAlign: "center", padding: "16px", color: "#8fa0b0", fontSize: "13px" }}>Loading auto-fill data...</div>}
        </div>
      )}

      {/* step 2: auto-fill form */}
      {step === 2 && selectedSvc && autofillData && (
        <div style={S.card}>
          <div style={{ ...S.cardHead(), background: "#1a3a5c" }}>
            <div style={{ fontWeight: "600", fontSize: "15px" }}>{selectedSvc.service_name}</div>
            <div style={{ fontSize: "12px", opacity: 0.65, marginTop: "2px" }}>{selectedSvc.department}</div>
          </div>
          <div style={S.cardBody}>
            {/* autofill alert */}
            <div style={{ ...S.alertGreen, alignItems: "flex-start" }}>
              <span style={{ fontSize: "18px", flexShrink: 0 }}>✅</span>
              <div>
                <strong>{afCount} of {fields.length} fields auto-filled</strong> from your saved profile.
                <span style={{ color: "#5d7a64" }}> Green fields are pre-filled — just review and submit.</span>
              </div>
            </div>

            {/* progress bar */}
            <div style={{ background: "#eafaf1", borderRadius: "8px", padding: "11px 14px", marginBottom: "16px", border: "1px solid #a9dfbf" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#1e8449", fontWeight: "600", marginBottom: "6px" }}>
                <span>Auto-fill Progress</span><span>{afCount}/{fields.length} fields</span>
              </div>
              <div style={{ background: "#a9dfbf", borderRadius: "4px", height: "7px", overflow: "hidden" }}>
                <div style={{ width: `${(afCount / fields.length) * 100}%`, background: "#1e8449", height: "100%", borderRadius: "4px", transition: "width 0.5s" }} />
              </div>
            </div>

            {/* required docs */}
            <div style={{ marginBottom: "18px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#5d6b7a", letterSpacing: "0.06em", marginBottom: "7px", textTransform: "uppercase" }}>Required Documents</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {autofillData.service?.required_docs?.map(doc => (
                  <span key={doc} style={{ fontSize: "12px", padding: "4px 10px", background: "#fef9e7", color: "#7d6608", borderRadius: "5px", border: "1px solid #f9e79f", fontWeight: "500" }}>
                    📎 {doc}
                  </span>
                ))}
              </div>
            </div>

            {/* form grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              {fields.map(f => (
                <div key={f} style={f === "full_name" || f === "address" ? { gridColumn: "span 2" } : {}}>
                  <Field name={f} value={formValues[f]} onChange={handleChange}
                    autofilled={autofilledFields.has(f) && !!formValues[f]} error={errors[f]} />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
              <button style={S.btnGreen} onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Application →"}
              </button>
              <button style={S.btnOutline} onClick={() => setStep(1)}>← Back</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ROOT APP — manages auth state
// ════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("login"); // login | register | app
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("home");

  const handleLogin = (userData) => { setUser(userData); setScreen("app"); setPage("home"); };
  const handleLogout = () => { setUser(null); setScreen("login"); setPage("home"); };
  const handleLoginAfterRegister = (userData) => {
    setUser({ citizen_id: userData.citizen_id, full_name: userData.full_name, mobile: userData.mobile });
    setScreen("app"); setPage("home");
  };

  if (screen === "login") return <LoginPage onLogin={handleLogin} onGoRegister={() => setScreen("register")} />;
  if (screen === "register") return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8" }}>
      <div style={{ background: "#1a3a5c", padding: "12px 1.5rem", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "28px", height: "19px", background: "linear-gradient(#FF9933 33%, white 33%, white 66%, #138808 66%)", borderRadius: "2px", border: "1px solid rgba(255,255,255,0.25)" }} />
        <span style={{ color: "white", fontWeight: "700", fontSize: "14px" }}>eDistrict 2.0 — New Registration</span>
      </div>
      <RegisterPage onNavigate={(p) => { if (p === "login") setScreen("login"); }} onLoginAfterRegister={handleLoginAfterRegister} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8" }}>
      <Navbar user={user} page={page} onNavigate={setPage} onLogout={handleLogout} />
      {page === "home" && <HomePage user={user} onNavigate={setPage} />}
      {page === "apply" && <ApplyPage user={user} onNavigate={setPage} />}
    </div>
  );
}
