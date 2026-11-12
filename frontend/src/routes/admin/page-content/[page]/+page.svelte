<script lang="ts">
  import { page } from '$app/state';
  import DivisionContentEditor from '$lib/components/DivisionContentEditor.svelte';
  import { defaultAboutContent, defaultApplyContent, defaultContactContent, defaultLoginContent, defaultOpportunitiesContent, defaultPayContent, defaultPrivacyContent, defaultServicesContent, defaultTermsContent } from '$lib/site-pages';
  import { defaultDocumentsContent } from '$lib/documents-content';

  const legalNote = "Separate paragraphs with a blank line. Start a line with - and a space for a bullet point. Write **words** for bold and [words](/contact) for a link. {email} and {address} show the site's email and office address.";

  const pages = {
    about: { title: 'About', fallback: defaultAboutContent, note: '' },
    services: { title: 'Services', fallback: defaultServicesContent, note: 'Each division keeps its own icon and link; its title, image and list of services are edited here.' },
    contact: {
      title: 'Contact',
      fallback: defaultContactContent,
      note: 'The phone number, email and office address shown on the Contact page are the ones in the site header and footer. Change them under Website content.',
    },
    opportunities: { title: 'Opportunities', fallback: defaultOpportunitiesContent, note: 'The opportunities themselves and their pictures are managed under Opportunities in the sidebar. Here is the wording around them.' },
    apply: { title: 'Apply', fallback: defaultApplyContent, note: 'The questions inside the forms stay as they are, because the answers are checked and stored against them.' },
    pay: { title: 'Pay', fallback: defaultPayContent, note: '' },
    login: { title: 'Sign-in', fallback: defaultLoginContent, note: 'The panel beside the sign-in form on large screens, and the line under its heading.' },
    privacy: { title: 'Privacy Policy', fallback: defaultPrivacyContent, note: legalNote },
    terms: { title: 'Terms of Use', fallback: defaultTermsContent, note: legalNote },
    documents: { title: 'Documents and PDFs', fallback: defaultDocumentsContent, note: 'Every printed page and PDF (invoices, receipts, applications, enquiries and Hisab Kitab) is printed on the letterhead below. The customer signs at the bottom left and the owner at the bottom right. Upload a picture of the owner’s signature on a white or transparent background, or leave it empty to sign by hand.' },
  };
  const slug = $derived(((page.params.page ?? '') in pages ? page.params.page : 'about') as keyof typeof pages);
</script>

<svelte:head><title>{pages[slug].title} Page — Bengal Port Admin</title></svelte:head>
<!-- Re-created when the sidebar switches between pages. -->
{#key slug}<DivisionContentEditor division={slug} fallback={pages[slug].fallback} note={pages[slug].note} lists />{/key}
