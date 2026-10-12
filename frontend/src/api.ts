export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json"))
    throw new ApiError(
      response.status,
      "Respons server tidak tersedia. Coba muat ulang halaman.",
    );
  const data = await response.json();
  if (!response.ok) {
    const labels: Record<string, string> = {
      Unauthorized: "Sesi berakhir. Silakan masuk kembali.",
      Forbidden: "Anda tidak memiliki akses untuk tindakan ini.",
      managed_in_kerjabaik: "Data ini dikelola melalui Kerjabaik.",
    };
    throw new ApiError(
      response.status,
      labels[data.error] || data.error || "Permintaan gagal. Coba kembali.",
    );
  }
  return data as T;
}
export function query(
  values: Record<string, string | number | boolean | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== undefined && value !== "") params.set(key, String(value));
  return params;
}
export function exportCsv(filename: string, rows: (string | number)[][]) {
  const quote = (value: string | number) =>
    '"' +
    String(value)
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  const blob = new Blob(
    ["\uFEFF" + rows.map((row) => row.map(quote).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
