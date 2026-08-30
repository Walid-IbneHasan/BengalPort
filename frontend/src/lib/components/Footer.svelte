<script>
  import { Phone, Mail, MapPin } from "lucide-svelte";
  import { cmsContent } from "$lib/cms";
</script>

<footer>
  <div class="wrap cols">
    <div>
      <div class="foot-brand">
        <img src="/images/logo.webp" alt="Bengal Port" /><b>BENGAL PORT</b>
      </div>
      <p>{$cmsContent.footer.description}</p>
    </div>
    <div>
      <h3>Explore</h3>
      <a href="/about">About Us</a><a href="/services">Services</a><a
        href="/opportunities">Opportunities</a
      >
    </div>
    <div>
      <h3>Our Divisions</h3>
      <a href="/business">Global Business</a><a href="/education"
        >Global Education</a
      ><a href="/healthcare">Global Healthcare</a>
    </div>
    <div>
      <h3>Contact</h3>
      <p><Phone size={16} /> {$cmsContent.utility.phone}</p>
      <p><Mail size={16} /> {$cmsContent.utility.email}</p>
      <p><MapPin size={16} /> {$cmsContent.footer.address}</p>
    </div>
  </div>
  <div class="bottom wrap">
    © {new Date().getFullYear()}
    {$cmsContent.footer.copyright}
  </div>
</footer>

<style>
  footer {
    background: #102640;
    color: #dbe3ee;
    padding: 4.4rem 0 1.25rem;
    margin-top: 0;
  }
  .cols {
    display: grid;
    grid-template-columns: 1.5fr repeat(3, 1fr);
    gap: 3.1rem;
  }
  .foot-brand {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    color: white;
    font-size: 1.35rem;
  }
  .foot-brand img {
    width: 3.6rem;
    height: 3.6rem;
    border-radius: 50%;
  }
  h3 {
    color: #dfbb63;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  a {
    display: block;
    color: #dbe3ee;
    text-decoration: none;
    margin: 0.75rem 0;
    transition:
      color 0.2s,
      transform 0.2s;
  }
  a:hover {
    color: #efcb73;
    transform: translateX(0.2rem);
  }
  p {
    line-height: 1.7;
    display: flex;
    gap: 0.65rem;
    align-items: flex-start;
    color: #c4cfdb;
  }
  .bottom {
    border-top: 1px solid rgba(255, 255, 255, 0.11);
    margin-top: 2.8rem;
    padding-top: 1.25rem;
    font-size: 0.8rem;
    color: #aebdcb;
  }
  @media (max-width: 47.5rem) {
    .cols {
      grid-template-columns: 1fr 1fr;
      gap: 2.25rem;
    }
  }
  @media (max-width: 30rem) {
    .cols {
      grid-template-columns: 1fr;
    }
  }
</style>
