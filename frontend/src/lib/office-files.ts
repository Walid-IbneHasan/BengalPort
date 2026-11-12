// Files in the office screens: CSV exports, private documents, signature
// images and uploads. Each is fetched with the signed-in session, because
// none of them is public.
import { ApiError } from "./api-error";
import { apiUrl } from "./config";
import { shrinkImage } from "./image-resize";

const session = () => {
  try {
    return localStorage.getItem("bp_token") || "";
  } catch {
    return "";
  }
};

async function failure(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => null);
  return new ApiError(body?.error?.message || body?.message || "The request failed", body?.error?.code, body?.error?.details, response.status);
}

// GET a private file and hand back its contents.
export async function fetchFile(path: string): Promise<Blob> {
  const response = await fetch(`${apiUrl()}${path}`, { headers: { authorization: `Bearer ${session()}` } });
  if (!response.ok) throw await failure(response);
  return response.blob();
}

// The browser saves the contents under this name.
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// A CSV export, a document's download and the like.
export async function downloadFile(path: string, fileName: string) {
  saveBlob(await fetchFile(path), fileName);
}

// Opens a private file (a PDF or a photo) in a new tab. The tab is opened
// first, while the click still counts, so the browser does not block it.
export async function openFile(path: string) {
  const tab = window.open("", "_blank");
  try {
    const url = URL.createObjectURL(await fetchFile(path));
    if (tab) tab.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}

// A private image (a signature) as an address an <img> can show.
export async function imageUrl(path: string): Promise<string> {
  return URL.createObjectURL(await fetchFile(path));
}

// POST a form with a file in it; answers with the record the server made.
// Photos are made smaller first, so they upload quickly and fit the limit.
export async function uploadForm<T>(path: string, fields: Record<string, string>, file: File, fileField = "file"): Promise<T> {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.append(key, value);
  const ready = await shrinkImage(file);
  body.append(fileField, ready, ready.name);
  const response = await fetch(`${apiUrl()}${path}`, { method: "POST", headers: { authorization: `Bearer ${session()}` }, body });
  if (!response.ok) throw await failure(response);
  return (await response.json()).data as T;
}

// "photo 1.jpg" stays readable; anything risky in a file name is replaced.
export const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-").replace(/\s+/g, " ").trim() || "file";
