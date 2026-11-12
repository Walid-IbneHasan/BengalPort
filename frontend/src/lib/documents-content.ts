// What every printed document and PDF is printed on, and how it is signed:
// the letterhead behind the page (Bengal Port's own design, drawn with the
// logo, phone, email and address from Website content, unless a picture of
// another letterhead is uploaded), the customer's signature at the bottom
// left and the owner's at the bottom right. Edited under "Documents and
// PDFs" in the admin; the server holds nothing until it is first saved.
import { fillMissing } from "./content-fields";

export type DocumentsContent = {
  letterhead: { backgroundImage: string; subtitle: string; tagline: string; website: string };
  signatures: { customerLabel: string; ownerLabel: string; ownerName: string; ownerTitle: string; signatureImage: string };
  closing: { thanks: string };
};

export const defaultDocumentsContent: DocumentsContent = {
  letterhead: {
    backgroundImage: "",
    subtitle: "Business · Education · Healthcare · Umrah",
    tagline: "Connecting Bengal to the World",
    website: "www.bengalport.com",
  },
  signatures: {
    customerLabel: "Customer's signature",
    ownerLabel: "Authorised signature",
    ownerName: "",
    ownerTitle: "For Bengal Port",
    signatureImage: "",
  },
  closing: { thanks: "Thank you for choosing Bengal Port." },
};

export const documentsContentFrom = (saved: unknown): DocumentsContent => fillMissing(defaultDocumentsContent, saved);
