<script lang="ts">
  import LegalPage from "$lib/components/LegalPage.svelte";
  import { cmsContent } from "$lib/cms";
</script>

<svelte:head>
  <title>Terms of Use — Bengal Port</title>
  <meta name="description" content="The terms that apply when you use the Bengal Port website and services." />
</svelte:head>

<LegalPage eyebrow="TERMS OF USE" title="Terms for using Bengal Port." updated="2 October 2026">
  <h2>Our role</h2>
  <p>
    Bengal Port provides guidance, coordination and facilitation for international business, education, healthcare and
    Umrah services. We are not a university, hospital, airline, embassy or visa authority. Admission, treatment, visa
    and travel decisions are made by those organisations, and we cannot guarantee their outcome.
  </p>

  <h2>Information you give us</h2>
  <p>
    You agree to provide information that is accurate, complete and your own to share, including passport, academic
    and medical details. Inaccurate information can delay or prevent your application, and we are not responsible for
    the consequences of incorrect information you supply.
  </p>

  <h2>Enquiries and applications</h2>
  <p>
    Submitting an enquiry or application is a request for our service, not a confirmed booking, admission or
    appointment. A service is confirmed only when we confirm it to you in writing.
  </p>

  <h2>Fees and payments</h2>
  <p>
    Fees are those stated in the quotation or agreement we give you for your service. Payments are recorded against
    your application and a receipt is issued for each one. Refunds and cancellations follow the terms of that quotation
    or agreement and the policies of the institutions, hospitals, airlines and other providers involved.
  </p>

  <h2>Member accounts</h2>
  <p>
    You are responsible for keeping your password confidential and for activity under your account. Tell us promptly
    if you suspect unauthorised use.
  </p>

  <h2>Acceptable use</h2>
  <p>
    Do not misuse the website: no false or automated submissions, no attempts to access other people's information,
    and no interference with how the site works.
  </p>

  <h2>Website content</h2>
  <p>
    Information on this website, including opportunities, programmes, partner details and cost estimates, is general
    guidance and can change. Please confirm details with our team before making decisions or payments.
  </p>

  <h2>Liability</h2>
  <p>
    To the extent permitted by law, Bengal Port is not liable for decisions, delays, cancellations or losses caused by
    third parties such as institutions, hospitals, carriers and authorities, or by events outside our control.
  </p>

  <h2>Privacy</h2>
  <p>Our <a href="/privacy">Privacy Policy</a> explains how we handle the information you give us.</p>

  <h2>Governing law and contact</h2>
  <p>
    These terms are governed by the laws of Bangladesh. We may update them; the date at the top shows the latest
    version. Questions can be sent to <a href={`mailto:${$cmsContent.utility.email}`}>{$cmsContent.utility.email}</a>.
  </p>
</LegalPage>
