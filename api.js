// Thin fetch wrapper for the CricketIQ backend.
// Keeps the same exported surface (get, post, upload, reportUrl) so every
// page can keep calling it exactly as before — only the internals are hardened.

const base = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function toError(response, path) {
  let detail = "";
  try {
    const body = await response.clone().json();
    detail = body?.message || body?.error || "";
  } catch {
    // response wasn't JSON — ignore and fall back to the status text
  }
  const message =
    detail || `${response.status} ${response.statusText || "Request failed"} — ${path}`;
  return new Error(message);
}

export const get = async (path) => {
  const response = await fetch(base + path);
  if (!response.ok) throw await toError(response, path);
  return response.json();
};

export const post = async (path, body) => {
  const response = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await toError(response, path);
  return response.json();
};

export const upload = async (files) => {
  const formData = new FormData();
  [...files].forEach((file) => formData.append("files", file));
  const response = await fetch(base + "/upload", { method: "POST", body: formData });
  if (!response.ok) throw await toError(response, "/upload");
  return response.json();
};

export const reportUrl = base + "/generate-report";