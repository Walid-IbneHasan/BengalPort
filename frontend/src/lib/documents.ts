import { ApiError } from "./api";
import { apiUrl } from "./config";

export type DocumentInfo = { id: string; name: string; mimeType: string; byteSize: number; createdAt: string };

// `uploadToken` is the link issued when an application is submitted; without
// it the signed-in member's (or admin's) session is used.
const authorization = (uploadToken?: string) => ({
  authorization: `Bearer ${uploadToken || localStorage.getItem("bp_token") || ""}`,
});

async function failure(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => null);
  return new ApiError(body?.error?.message || body?.message || "The request failed", body?.error?.code, undefined, response.status);
}

export async function uploadDocument(applicationId: string, file: File, uploadToken?: string): Promise<DocumentInfo> {
  const body = new FormData();
  body.append("file", file, file.name);
  const response = await fetch(`${apiUrl()}/applications/${applicationId}/documents`, { method: "POST", headers: authorization(uploadToken), body });
  if (!response.ok) throw await failure(response);
  return (await response.json()).data;
}

export async function removeDocument(documentId: string, uploadToken?: string): Promise<void> {
  const response = await fetch(`${apiUrl()}/applications/documents/${documentId}`, { method: "DELETE", headers: authorization(uploadToken) });
  if (!response.ok) throw await failure(response);
}

// Documents are private, so the file is fetched with the session and then
// handed to the browser as a download.
export async function downloadDocument(document_: DocumentInfo): Promise<void> {
  const response = await fetch(`${apiUrl()}/applications/documents/${document_.id}`, { headers: authorization() });
  if (!response.ok) throw await failure(response);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = document_.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
