const BASE = "http://localhost:8000";

export const api = {
  login: async (mobile, aadhaar_last4) => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile, aadhaar_last4 }),
    });
    if (!res.ok) throw new Error("Login request failed");
    return res.json();
  },
  getServices: async () => {
    const res = await fetch(`${BASE}/api/services`);
    if (!res.ok) throw new Error("Failed to fetch services");
    return res.json();
  },
  lookupCitizen: async (mobile) => {
    const res = await fetch(`${BASE}/api/citizen/lookup/${mobile}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Lookup failed");
    return res.json();
  },
  getAutofill: async (mobile, serviceId) => {
    const res = await fetch(`${BASE}/api/autofill/${mobile}/${serviceId}`);
    if (!res.ok) throw new Error("Autofill failed");
    return res.json();
  },
  createProfile: async (data) => {
    const res = await fetch(`${BASE}/api/citizen/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to create profile");
    }
    return res.json();
  },
  submitApplication: async (citizenId, serviceId, formData) => {
    const res = await fetch(`${BASE}/api/application/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ citizen_id: citizenId, service_id: serviceId, form_data: formData }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Submission failed");
    }
    return res.json();
  },
  getApplications: async (citizenId) => {
    const res = await fetch(`${BASE}/api/citizen/${citizenId}/applications`);
    if (!res.ok) throw new Error("Failed to fetch applications");
    return res.json();
  },
};
