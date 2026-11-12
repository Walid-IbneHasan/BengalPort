<script lang="ts">
  import { ArrowLeft, ArrowRight, Check, MapPin, Star } from "lucide-svelte";
  import { applyHref } from "$lib/apply-route";
  import { fieldInstitutions, studyField, type FieldKey } from "$lib/education";
  import { flagCode } from "$lib/flags";
  import { initials, stars } from "$lib/reviews";
  import { reveal } from "$lib/reveal";
  import { shortDate } from "$lib/datetime";
  import Slideshow from "$lib/components/Slideshow.svelte";

  // One option of the Education page on a page of its own: a field of study
  // (what we do, the universities we work with, their subjects, and what to
  // know before applying) or the student reviews.
  let { data } = $props();
  let content = $derived(data.content);
  let isField = $derived(data.field !== "reviews");
  let key = $derived(data.field as FieldKey);
  let field = $derived(isField ? content.fields[key] : null);
  let universities = $derived(isField ? fieldInstitutions<any>(data.records, key) : []);
  // The programmes each university offers in this field; all of them when it
  // was listed here by hand and none of its programmes looks like this field.
  const programmesOf = (record: any) => {
    const all = record.programs ?? [];
    const here = all.filter((programme: any) => studyField(programme) === key);
    return here.length ? here : all;
  };
  let others = $derived(
    (["medical", "engineering", "general", "reviews"] as const)
      .filter((name) => name !== data.field)
      .map((name) => (name === "reviews" ? { href: "/education/reviews", title: content.reviews.title, tagline: content.reviews.tagline, image: content.reviews.image } : { href: `/education/${name}`, ...content.fields[name] })),
  );
  let title = $derived(isField ? `${field!.title} — Study abroad` : content.reviews.title);
  let summary = $derived(isField ? field!.description : content.reviews.description);
  const flag = (country: string) => {
    const code = flagCode(country);
    return code ? `https://flagcdn.com/w40/${code}.png` : "";
  };
</script>

<svelte:head>
  <title>{title} — Bengal Port</title>
  <meta name="description" content={summary} />
</svelte:head>

<div class="field-page">
  <section class="intro">
    <div class="wrap intro-grid">
      <div class="copy">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="/education"><ArrowLeft size={16} /> Global Education</a></nav>
        {#if field}
          <h1>{field.heading}</h1>
          <p class="lede">{field.description}</p>
          <div class="actions">
            <a class="btn" href={applyHref("EDUCATION")}>{field.cta}<ArrowRight size={18} /></a>
            <a class="btn secondary" href={applyHref("EDUCATION", "enquiry", field.heading)}>{content.labels.askQuestion}</a>
          </div>
        {:else}
          <h1>{content.reviews.heading}</h1>
          <p class="lede">{content.reviews.description}</p>
          <div class="actions"><a class="btn" href="/dashboard">{content.reviews.cta}<ArrowRight size={18} /></a></div>
        {/if}
      </div>
      <figure class="picture">
        <img src={field ? field.photo : content.reviews.photo} alt="" width="1200" height="670" decoding="async" />
      </figure>
    </div>
  </section>

  {#if field}
    <section class="section help" use:reveal>
      <div class="wrap help-grid">
        <div>
          <h2>How we help</h2>
          <ul class="points">
            {#each field.points as point}<li><i><Check size={15} /></i>{point}</li>{/each}
          </ul>
        </div>
        <div class="subjects-box">
          <h2>{content.labels.popularSubjects}</h2>
          <ul class="subjects">{#each field.subjects as subject}<li>{subject}</li>{/each}</ul>
        </div>
      </div>
    </section>

    <section class="section universities" id="universities">
      <div class="wrap">
        <header class="section-top">
          <h2>Universities we work with</h2>
          <p>{universities.length ? `${universities.length} ${universities.length === 1 ? "university" : "universities"} for ${field.title.toLowerCase()}, with the subjects each offers.` : "Our list for this field is being updated. Ask us and we will suggest suitable universities for your results and budget."}</p>
        </header>
        {#if universities.length}
          <div class="entries">
            {#each universities as university (university.id ?? university.name)}
              {@const programmes = programmesOf(university)}
              <article class="entry" use:reveal>
                <Slideshow photos={university.photos} label={university.name} />
                <div class="entry-body">
                  <h3>{university.name}</h3>
                  <p class="place">{#if flag(university.country)}<img src={flag(university.country)} alt="" width="20" height="15" loading="lazy" referrerpolicy="no-referrer" />{:else}<MapPin size={15} />{/if}{university.country}</p>
                  <p class="about">{university.description}</p>
                  {#if programmes.length}
                    <h4>Subjects</h4>
                    <ul class="programmes">
                      {#each programmes as programme}
                        <li><b>{programme.title}</b><span>{programme.level}{programme.deadline ? ` · Apply by ${shortDate(programme.deadline)}` : ""}</span></li>
                      {/each}
                    </ul>
                  {/if}
                  <a class="ask" href={applyHref("EDUCATION", "enquiry", university.name)}>Ask about {university.name}<ArrowRight size={16} /></a>
                </div>
              </article>
            {/each}
          </div>
        {:else}
          <a class="btn" href={applyHref("EDUCATION", "enquiry", field.heading)}>{content.labels.askAboutInstitutions}<ArrowRight size={18} /></a>
        {/if}
      </div>
    </section>

    {#if field.info.length}
      <section class="section know" use:reveal>
        <div class="wrap">
          <h2>Good to know</h2>
          <dl class="facts">
            {#each field.info as fact}<div><dt>{fact.title}</dt><dd>{fact.body}</dd></div>{/each}
          </dl>
        </div>
      </section>
    {/if}
  {:else}
    <section class="section all-reviews">
      <div class="wrap">
        <p class="invite">{content.reviews.invite}</p>
        {#if data.reviews.length}
          <ul class="review-grid">
            {#each data.reviews as review (review.id)}
              <li class="review" use:reveal>
                <div class="stars" aria-label={`${review.rating} out of 5`}>{#each stars(review.rating) as filled}<Star size={16} fill={filled ? "currentColor" : "none"} />{/each}</div>
                <blockquote>{review.body}</blockquote>
                <footer>
                  {#if review.photoUrl}<img src={review.photoUrl} alt="" width="44" height="44" loading="lazy" />{:else}<span class="initials">{initials(review.name)}</span>{/if}
                  <div><b>{review.name}</b>{#if review.detail}<small>{review.detail}</small>{/if}</div>
                </footer>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="empty">{content.labels.reviewsEmpty}</p>
        {/if}
      </div>
    </section>
  {/if}

  <section class="section more" use:reveal>
    <div class="wrap">
      <h2>Explore more</h2>
      <div class="more-grid">
        {#each others as other}
          <a class="more-card" href={other.href}>
            {#if other.image}<img src={other.image} alt="" width="640" height="320" loading="lazy" decoding="async" />{/if}
            <span><b>{other.title}</b><small>{other.tagline}</small></span>
            <ArrowRight size={18} />
          </a>
        {/each}
      </div>
    </div>
  </section>
</div>

<style>
  .field-page{background:#fafaf7}
  .intro{padding:clamp(6.5rem,12vw,8.5rem) 0 clamp(2.5rem,6vw,4rem);background:linear-gradient(180deg,#f3efe4 0%,#fafaf7 100%)}
  .intro-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:clamp(1.5rem,5vw,4rem);align-items:center}
  .crumbs a{display:inline-flex;align-items:center;gap:.35rem;color:#8a6417;font-size:.88rem;font-weight:750;text-decoration:none}
  .crumbs a:hover{text-decoration:underline}
  h1{margin:.9rem 0 1rem;font-size:clamp(2rem,5vw,3.4rem);line-height:1.08;letter-spacing:-.03em;color:var(--heading);text-wrap:balance}
  .lede{max-width:36rem;margin:0;font-size:clamp(1rem,1.6vw,1.12rem);line-height:1.7;color:var(--text)}
  .actions{display:flex;flex-wrap:wrap;gap:.8rem;margin-top:1.8rem}
  .actions .btn{display:inline-flex;align-items:center;gap:.5rem}
  .picture{margin:0;border-radius:1.4rem;overflow:hidden;box-shadow:var(--shadow-md);aspect-ratio:16/10;background:#e5e9ec}
  .picture img{width:100%;height:100%;object-fit:cover}
  h2{margin:0 0 1.1rem;font-size:clamp(1.45rem,3vw,2rem);letter-spacing:-.02em;color:var(--heading)}
  .help-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:clamp(1.5rem,5vw,4rem);align-items:start}
  .points{list-style:none;margin:0;padding:0;display:grid;gap:.85rem}
  .points li{display:flex;gap:.75rem;align-items:flex-start;font-size:1.02rem;line-height:1.55;color:var(--text)}
  .points i{display:grid;place-items:center;flex:none;width:1.65rem;height:1.65rem;margin-top:.05rem;border-radius:50%;background:#07182f;color:#e1b34a}
  .subjects-box{padding:1.4rem;border-radius:1.1rem;background:#fff;box-shadow:var(--shadow-sm)}
  .subjects-box h2{font-size:1.1rem}
  .subjects{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.5rem}
  .subjects li{padding:.45rem .8rem;border-radius:2rem;background:var(--gold-wash);color:#5b4a22;font-size:.88rem;font-weight:700}
  .section-top{max-width:46rem;margin-bottom:1.6rem}
  .section-top p{margin:-.4rem 0 0;color:var(--muted);line-height:1.6}
  .entries{display:grid;gap:clamp(1.25rem,3vw,2rem)}
  .entry{display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);border-radius:1.25rem;overflow:hidden;background:#fff;box-shadow:var(--shadow-sm)}
  .entry :global(.slides){height:100%;min-height:16rem}
  .entry-body{padding:clamp(1.25rem,3vw,2rem)}
  h3{margin:0;font-size:clamp(1.2rem,2.4vw,1.5rem);color:var(--heading)}
  .place{display:flex;align-items:center;gap:.45rem;margin:.45rem 0 0;color:var(--muted);font-weight:700;font-size:.92rem}
  .place img{width:20px;height:15px;object-fit:cover;border-radius:2px;box-shadow:0 0 0 1px #0000001a}
  .about{margin:.9rem 0 0;line-height:1.65;color:var(--text);white-space:pre-line}
  h4{margin:1.2rem 0 .5rem;font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;color:#8a6417}
  .programmes{list-style:none;margin:0;padding:0;display:grid;gap:.45rem}
  .programmes li{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.15rem 1rem;padding:.55rem 0;border-bottom:1px solid var(--line)}
  .programmes b{color:var(--heading)}
  .programmes span{color:var(--muted);font-size:.88rem}
  .ask{display:inline-flex;align-items:center;gap:.4rem;margin-top:1.2rem;color:#9b6b16;font-weight:800;text-decoration:none}
  .ask:hover{text-decoration:underline}
  .facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr));gap:1rem;margin:0}
  .facts div{padding:1.3rem;border-radius:1rem;background:#fff;box-shadow:var(--shadow-sm)}
  .facts dt{font-weight:800;color:var(--heading)}
  .facts dd{margin:.45rem 0 0;line-height:1.6;color:var(--text)}
  .invite{max-width:46rem;margin:0 0 1.8rem;color:var(--muted);line-height:1.65}
  .review-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,20rem),1fr));gap:1.1rem}
  .review{display:flex;flex-direction:column;padding:1.4rem;border-radius:1.1rem;background:#fff;box-shadow:var(--shadow-sm)}
  .stars{display:flex;gap:.15rem;color:#d19b2d}
  blockquote{flex:1;margin:.8rem 0 1.1rem;line-height:1.65;color:var(--text);white-space:pre-line}
  .review footer{display:flex;align-items:center;gap:.7rem}
  .review footer img,.initials{width:2.75rem;height:2.75rem;border-radius:50%;object-fit:cover;flex:none}
  .initials{display:grid;place-items:center;background:#07182f;color:#e1b34a;font-weight:800}
  .review b{display:block;color:var(--heading)}
  .review small{display:block;color:var(--muted)}
  .empty{padding:2rem;border-radius:1rem;background:#fff;color:var(--muted);text-align:center}
  .more{padding-top:0}
  .more-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}
  .more-card{display:flex;align-items:center;gap:.9rem;padding:.8rem 1rem .8rem .8rem;border-radius:1rem;background:#fff;box-shadow:var(--shadow-sm);color:var(--heading);text-decoration:none;transition:transform 180ms var(--ease-out),box-shadow 180ms ease}
  .more-card img{width:4.25rem;height:3.25rem;border-radius:.6rem;object-fit:cover;flex:none}
  .more-card span{flex:1;min-width:0}
  .more-card b{display:block}
  .more-card small{display:block;color:var(--muted);font-size:.82rem}
  @media(hover:hover) and (pointer:fine){.more-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-md)}}
  @media(max-width:60rem){
    .intro-grid,.help-grid{grid-template-columns:1fr}
    .entry{grid-template-columns:1fr}
    .entry :global(.slides){height:auto;min-height:0}
    .more-grid{grid-template-columns:1fr}
  }
  @media(prefers-reduced-motion:reduce){.more-card{transition:none}}
</style>
