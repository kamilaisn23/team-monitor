import { api } from "./api";

async function submitAuthForm(
  action: string,
  fields: Record<string, string>,
) {
  const { csrfToken } = await api<{ csrfToken: string }>("/api/auth/csrf");
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  for (const [name, value] of Object.entries({ csrfToken, ...fields })) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.append(input);
  }
  document.body.append(form);
  form.submit();
}

export async function startGithubLogin(callbackPath = "/dashboard") {
  await submitAuthForm("/api/auth/signin/github", {
    callbackUrl: window.location.origin + callbackPath,
  });
}

export async function startDevLogin(
  login: string,
  callbackPath = "/dashboard",
) {
  await submitAuthForm("/api/auth/callback/dev-github", {
    callbackUrl: window.location.origin + callbackPath,
    login,
  });
}
