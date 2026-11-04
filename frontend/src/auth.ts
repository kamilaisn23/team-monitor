import { api } from "./api";

export async function startGithubLogin(callbackPath = "/dashboard") {
  const { csrfToken } = await api<{ csrfToken: string }>("/api/auth/csrf");
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/auth/signin/github";
  for (const [name, value] of Object.entries({
    csrfToken,
    callbackUrl: window.location.origin + callbackPath,
  })) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.append(input);
  }
  document.body.append(form);
  form.submit();
}
