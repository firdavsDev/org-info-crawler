const API_BASE = "/api";

function getAuthHeader() {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Basic ${token}` } : {};
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...(options.headers || {}),
    },
  });
  return res;
}

export async function login(username, password) {
  const token = btoa(`${username}:${password}`);
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Basic ${token}` },
  });
  if (!res.ok) {
    throw new Error("Invalid credentials");
  }
  const data = await res.json();
  localStorage.setItem("auth_token", token);
  localStorage.setItem("auth_username", data.username);
  return data;
}

export function logout() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_username");
}

export function getUsername() {
  return localStorage.getItem("auth_username") || "";
}
