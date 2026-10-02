<script lang="ts">
  import LegalPage from "$lib/components/LegalPage.svelte";
  import { cmsContent } from "$lib/cms";
</script>

<svelte:head>
  <title>Privacy Policy — Bengal Port</title>
  <meta name="description" content="How Bengal Port collects, uses, shares and protects the information you give us." />
</svelte:head>

<LegalPage eyebrow="PRIVACY POLICY" title="How we handle your information." updated="2 October 2026">
  <h2>Who we are</h2>
  <p>
    Bengal Port, based at {$cmsContent.footer.address}, helps people and businesses with international business,
    education, healthcare and Umrah services. This policy explains what we collect through this website and how we use it.
  </p>

  <h2>Information we collect</h2>
  <ul>
    <li><b>Contact details</b> you give us in an enquiry: your name, phone number, email address and message.</li>
    <li>
      <b>Application details</b> you enter in an application form. Depending on the service these include your date of
      birth, nationality, address, passport details, education and employment history, travel plans, family and sponsor
      information, and emergency contacts.
    </li>
    <li>
      <b>Health information</b> in healthcare applications, such as your diagnosis, symptoms, medical history and
      current treatment.
    </li>
    <li><b>Account details</b> if you create a member account: your name, email address, phone number and a protected (hashed) copy of your password, or your Google account identifier and profile picture if you sign in with Google.</li>
    <li><b>Payment records</b> for payments recorded against your application, and the receipts issued for them.</li>
    <li><b>Technical information</b> our servers record when you use the site, such as your IP address and the time of each request.</li>
  </ul>
  <p>
    This website does not use advertising or tracking cookies. If you sign in, your browser stores a sign-in token so
    that you stay signed in on that device.
  </p>

  <h2>How we use it</h2>
  <ul>
    <li>To answer your enquiry and contact you about it.</li>
    <li>To assess and process your application and arrange the service you asked for.</li>
    <li>To record payments and issue receipts.</li>
    <li>To send account emails such as verification codes and sign-in codes.</li>
    <li>To keep the website secure and prevent misuse.</li>
    <li>To meet legal and regulatory obligations.</li>
  </ul>

  <h2>Who we share it with</h2>
  <p>We share only what is needed to deliver the service you requested, with:</p>
  <ul>
    <li>universities, colleges and admission offices, for education applications;</li>
    <li>hospitals and doctors, for healthcare applications;</li>
    <li>suppliers, factories and event organisers, for business visits;</li>
    <li>airlines, hotels, transport providers, visa centres and government authorities, for travel and visas;</li>
    <li>companies that host this website and deliver our email.</li>
  </ul>
  <p>We do not sell your information, and we do not share it for advertising.</p>

  <h2>Passport and health information</h2>
  <p>
    Passport and health details are sensitive. We use them only for the application you submitted, and access is
    limited to the Bengal Port staff handling it. By submitting an application you agree to this use and to the sharing
    described above.
  </p>

  <h2>How long we keep it</h2>
  <p>
    We keep enquiries, applications and payment records for as long as needed to provide the service, deal with
    follow-up requests and meet our legal and accounting obligations.
  </p>

  <h2>Your choices</h2>
  <p>
    You can ask us for a copy of the information we hold about you, ask us to correct it, or ask us to delete it. We
    will delete it unless we are required to keep it by law or need it for an ongoing application or payment. To make a
    request, email <a href={`mailto:${$cmsContent.utility.email}`}>{$cmsContent.utility.email}</a>. Members can update
    their name, phone number and password on the <a href="/profile">Account &amp; security</a> page.
  </p>

  <h2>Security</h2>
  <p>
    Access to submitted information is restricted to authorised administrators, and passwords are stored in hashed
    form. No website can guarantee absolute security, so please contact us immediately if you believe your account or
    information has been misused.
  </p>

  <h2>Children</h2>
  <p>Applications for anyone under 18 must be completed by a parent or legal guardian.</p>

  <h2>Changes and contact</h2>
  <p>
    We may update this policy; the date at the top shows the latest version. Questions about this policy can be sent to
    <a href={`mailto:${$cmsContent.utility.email}`}>{$cmsContent.utility.email}</a> or through our
    <a href="/contact">contact page</a>.
  </p>
</LegalPage>
