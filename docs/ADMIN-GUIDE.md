# Bengal Port Admin Guide — বেঙ্গল পোর্ট অ্যাডমিন নির্দেশিকা

This guide explains every part of the Bengal Port admin: what each page is for, every section and button on it, what changes when you use it, and how the pages are connected. The English guide comes first; the full Bangla guide follows it.

এই নির্দেশিকায় বেঙ্গল পোর্ট অ্যাডমিনের প্রতিটি অংশ ব্যাখ্যা করা হয়েছে। প্রথমে ইংরেজি, তারপর সম্পূর্ণ বাংলা নির্দেশিকা দেওয়া আছে। [বাংলা অংশে যান](#বাংলা-নির্দেশিকা)

Written for the version of 12 November 2026.

---

# English guide

## Contents

1. [Signing in, roles and permissions](#1-signing-in-roles-and-permissions)
2. [The admin screen](#2-the-admin-screen)
3. [How everything is connected](#3-how-everything-is-connected)
4. [Words used in the admin](#4-words-used-in-the-admin)
5. [Office pages](#5-office-pages)
   - [5.1 Dashboard](#51-dashboard) · [5.2 Customers](#52-customers) · [5.3 Deals](#53-deals) · [5.4 Invoices](#54-invoices) · [5.5 Collections](#55-collections) · [5.6 Finance](#56-finance) · [5.7 Hisab Kitab](#57-hisab-kitab) · [5.8 Documents](#58-documents) · [5.9 Tasks](#59-tasks) · [5.10 Approvals](#510-approvals) · [5.11 Notifications](#511-notifications) · [5.12 Audit log](#512-audit-log) · [5.13 Office settings](#513-office-settings)
6. [Website pages](#6-website-pages)
7. [My profile](#7-my-profile)
8. [How the books work](#8-how-the-books-work)
9. [Things that happen by themselves](#9-things-that-happen-by-themselves)
10. [Everyday tasks, step by step](#10-everyday-tasks-step-by-step)
11. [What changes where](#11-what-changes-where)
12. [Still to be set up](#12-still-to-be-set-up)

---

## 1. Signing in, roles and permissions

### Signing in
Staff sign in at **/login** with their email and password (or Google, if their Google email is the same as their account). Staff go straight to the admin (**/admin**). A new staff account made by the Super Admin gets a temporary password by email and must choose its own password at the first sign-in.

### Roles
Every account has one role. The role decides which pages appear in the left menu and which buttons appear on each page. The server checks the same rules, so hiding a button is never the only protection.

| Role | Meant for | In short |
|---|---|---|
| **Super Admin / CEO** (ADMIN) | The owner | Can see and do everything, always. Cannot be limited. Decides what the other roles may do. |
| **Manager** | Runs the day-to-day work | Customers (including passport details), deals, invoices (create, change, cancel, share, sign), tasks, documents, the money figures. Can see payments but not record them. No Hisab Kitab or Finance. |
| **Accountant** | Keeps the money right | Payments (record, apply, refund), invoices (including approving cancellations and credit notes), Finance, Hisab Kitab, approvals. Can see customers and deals, not change them. |
| **Employee** | Works with customers | Their own customers, tasks and documents; can see deals and invoices; the dashboard without money figures. |
| **Moderator** | Looks after the website | Website content, directory pages, reviews, enquiries and applications; can make invoices. No office pages, never deletes. |
| **Member** (USER) | Website visitors with an account | No admin at all. Uses the member dashboard on the website. |

### Default permissions
A permission is a thing (resource) plus an action: **See**, **Add**, **Change**, **Delete**, **Export**, **Approve**, **Cancel**, **Use**. The Super Admin can change any of these under **Office settings → Roles and permissions**. The table shows the standard settings.

| Thing | Manager | Accountant | Employee | Moderator |
|---|---|---|---|---|
| Dashboard | See | See | See | — |
| Money figures (totals, what customers owe, deal values) | See | See | — | — |
| Customers | See, Add, Change, Export | See | See, Add, Change (own) | — |
| Passport details | See | — | — | — |
| Deals | See, Add, Change, Cancel | See | See (own) | — |
| Invoices | See, Add, Change, Cancel, Export | See, Add, Change, Approve, Export | See | See, Add |
| Authority signature | Use | Use | — | — |
| Payments | See | See, Add, Change, Approve, Export | — | — |
| Accounts (Finance) | — | See, Add, Change, Export | — | — |
| Hisab Kitab | — | See, Add, Change | — | — |
| Documents | See, Add, Change, Export | See | See, Add | — |
| Tasks | See, Add, Change, Delete | See, Add, Change | See, Add, Change (own) | — |
| Approvals | See all requests | See all, Approve | — | — |
| Users | See | — | — | — |
| Website: enquiries, applications | See, Change | — | — | See, Change |
| Website: content, directory, media, reviews | — | — | — | See, Add, Change |

Everyone on the staff can open **Notifications** and **Approvals** (to follow their own requests).

### Sensitive permissions
These are marked with a shield in Office settings, because they open money, identity or signing powers: Money figures, Passport details, Authority signature (Use and Change), Documents Export, every Approve, every Delete, Roles, Users Change, Settings.

### Who sees which records
- **Employees** see only the customers given to them, the tasks given to them or made by them, and the deals of their customers.
- **Staff tied to a branch** see only that branch's customers, deals and figures, unless "All branches" is ticked for them (Office settings → Staff). The Super Admin always sees everything.
- If a role cannot open a page, the page shows **"Your role cannot open this page"** with a link to the first page it can open.

---

## 2. The admin screen

- **Left menu** (on phones, the ☰ button at the top left opens it). It has two groups:
  - **Office**: Dashboard, Customers, Deals, Invoices, Collections, Finance, Hisab Kitab, Documents, Tasks, Approvals, Notifications, Audit log, Office settings, and **Admin guide** (Super Admin only): this guide inside the admin, with an **EN / BN** switch at the top to read it in English or in Bangla.
  - **Website**: Enquiries, Applications, Opportunities, Suppliers, Factories, Education, Healthcare, Users, Website payments, Receipts, Reviews, Website content, Media library, the page editors (Business, Education, Healthcare, Umrah, About, Services, Contact, Opportunities, Apply, Pay, Sign-in, Privacy Policy, Terms of Use), Documents and PDFs, Settings.
  - Only the pages your role may open are shown.
- **Notification count**: the number beside "Notifications" (and on the bell at the top on phones) is how many unread notifications you have. It is checked every minute while the tab is open, and at once when you come back to the tab.
- **Bottom of the menu**: your role, **My profile**, **View public website**, **Sign out**.
- **Side panels**: most "Add", "New" and "Details" buttons open a panel from the right (full screen on phones). Close it with ✕, the Escape key, or by clicking beside it. The save buttons are at the bottom of the panel; if something is wrong, the reason is shown right above them.
- **"Are you sure?" boxes**: deleting or cancelling asks first, in the site's own box. Cancel keeps everything as it was.
- **Messages**: a short green message at the top confirms what was saved; a red one explains what went wrong.

---

## 3. How everything is connected

```
WEBSITE                                OFFICE
Visitor ── enquiry ──► Enquiries
Visitor ── application ──► Applications ──"Add to customers"──► Customer (C-000001)
        └─ pays online (bKash/Nagad) ──► Website payments ──► Receipt ──► Hisab Kitab (income)
                                                                 │
                                           Customer ──► Deal (D-000001: services, price, timeline)
                                                          │   └─ Print agreement
                                                          ▼
                                           Invoice (INV-000001) ── issue ──► signed, numbered, locked
                                                          │   ├─ Share by WhatsApp (link for 30 days)
                                                          │   ├─ Revise (new version) / Credit note / Cancel
                                                          ▼
                                           Collections: Payment ──► Receipt (BPR-…)
                                                          │   └─ money not applied = customer's advance
                                                          ▼
                                           Deal "Mark completed" ──► revenue earned
Hisab Kitab entries (rent, salaries, walk-in fees) ───────────┐
Every money step above ───────────────────────────────────────┴──► Finance (journal, reports) ──► Dashboard
Documents (expiry) · Tasks (due) · Invoices (due/overdue) · Deals (deadline) ──► Notifications
Cancel / credit note / refund / reversal by someone without "Approve" ──► Approvals
Every change ──► Audit log
```

In words:
1. People reach Bengal Port through the website (**Enquiries**, **Applications**, online payments) or walk into the office.
2. Anyone you do business with becomes a **Customer**. A website application can be turned into a customer with one click.
3. What a customer buys is a **Deal**: the services, the price, the timeline and what each side promises. The deal prints as a **service agreement**.
4. The deal becomes an **Invoice**, a bill asking for money. Issuing it signs it, numbers it and locks it.
5. Money the customer pays is recorded under **Collections** as a **Payment**, which gets a **Receipt**. A payment is split across invoices; what is left over is kept as the customer's **advance**.
6. Day-to-day money not tied to an invoice (rent, salaries, a walk-in consultation fee) goes into **Hisab Kitab**.
7. Every step that involves money is written into the books (**Finance**) automatically. The **Dashboard** reads its figures from the books.
8. **Notifications** remind the right people about due invoices, follow-ups, deadlines and expiring documents. Risky actions wait in **Approvals** for a second person. The **Audit log** records everything.

---

## 4. Words used in the admin

| Word | Meaning |
|---|---|
| **Customer** | A person or company you do business with, with a number like **C-000012**. Not the same as a *user* (an account that signs in). One person can be both. |
| **Lead** | A customer who has not bought anything yet (customer status). |
| **Deal** | What a customer agreed to buy: services, price, timeline, commitments, terms. Number like **D-000034**. |
| **Invoice** | A bill: "you owe us this much, by this date". Number like **INV-000056**. Issuing it does not mean money arrived. |
| **Draft** | An invoice not yet issued. It can be changed freely and has no effect on the books. |
| **Issue** | Turning a draft into a real invoice: it is numbered, signed with the authority signature and locked. |
| **Revision / version** | A change to an issued invoice. The old version is kept, with the reason; the new one gets the next version number. |
| **Credit note** | A reduction of what is owed on an issued invoice (a discount or waiver). Number like **CN-000003**. |
| **Payment** | Money a customer actually paid. Recorded under Collections (office) or Website payments (online). |
| **Receipt** | Proof of a payment, for the customer. Number like **BPR-2026-HXW4XK2**. |
| **Advance** | Money a customer paid that is not yet put against an invoice. The company holds it for them, and owes it back until the work is done. |
| **Hisab Kitab entry (transaction)** | One line in the daily cash book: money that came in or went out. |
| **Category** | The kind of a Hisab Kitab entry (Rent, Salaries, Tuition fees…). Each category has its own account in the books. |
| **Unpaid bill** | A Hisab Kitab expense saved as "Not paid yet": the company owes it. |
| **Revenue earned** | Income that counts as earned: Hisab Kitab income, website payments, and invoiced work once its deal is completed. |
| **Invoiced, not yet earned** | Issued invoices whose work is not finished yet (deferred revenue). |
| **Owed to us** | What customers still owe on issued invoices (receivables). |
| **Journal entry** | The double-entry record behind every money step. Number like **JE-000101**. Never deleted; a mistake is undone by a **reversal**. |
| **Debit / Credit** | The two sides of every journal entry. They must always be equal. |
| **Money account** | Where money is kept: Cash in hand, Bank account, bKash, Nagad (and any others you add). |
| **Exchange rate** | Taka for one unit of a foreign currency (for example 1 USD = ৳122.50). The books are kept in taka. |
| **Branch** | An office of the company (Head office is made automatically). |
| **Approval** | A request waiting for a second person to decide. |

---

## 5. Office pages

Each page below shows: **Purpose**, **Who can open it**, **Sections and buttons**, **What it changes**, and **Connected to**.

### 5.1 Dashboard

**Purpose:** the company at a glance for any period and branch: money, work, deadlines and how the team is doing.

**Who:** roles with *Dashboard — See*. Money tiles, the chart, the branch table and recent transactions appear only with *Money figures — See*. Staff without the dashboard start at the first page they can open.

**Sections:**
1. **Greeting** and the period in words (for example "1–12 Nov 2026 · all branches"). Buttons **New customer** and **Record payment** (when allowed).
2. **Period and branch**:
   - **Today**, **This week** (weeks start on Saturday), **This month**, **Last month**, **This year**, **Choose dates** (from–to).
   - **Branch** (only when there is more than one branch and you are not tied to one): All branches or one branch.
   - **Refresh** reloads the figures.
3. **Money tiles** (with *Money figures*):
   - **Revenue earned** — income counted as earned in the period (Hisab Kitab income, website payments, completed deals; an exchange gain is shown separately).
   - **Expenses** — expenses in the period.
   - **Net profit** — revenue less expenses (it says "a loss" when negative).
   - **Still to collect** — what customers owe on issued invoices plus what website applicants still owe on their applications.
   - **Advances held** — money paid ahead by customers, not yet put against invoices.
   - **Invoiced, not yet earned** — issued invoices whose deals are not completed yet.
4. **Work tiles** (everyone with the dashboard; each opens its page):
   - **Clients** (and new ones in the period), **Active deals** (and their value), **Waiting for approval**, **Open tasks** (and how many are overdue).
   - **New website enquiries** and **Applications in review**, for those who look after the website.
5. **Income and expense chart**: blue bars = income, orange = expense, for each day, week or month (**Daily / Weekly / Monthly**). Hover or tap a bar for its figures. **Show as table** shows the same figures as a table (date-wise summary).
6. **By branch** (when there is more than one branch): income, expense, net, clients and active deals for each branch, and a "No branch" row for entries not given a branch.
7. **Recent transactions**: the latest 10 journal entries (link **Journal** opens Finance → Journal).
8. **Tasks and follow-ups**: the next open tasks with their due dates (red when overdue). **Deal deadlines**: active deals by end date (amber within 7 days, red when passed).
9. **How the team is doing**: the top three, then a table per member of staff: clients, active deals, deals completed, tasks done, open tasks, overdue tasks, customer contacts. The ranking counts each completed deal 5, each task done 2, each logged call/WhatsApp/email/meeting 1, and takes 1 off for each overdue task.

**Changes:** nothing; it only reads.
**Connected to:** Finance (all money figures come from the books), Customers, Deals, Tasks, Approvals, Enquiries, Applications.

### 5.2 Customers

**Purpose:** the list of everyone the office works with (the CRM), from first contact to repeat client.

**Who:** *Customers — See*. Employees see only their own customers; branch staff see their branch.

#### The customer list (/admin/customers)
- **Search**: name, customer number (C-…), phone or email.
- **Filters**: category, status (Lead / Active / Inactive), given to (a member of staff, or "Not given to anyone"), branch, **Follow-up due** (customers whose next follow-up date has come).
- **Table**: customer and number, phone and WhatsApp, category, lead source, status, given to, next follow-up (red when past), how many deals and invoices. Click a row to open the customer. On phones each row is a card.
- **Export CSV** (*Customers — Export*): downloads the list for Excel. Passport columns are included only with *Passport details — See*. The export is recorded in the audit log.
- **New customer** (*Customers — Add*) opens the customer form (below).

#### The customer form (new or edit)
- **Full name**, **Phone** (required), **WhatsApp** (or tick **Same as phone**), **Email**, **Address**.
- **Category** (what they come for: Education, Healthcare…) and **Lead source** (how they found you: Facebook, referral…). Both lists grow: choose **+ Add new…** to type a new one; it is kept for next time.
- **Status**: Lead, Active, Inactive.
- **Given to**: the member of staff who looks after them (not shown to employees: their customers are given to themselves).
- **Branch** (when there is more than one).
- **Next follow-up**: from this date the customer shows under "Follow-up due" and the person they are given to gets a reminder.
- **Notes**.
- **Passport** (only with *Passport details — See*): number, country, expiry.
- **Duplicate check**: when you leave the phone or email box, customers with the same phone (compared by its last 10 digits, so "+880 1711-223344" and "01711223344" match) or email are shown as **Already a customer?**. If you save anyway, the server stops and lists them; **Save as a new customer anyway** saves on purpose.
- Saving a new customer gives them the next number (C-…) and opens their page.

#### The customer page (/admin/customers/…)
- **Header**: name, number, status, category, who looks after them, branch.
- **Contact buttons**: **Call** (phone link), **WhatsApp** (opens WhatsApp with their number; Bangladeshi 01… numbers are written as 8801…), **Email**.
- **Action buttons** (each only with its permission): **New deal**, **New invoice**, **Record payment**, **Add document**, **Edit**, **Delete** (only for a customer with no deals, invoices or payments; normally only the Super Admin).
- **Tabs** (the open tab is kept in the address, so a link can open a tab directly):
  1. **Overview** — invoiced, paid and still due (in taka, foreign invoices at their own rate; with *Money figures*), contact details, passport (or "Hidden — needs passport permission"), notes, website account if linked.
  2. **Activity** — the customer's history, newest first: calls, WhatsApps, emails, meetings, notes, and system lines (customer added, changed, task done, payment received…). The form at the top logs a new one: choose **Call / WhatsApp / Email / Meeting / Note**, write what happened, optionally the time, then **Log …**.
  3. **Tasks & follow-ups** — their tasks; tick one to mark it done; **Add follow-up** with a due date and who does it.
  4. **Deals** — their deals with number, status, total and revenue earned so far.
  5. **Invoices & payments** — their invoices (number, date, total, paid, due, status) and payments (date, receipt, method, amount, how much went to invoices), with totals for each currency.
  6. **Documents** — their documents with expiry and check status (opens the Documents page filtered to them).
  7. **Applications** — their website applications; each opens the application.

**Changes:** customer records; activity history; tasks; the audit log (customer added, changed, deleted, exported).
**Connected to:** Deals, Invoices, Collections, Documents, Tasks, Applications (an application can be linked with **Add to customers**), the Dashboard and the reminders (follow-ups).

### 5.3 Deals

**Purpose:** what a customer has agreed to buy, written down before billing: the services and price, the timeline, what Bengal Port commits to, what the client commits to, and the terms. Deals make invoices and the printed service agreement, and completing a deal is what turns invoiced money into earned revenue.

**Who:** *Deals — See*. Employees see their customers' deals. Totals show only with *Money figures*.

#### The deal list (/admin/deals)
- Tabs **All / Draft / Active / Completed / Cancelled**, search (title, D-number, customer), customer filter (when opened from a customer).
- Table: deal and number, customer, status, total, revenue earned, dates, given to, number of invoices.
- **New deal** (*Deals — Add*).

#### The deal form
- **Customer** (search by name, number, phone or email), **Deal title**, **Service line** (Business, Education… with **+ Add new…**), **Currency**, **Description**.
- **Services**: one line each (service, service line, quantity, unit price); the amount and total add up as you type. **Add a service**; the bin button removes a line.
- **Start date** and **End date** (the timeline; reminders go out before the end date).
- **What Bengal Port commits to** and **What the client commits to**.
- **Terms** (filled in from Office settings → Reminders and terms; can be changed for this deal).
- **Given to** and **Branch**.

#### The deal page (/admin/deals/…)
- Figures: deal total, invoiced, paid, still due, revenue earned.
- Sections: Services, Timeline (start, end, days left), What Bengal Port commits to, What the client commits to, Terms, Invoices (each with its status), Tasks.
- **Buttons** (depending on status and permission):
  - **Edit** — while Draft or Active. Invoices already made keep their own copy.
  - **Activate** — the work has started (Draft → Active).
  - **Make invoice** — makes a **draft invoice** from the deal's services and opens it to check and issue. For a deal in another currency it asks for the exchange rate if none is saved.
  - **Mark completed** — the work is done. Everything invoiced on this deal now counts as **revenue earned** (see section 8).
  - **Recognise part of the revenue** (*Accounts — Add*) — for long work: count part of the invoiced amount as earned now.
  - **Cancel deal** (with a reason) and **Reopen**.
  - **Record payment** — opens Collections for this customer.
  - **Print agreement** — the service agreement on the letterhead: parties, services and total, timeline, both sides' commitments, payment schedule (the deal's invoices with due dates), terms, and signature lines for Bengal Port and the client.

**Changes:** deal records; draft invoices; the books when a deal is completed or revenue is recognised; the customer's activity; reminders (deal deadline); audit log.
**Connected to:** Customers, Invoices, Collections, Finance, Notifications (deadlines), Dashboard (active deals, deadlines, team performance).

### 5.4 Invoices

**Purpose:** every bill, from draft to paid, and the printed invoice the customer receives.

**Who:** *Invoices — See*. Making needs *Add*; editing drafts and issuing need *Change*; cancelling and credit notes need *Cancel* (and *Approve* to happen at once); sharing needs *Export*; deleting a draft is for the Super Admin.

#### Kinds of invoice
1. **Office invoices** — made from a deal or by hand for a customer. When issued they go into the books (owed to us / invoiced, not yet earned).
2. **Application invoices** — made from a website application ("Generate invoice" in the application, or "Fill in from an application" in the invoice form). They bill the application's whole fee and show what was paid.
3. **Hisab Kitab invoices** — made from an income entry ("Generate invoice" on the entry): the money is already received, so the invoice shows it as paid.
Kinds 2 and 3 are **paper only**: their money is already in the books through Hisab Kitab and website payments, so issuing them does not count it again, and they do not take office payments.

#### Statuses
| Status | Meaning |
|---|---|
| **Draft** | Not issued; can be changed or deleted; not in the books. |
| **Sent** | Issued, nothing paid yet, not overdue. |
| **Part paid** | Some money received. |
| **Paid** | Fully paid (payments plus credit notes cover the total). |
| **Overdue** | The due date has passed and money is still owed. |
| **Cancelled** | Cancelled; what was owed is taken out of the books. |
| **Refunded** | The money paid on it was refunded. |

#### The invoice list (/admin/accounts/invoices)
- Tabs **All / Drafts / Sent / Part paid / Paid / Overdue / Cancelled**, search (number, customer, phone, email), customer filter.
- Table: number (and version), date, customer, total, paid, due, status.
- **Open** shows the printable invoice. **Actions** opens everything you can do with that invoice (below).
- **New invoice**.

#### The invoice form
- **Fill in from an application** (optional): search an application to bill it.
- **Customer from the customer list** (optional): fills in name, phone, email and address (they stay editable).
- **Name on the invoice**, phone, email, address.
- **Currency** and, for other currencies, the **exchange rate** (taka for 1 unit; the latest saved rate is filled in).
- **Invoice date**, **Due date**, **Work starts**, **Work ends**.
- **Services** lines (description, quantity, unit price).
- **Paid** — only for application and Hisab Kitab invoices (money already received elsewhere).
- **What Bengal Port commits to**, **What the client commits to**, **Terms** (filled in from Office settings), **Notes** (printed).
- The footer shows **Total / Paid / Due**.
- Buttons: **Cancel**, **Save draft**, **Issue invoice**. "After issuing, the invoice can't be edited; changes become a new version."

#### Actions on an invoice
- **Open / Print** — the invoice on the letterhead; print it or save it as PDF.
- **Edit draft** / **Issue** / **Delete draft** — for drafts only.
- **Revise** — for an issued invoice: the same form plus **Reason for the change** (required) and **Save as version N**. The old version is kept (see **Version history**). The new total cannot be less than what is already paid or credited, and the currency cannot change after money was received.
- **Record payment** — opens Collections with this customer and invoice filled in.
- **Credit note** — reduce what is owed (amount up to what is due, and a reason). Without *Invoices — Approve* it waits in Approvals.
- **Cancel invoice** — only when nothing was paid (otherwise refund or add a credit note). Needs a reason. Without *Approve* it waits in Approvals. A draft can be **withdrawn** instead.
- **Share by WhatsApp** — makes a private link to this invoice that works for **30 days** and opens WhatsApp with a message and the link. **Copy link** to send it another way. The customer opens it without signing in and can print it.
- **Version history** — each earlier version: date, who, reason, old total.

#### The printed invoice
Letterhead; "INVOICE", number, and "Version n" after a revision; a stamp for Draft, Paid, Cancelled or Refunded; billed to (with C-number), invoice date, due date, deal, currency and exchange rate, status; timeline; services table; total, credit notes, payments received, balance due; payment terms; both sides' commitments; terms; notes; the customer's signature line and the **authority signature recorded when it was issued** (name and title); footer "Template · Version · Issued by".

**Changes:** invoice records, versions and credit notes; the books (issue, revision, credit note, cancellation); share links; notifications (new invoice to the customer's staff and accountants; due and overdue reminders); audit log.
**Connected to:** Deals, Customers, Collections, Finance, Approvals, Applications, Hisab Kitab, Office settings (signature and terms).

### 5.5 Collections

**Purpose:** money customers pay at the office (cash, bank transfer, bKash, Nagad, card, cheque), in any currency, put against their invoices, with receipts and refunds.

**Who:** *Payments — See*. Recording needs *Payments — Add*; refunds happen at once with *Payments — Approve*, otherwise they wait in Approvals.

**Sections:**
1. **Money accounts strip**: Cash in hand, Bank account, bKash, Nagad (and others), with their balances (balances only with *Money figures*).
2. **List of payments**: search, customer filter; date, receipt number (opens the receipt), customer, paid by, amount (and "≈ ৳…" for other currencies), invoices it paid, advance left, refunded, status. Shows the latest 200; search to find older ones.
3. **Record payment** panel:
   - **Customer who paid**, **Amount received**, **Currency** (and **Exchange rate** for other currencies), **Paid by**, **Money went into** (filled in from "Paid by": cash → Cash in hand, bank/card/cheque → Bank account, bKash → bKash, Nagad → Nagad), **Reference** (transaction ID or cheque number), **Date received**, **Notes**.
   - **Apply to invoices**: the customer's unpaid invoices, oldest first, each with an amount box. **Fill oldest first** fills them for you. A payment pays only invoices in the same currency.
   - The line "Applied ৳x · Kept as advance ৳y" shows what happens to the rest.
   - After saving: the receipt number and **Open receipt**.
4. **Payment details** (click a row): what it paid, **Apply advance to invoices** (use money kept as advance later), **Refund** (amount, method, reason), **Open receipt**.

**Changes:** payment and receipt records; the invoices' paid amounts and statuses; the books; a line in Hisab Kitab (so the day's cash book is complete); the customer's activity; audit log.
**Connected to:** Customers, Invoices, Finance, Hisab Kitab, Approvals (refunds), Receipts.

### 5.6 Finance

**Purpose:** the company's books, kept in taka by double entry. Almost everything here is filled in automatically by the other pages. Nothing posted is ever deleted: a mistake is undone with a reversal.

**Who:** *Accounts — See* (normally the Super Admin and accountants).

Tabs (the tab is kept in the address):

#### Reports
- Period: **This month / Last month / This year / Custom**; **Branch** for profit and loss and the balance sheet.
- **Profit and loss** — income lines, expense lines, net profit or loss for the period. Income counts when it is earned (see section 8).
- **Balance sheet** — what the company has (assets), what it owes (liabilities) and what belongs to the owners (equity) on the end date, with a **Balanced** tick when assets = liabilities + equity.
- **Cash flow** — money at the start, money in, money out, money at the end, for cash, bank and mobile wallets.
- **Trial balance** — every account's debit and credit totals; the two columns must be equal.
- **Owed to us** — unpaid issued invoices by how late they are: not yet due, 1–30, 31–60, 61–90, over 90 days late; then each invoice and customer.
- **Unpaid bills** — Hisab Kitab expenses saved as "Not paid yet". **Mark paid** pays one from the account you choose.
- **Download CSV** for profit and loss, trial balance and the journal.

#### Journal
- Every journal entry: number (JE-…), date, what it was, where it came from (invoice, payment, Hisab Kitab, transfer, entered by hand…), made by, amount, status (Posted / Reversed). Click ▸ to see its debit and credit lines (and the foreign amount for other currencies).
- Filters: words, dates, account, kind of entry.
- **New journal entry** — for things nothing else records (opening balances, the owner putting money in, corrections): date, what it is for, at least two lines (account, debit or credit, note). It can be saved only when debits equal credits.
- **Reverse** — only for entries made by hand and transfers ("Made automatically — correct it where it came from" for the rest). Needs a reason; without *Accounts — Approve* it waits in Approvals.

#### Chart of accounts
- All accounts grouped as Assets, Liabilities, Equity, Income, Expenses, with balances.
- **Built-in** accounts (locked): 1000 Cash in hand, 1010 Bank account, 1020 bKash, 1030 Nagad, 1100 Accounts receivable, 2000 Accounts payable, 2100 Customer advances, 2200 Deferred revenue, 3000 Owner's equity, 3100 Retained earnings, 4000 Service revenue, 4100 Other income, 4900 Exchange gain/loss, 5000 General expenses, 5100 Refunds. Each Hisab Kitab category gets its own account (41xx income, 51xx expense).
- **Add account** / **Edit**: four-digit code, name, type, kind of money account (cash, bank, mobile wallet), currency, description, active.

#### Transfers
Moving money between your own accounts (cash to bank, bKash to bank…): from, to, amount, date, note. Recent transfers are listed.

#### Budgets
A plan for a period: amounts per income or expense account. Each line shows budget, actual, difference and a bar (amber at 90 % of an expense budget, red over 100 %; for income, reaching the target is green). **New budget** / edit.

#### Exchange rates
Saved rates (taka for 1 unit) by date. **Add today's rate**. The latest rate is filled in when recording payments and invoices in that currency.

**Changes:** journal entries, accounts, budgets, rates, transfers; audit log.
**Connected to:** everything that involves money; the Dashboard reads from here.

### 5.7 Hisab Kitab

**Purpose:** the daily cash book. The quick way to write down money that came in or went out and is not an invoice payment: rent, salaries, utilities, courier, a walk-in consultation fee, and cash paid for a website application. Every entry also goes into the books automatically.

**Who:** *Hisab Kitab — See* (adding and changing need *Add* / *Change*; deleting is for the Super Admin).

**Sections:**
1. **Header**: **Generate invoice** (a blank invoice), **Record cash payment** (income for a member's application), **Add transaction**.
2. **Period**: **Today**, **7 days**, **This month**, or a date. Every day's records are kept; pick any date to see it again.
3. **Figures**: net profit or loss, total income, total expense, average transaction; the **Cash movement** chart and the **Running net result**.
4. **Transaction ledger**: search (item, note or party), **Invoices** (opens the invoice list), **Categories**, **Day as PDF** (the day's report on the letterhead with the owner's signature) or **Print**.
   - Each row: date and time, item, customer/party (and application and payment method if any), quantity × unit or direct total, amount (+ income, − expense), and **Not paid yet** for unpaid bills.
   - Row buttons: **Mark paid** (unpaid bills: paid from cash; to pay from a bank or wallet use Finance → Unpaid bills), **Print / PDF** (one entry as a voucher), **Generate invoice** (income entries), **Edit**, **Delete**. Entries made by a payment or refund show a lock: they record money that really moved, so their amount stays (wording, date and category can still be corrected).
5. **Categories** panel: add, rename and delete categories for income and expenses. A category that has entries can be renamed but not deleted.

**The entry form ("Record money movement"):**
- **Expense** or **Income**.
- **What was bought or paid for?** / **What was the payment for?**
- **Date & time**, **Category** (or create a new one from the list).
- **Customer account** (optional): a member's website account, and one of their applications. Income for an application is also recorded as a **payment on that application** (with a receipt in their dashboard); then **Paid by** chooses the method.
- **Paid from** (expense) / **Received into** (income): Cash in hand, Bank account, bKash, Nagad. For expenses also **Not paid yet: a bill to pay later**: it then shows as unpaid here and under Finance → Unpaid bills until it is marked paid.
- **Vendor / paid to** or **Customer / received from** (the name shown).
- **Amount**: quantity × unit price, or the total directly.
- **Notes**.

**Changes:** cash book entries; the books (income/expense, money account, accounts payable for unpaid bills); for application payments also a payment and receipt on the application; audit log.
**Connected to:** Finance, Dashboard, Invoices (Generate invoice), Applications and Website payments (cash for an application), Documents and PDFs (day report signature).

### 5.8 Documents

**Purpose:** the company's private papers in one place: client papers, visa papers (passports, visas), employee papers (NID, certificates) and company papers (trade licence, tax). Each keeps every version, its expiry date and whether it has been checked.

**Who:** *Documents — See*. Upload needs *Add*; checking needs *Approve*; downloading needs *Export*; deleting needs *Delete*. Passports, NIDs and visas open only for roles with *Passport details — See*. A document can be limited to some roles ("Only these roles may open it").

**Sections:**
- Tabs **All / Client / Visa / Employee / Company**; search; **Checked or not** (waiting, verified, rejected); **Expiring in 30 days**; a customer filter when opened from a customer.
- Table: name and type, number, belongs to (customer or member of staff), expiry ("in 12 days", amber within 15 days, red within 7 or expired), checked, latest file and version, added by.
- **Add document**: kind (Client, Visa, Employee, Company), type (Passport, NID, Visa, Trade licence… with **+ Add new…**), name, number, customer (needed for Client and Visa), member of staff (needed for Employee), issue date, expiry date, notes, the roles that may open it, and the file (PDF, JPEG, PNG or WebP up to 10 MB; photos are made smaller first).
- **Document details** (click a row): details; **every version** with **View** and **Download**; "This document is private. Opening and downloading it is recorded."; **Upload new version** (it goes back to "waiting to be checked"); **Verify / Reject / Back to waiting** with a note; **Edit details**; **Delete**.

**Changes:** documents and their files; check status; audit log (including every view and download); expiry reminders.
**Connected to:** Customers (Documents tab), Notifications (expiry 15 and 7 days before, configurable), Office settings (reminder days).

### 5.9 Tasks

**Purpose:** what needs doing, by whom and by when: tasks, follow-ups with customers, and deadlines.

**Who:** *Tasks — See*. Employees see tasks given to them or made by them.

- Tabs **Mine**, **Everyone's open** (not for employees), **Overdue**, **Done**.
- Table: tick box (mark done / open again), the task (kind, who added it, notes), due date (red "Overdue"), given to, about (customer, deal), status, **Edit**.
- **New task**: what needs doing, kind (**Task / Follow-up / Deadline**), due date, given to, customer, notes. The person it is given to is told at once.
- Edit: also status (Open / Done / Cancelled) and **Delete**.

**Changes:** tasks; the customer's activity ("Done: …"); notifications.
**Connected to:** Customers (Tasks tab), Deals, Dashboard, Notifications (reminders when due).

### 5.10 Approvals

**Purpose:** a second person decides on risky actions. Nobody approves their own request.

| Request | Who can decide |
|---|---|
| Cancel an invoice | *Invoices — Approve* (accountants, Super Admin) |
| Credit note | *Invoices — Approve* |
| Refund a payment | *Payments — Approve* |
| Reverse a journal entry | *Accounts — Approve* (Super Admin by default) |

- Tabs **Waiting / Approved / Not approved / All**.
- Each request: what it is, the summary (amount and reason), who asked and when, a link to the invoice, payment or journal.
- **Approve** (with an "Are you sure?") does the action at once and records your name; **Don't approve** with an optional note. The person who asked is told either way.
- Staff without *Approvals — See* see only their own requests.

**Changes:** the action itself once approved (cancellation, credit note, refund, reversal) and everything that action changes; notifications; audit log.
**Connected to:** Invoices, Collections, Finance, Notifications, Dashboard ("Waiting for approval").

### 5.11 Notifications

**Purpose:** your own reminders and news.

| Kind | Sent to | When |
|---|---|---|
| Payment reminder | the customer's staff and accountants | an invoice due in 3 days (configurable); overdue invoices once a week |
| Follow-up reminder | the customer's staff (or approvers if nobody) | a customer's follow-up date or a follow-up task is due |
| Work deadline | the deal's or task's staff | a deal ends in 7 and 1 days (configurable); a task is due |
| Document expiry | who uploaded it, the customer's staff, approvers | 15 and 7 days before expiry (configurable) |
| New invoice | the customer's staff and accountants | an invoice is issued |
| Waiting for approval | the people who can approve; then the person who asked | a request is made; then decided |
| Task given to you | the person | a task is given to them |

- Tabs **All**, **Unread**, **What I receive**. Click a notification to open what it is about (it becomes read). **Mark all as read**.
- **What I receive**: for each kind, tick **here** and/or **by email** (email needs the mail server to be set up). **Save my choices**.
- **Send due reminders now** (*Settings — Change*): reminders also go out by themselves every 15 minutes; this sends what is due straight away. The same reminder is never sent twice.

### 5.12 Audit log

**Purpose:** who did what and when. It cannot be changed or deleted.

- Filters: search, **About** (customers, deals, invoices, payments, journal entries, chart of accounts, Hisab Kitab, budgets, exchange rates, report exports, documents, staff and members, roles and permissions, branches, signatures, settings), **Done by**, **From / To** dates.
- Each line: when, who (and role), what happened (with a link to the record), the changes (old → new values), and the computer's address.
- **Show older entries** loads more.

### 5.13 Office settings

**Purpose:** the Super Admin's controls. Each tab needs its own permission.

1. **Staff** (*Users — Change*): every member of staff with their **role**, **branch**, and **All branches** (see every branch). Changing a role asks first, signs the person out so the new role applies, and is recorded. You cannot change your own role; only a Super Admin can make another Super Admin. New staff are added under **Users** (website group) with a role.
2. **Roles and permissions** (*Roles — Change*): choose Manager, Accountant, Employee or Moderator and tick what the role may do, thing by thing (Office, Website, Running the admin). The change applies at once to everyone with that role. A gold dot marks a change from the standard; the shield marks sensitive permissions; **Put … back to standard** undoes your changes for that role.
3. **Branches** (*Branches — Change*): add or edit offices: short code (2–12 letters or digits), name, address, phone, open/closed. A closed branch keeps its records.
4. **Signature** (*Signature — Change*): the **authority signature printed on invoices**.
   - Add one: the signer's name and title and a picture (PNG or JPEG; sign on white paper, take a straight photo, crop close).
   - Adding a new one retires the old one; invoices already issued keep the signature they were issued with.
   - **Stop using it** means new invoices get a blank line to sign by hand.
   - When no signature is in use but one is saved under Documents and PDFs, the tab offers **Use it on invoices**.
   - Only roles with *Authority signature — Use* issue invoices with it.
5. **Reminders and terms** (*Settings — Change*): days before a document expires to warn (15, 7), days before an invoice is due to remind (3), days before a deal's end date to warn (7, 1), the currencies customers pay in (BDT always), and the **standard terms** printed on invoices and agreements (cancellation, refunds, additional charges).

**Changes:** users' roles and branches; permissions; branches; signatures; settings; audit log.

---

## 6. Website pages

### 6.1 Enquiries
**Purpose:** questions sent through the website's contact and enquiry forms (General, Business, Education, Healthcare, Umrah).
- Table: person, division, contact, message, **status** (change it in the row: Draft, Submitted, In review, Approved, Rejected, Cancelled), received.
- Search, **Export to Excel**.
- Row buttons: **View** (all details, the message, and **Staff notes**: notes only staff can see), **Print / PDF** (the enquiry on the letterhead), **Delete**.
- A changed status is saved at once. An enquiry from a signed-in member is linked to their account.

### 6.2 Applications
**Purpose:** filled-in application forms for a service (Business, Education, Healthcare, Umrah), with their documents and payments.
- Table: reference (BP-…), applicant, type, contact, **status** (Draft, Submitted, In review, Approved, Rejected, Cancelled; the applicant is emailed when it changes), submitted.
- Search, **Export to Excel**.
- **View** opens the application:
  - **Payment**: paid, remaining, **Amount due** (what the application costs; set by the Super Admin or an accountant, then **Save amount**). The customer can pay it in full or in part online or at the office.
  - **Generate invoice** (an application invoice), **Add to customers** (makes or finds the customer in the office's customer list and links the application and its payments; then **Open C-…**).
  - **Documents** uploaded by the applicant (download).
  - All answers, grouped as in the form. **Edit answers** to correct them; **Print / PDF** prints the filled-in form on the letterhead.
  - **Staff notes**.
- **Delete** removes the application with its documents and notes (normally only the Super Admin).
- A link like /admin/applications?open=ID opens one application directly (used by the customer page).

### 6.3 Opportunities, Suppliers, Factories, Education, Healthcare
**Purpose:** the listings shown on the public website.
- **Opportunities**: title, category (with **+ Create new category**), location, deadline, description, picture, **Visibility** (published or hidden).
- **Suppliers** and **Factories**: name, country, industry, product or service, description, card picture, **Feature this partner** (shown first).
- **Education**: institutions with country, programmes, description and several photos (a slideshow on the Education pages).
- **Healthcare**: hospitals with place (country and city), services, description and several photos (shown on the Healthcare country pages).
- Each page: search, table, **Add …**, **Edit**, **Delete**. Pictures can be uploaded (made smaller and converted to WebP automatically) or chosen from the Media library.

### 6.4 Users
**Purpose:** everyone who can sign in: website members and staff.
- Table: name, email, phone, **role** (change it in the row: Member, Employee, Accountant, Manager, Moderator (website), Super Admin / CEO), activity, joined, access.
- **Add user**: name, email, phone, role. They get an email with a temporary password and must choose their own at first sign-in. Giving a staff role needs *Roles — Change*; only a Super Admin can make a Super Admin; nobody changes their own role. A role change signs the person out and is recorded in the audit log.
- **Block** / **Unblock**: a blocked person cannot sign in and is signed out everywhere; their records are kept.

### 6.5 Website payments
**Purpose:** payments for applications, made online (bKash, Nagad) or recorded at the office.
- Table: customer, service, amount, method, remaining due, status (Paid, Partly paid, Due, Pending, Failed, Refunded), date.
- **Refund** / **Refunds**: refund all or part (through bKash or Nagad when paid that way, or record a manual refund); the refund history.
- Every received payment and completed refund is entered in Hisab Kitab automatically ("Service payments" / "Refunds"), so it is in the books.

### 6.6 Receipts
**Purpose:** the receipts made for every payment: receipt number, customer, amount paid, remaining due, date. Open one to print it. Customers see their receipts in their dashboard.

### 6.7 Reviews
**Purpose:** customer reviews for each service. Members who paid for a service can write one from their dashboard.
- Each review: name to show, service, rating, words, photo. **Approve** to show it on the website, **Hide** to take it down, edit, remove the photo, delete.
- **Add a review you received outside the website** (for example by WhatsApp).

### 6.8 Website content and Media library
- **Website content** edits the home page and the parts on every page: Logo and name, Utility bar, Menu, Hero heading, Introduction, Statistics, Division cards, Pathways, Process, Featured items, Trust points, Closing call to action, Footer, WhatsApp button. Each section has a form; **Advanced JSON** is for experts.
- **Media library**: upload pictures once and reuse them anywhere.

### 6.9 Page editors
**Business page**, **Education page**, **Healthcare page**, **Umrah page**, **About page**, **Services page**, **Contact page**, **Opportunities page**, **Apply page**, **Pay page**, **Sign-in page**, **Privacy Policy**, **Terms of Use**: each edits the words and pictures of that public page with a form (**Form editor**; **Advanced JSON** for experts). **Save changes** publishes at once. If someone else saved the same page meanwhile, you are told instead of overwriting their work.

### 6.10 Documents and PDFs
Settings for every printout (invoices, receipts, agreements, applications, enquiries, Hisab Kitab): the **letterhead** (the built-in Bengal Port letterhead, with your subtitle, tagline and website; or upload your own picture), and the **signatures**: the customer's label and the owner's name, title and signature picture used on applications, enquiries and Hisab Kitab reports. (Invoices use the authority signature from Office settings → Signature.)

### 6.11 Settings
- **Service fees**: for each division, the fee a new application owes, how it is shown to customers, and the smallest part payment allowed.
- **System status**: a quick check, when the page opens, that the database, email, bKash, Nagad and the backup tool are working.
- **Backup**: download a full copy of the database.

---

## 7. My profile
At **/profile** (link at the bottom of the menu): your name, phone and details; **Email and password** (changing the password signs you out on other devices); **Enable 2FA / Disable 2FA** (a code by email at sign-in).

---

## 8. How the books work

Bengal Port keeps **double-entry books in taka**. You never have to make these entries yourself: each page posts them. The table shows what each action writes.

| Action | Debit (goes up) | Credit | What it means |
|---|---|---|---|
| Office invoice issued | Accounts receivable | Deferred revenue | The customer owes us; the work is not done yet, so it is not earned yet. |
| Payment put against an invoice | Cash / Bank / bKash / Nagad | Accounts receivable | The customer paid what they owed. |
| Payment kept as advance | Cash / Bank / bKash / Nagad | Customer advances | We hold the customer's money; we owe it back until the work is done. |
| Advance applied to an invoice later | Customer advances | Accounts receivable | The advance pays the invoice. |
| Deal completed / revenue recognised | Deferred revenue | Service revenue | The work is done: the invoiced amount is now earned. |
| Credit note or cancellation | Deferred revenue | Accounts receivable | The customer owes less. |
| Paid at a different exchange rate | — | Exchange gain/loss | The difference in taka. |
| Refund | Customer advances (then Refunds) | Cash / Bank / … | Money given back. |
| Hisab Kitab income | Cash / Bank / bKash / Nagad | The category's income account | Money received. |
| Hisab Kitab expense, paid | The category's expense account | Cash / Bank / bKash / Nagad | Money spent. |
| Hisab Kitab expense, not paid yet | The category's expense account | Accounts payable | A bill we owe. |
| Unpaid bill marked paid | Accounts payable | Cash / Bank / bKash / Nagad | The bill is paid. |
| Website payment / refund | through Hisab Kitab (Service payments / Refunds) | | Counted when received. |
| Transfer | The account it went to | The account it came from | Money moved between our accounts. |
| Correction | the opposite of the original | | A reversal, never a deletion. |

**When income counts:**
- Website payments and Hisab Kitab income count **when the money is received**.
- Office invoices count **when the work is done**: issuing an invoice is "invoiced, not yet earned"; **Mark completed** on the deal (or **Recognise part of the revenue**) makes it earned.
- Application and Hisab Kitab invoices are paper only (their money is already counted).

**Foreign currency:** each payment and invoice stores its currency, exchange rate and date; the books show taka and the original amount.

**The books start empty.** Invoices made before this version are not in the books. To bring in opening balances (cash in hand on day one, money owed from before), use **Finance → Journal → New journal entry**.

---

## 9. Things that happen by themselves

- **Numbers**: customers C-000001…, deals D-000001…, invoices INV-000001…, credit notes CN-000001…, journal entries JE-000001…, receipts BPR-year-code, applications BP-code.
- **Reminders** every 15 minutes (see 5.11); the same reminder is never sent twice.
- **Emails**: application status changes, new accounts' temporary passwords, password resets and, if chosen, notifications (all need the mail server).
- **Books**: every money step is posted (section 8).
- **Hisab Kitab**: website payments, refunds and office payments appear in the day's cash book.
- **Signature**: an invoice records the authority signature in use when it was issued.
- **Audit log**: every change, every export, and every opening or download of a private document.
- **Pictures**: uploads are made smaller and converted to WebP.

---

## 10. Everyday tasks, step by step

**A new client walks in**
1. Customers → **New customer**: name, phone, category, lead source, given to, next follow-up.
2. On their page → **Activity**: log the conversation.

**They agree to a service**
1. On their page → **New deal**: services and prices, start and end dates, both sides' commitments.
2. On the deal → **Activate**, then **Print agreement** for both to sign.

**Bill them**
1. On the deal → **Make invoice** → check it → **Issue invoice**.
2. Invoices → **Actions** → **Share by WhatsApp** (or print and hand it over).

**They pay**
1. Collections → **Record payment** (or **Record payment** on the invoice): amount, method, **Fill oldest first** → **Record payment**.
2. **Open receipt** and give it to them.

**The work is finished**
- On the deal → **Mark completed**.

**They paid before the invoice existed**
- Record the payment with no invoice: it is kept as their advance. When the invoice is issued, open the payment → **Apply advance to invoices**.

**A discount after the invoice was issued**
- Invoices → Actions → **Credit note** (amount and reason).

**The price changed after issuing**
- Invoices → Actions → **Revise**: change it, write the reason, **Save as version 2**.

**A student pays in US dollars**
- Record payment → currency **USD**, exchange rate (filled in from the latest rate) → it is paid against USD invoices.

**Rent paid by bank transfer**
- Hisab Kitab → **Add transaction** → Expense → category Rent → **Paid from: Bank account**.

**An electricity bill to pay next week**
- Hisab Kitab → Add transaction → Expense → **Paid from: Not paid yet** → later **Mark paid** (or Finance → Unpaid bills → Mark paid from the bank).

**A website applicant pays cash at the office**
- Hisab Kitab → **Record cash payment** → choose their account and application → amount. It is recorded on the application with a receipt in their dashboard.

**Give a new member of staff access**
1. Users → **Add user** with the role (Employee, Accountant…).
2. Office settings → Staff → their **branch**.

**A passport about to expire**
- Documents → **Add document** (kind Visa, type Passport, customer, expiry date, file). Reminders come 15 and 7 days before.

**End of the day**
- Hisab Kitab → Today → **Day as PDF**.

**End of the month**
- Finance → Reports → This month: Profit and loss, Balance sheet, Owed to us, Unpaid bills; **Download CSV** if needed.

---

## 11. What changes where

| You do this | Records changed | In the books | Who is told | Audit log |
|---|---|---|---|---|
| Add / edit a customer | Customer, activity | — | — | Yes |
| Log a call / note | Activity | — | — | — |
| Add a task | Task, activity | — | The person given it | — |
| Add / activate a deal | Deal | — | — | Yes |
| Make invoice from a deal | Draft invoice | — | — | Yes |
| Issue an invoice | Invoice (number, signature, locked) | Receivable / Deferred revenue | Customer's staff, accountants | Yes |
| Revise an invoice | New version, old one kept | Old posting reversed, new one posted | — | Yes |
| Credit note | Credit note, invoice status | Deferred revenue / Receivable | Approvers (if waiting) | Yes |
| Cancel an invoice | Invoice cancelled | What was owed taken out | Approvers (if waiting) | Yes |
| Share an invoice | Share link, "sent" date | — | — | Yes |
| Record a payment | Payment, receipt, invoices paid, cash book line, activity | Money / Receivable or Advances | — | Yes |
| Refund | Refund, statuses, cash book line | Advances or Refunds / Money | Approvers (if waiting) | Yes |
| Mark a deal completed | Deal | Deferred revenue / Service revenue | — | Yes |
| Hisab Kitab entry | Cash book entry (and application payment and receipt) | Money and category (or Payable) | — | Yes |
| Mark a bill paid | Bill paid | Payable / Money | — | Yes |
| Journal entry / transfer / reversal | Journal | As entered | Approvers (reversal waiting) | Yes |
| Add / check a document | Document, versions, check status | — | Expiry reminders later | Yes (also views and downloads) |
| Change a role / permission / branch / signature / settings | Users, permissions, branches, signatures, settings | — | — | Yes |
| Change an application's status | Application | — | The applicant (email) | — |
| Website payment | Payment, receipt | Through Hisab Kitab | — | — |

---

## 12. Still to be set up

- **Invoice terms**: the standard terms are placeholder wording. Replace them under Office settings → Reminders and terms.
- **Authority signature**: add it under Office settings → Signature (or use the one from Documents and PDFs).
- **Email**: reminders by email and account emails need the mail server details on the live server.
- **bKash / Nagad**: online payments need the live gateway credentials.
- **Opening balances**: if you want the books to include money from before, enter them in Finance → Journal.

---

# বাংলা নির্দেশিকা

## সূচিপত্র

1. [সাইন ইন, রোল ও অনুমতি](#1-সাইন-ইন-রোল-ও-অনুমতি)
2. [অ্যাডমিন স্ক্রিন](#2-অ্যাডমিন-স্ক্রিন)
3. [সবকিছু কীভাবে যুক্ত](#3-সবকিছু-কীভাবে-যুক্ত)
4. [অ্যাডমিনে ব্যবহৃত শব্দ](#4-অ্যাডমিনে-ব্যবহৃত-শব্দ)
5. [অফিসের পেজ](#5-অফিসের-পেজ)
   - [5.1 Dashboard (ড্যাশবোর্ড)](#51-dashboard-ড্যাশবোর্ড) · [5.2 Customers (গ্রাহক)](#52-customers-গ্রাহক) · [5.3 Deals (ডিল)](#53-deals-ডিল) · [5.4 Invoices (ইনভয়েস)](#54-invoices-ইনভয়েস) · [5.5 Collections (আদায়)](#55-collections-আদায়) · [5.6 Finance (হিসাবের খাতা)](#56-finance-হিসাবের-খাতা) · [5.7 Hisab Kitab (হিসাব-কিতাব)](#57-hisab-kitab-হিসাব-কিতাব) · [5.8 Documents (ডকুমেন্ট)](#58-documents-ডকুমেন্ট) · [5.9 Tasks (কাজ)](#59-tasks-কাজ) · [5.10 Approvals (অনুমোদন)](#510-approvals-অনুমোদন) · [5.11 Notifications (নোটিফিকেশন)](#511-notifications-নোটিফিকেশন) · [5.12 Audit log (অডিট লগ)](#512-audit-log-অডিট-লগ) · [5.13 Office settings (অফিস সেটিংস)](#513-office-settings-অফিস-সেটিংস)
6. [ওয়েবসাইটের পেজ](#6-ওয়েবসাইটের-পেজ)
7. [My profile (আমার প্রোফাইল)](#7-my-profile-আমার-প্রোফাইল)
8. [হিসাবের খাতা কীভাবে চলে](#8-হিসাবের-খাতা-কীভাবে-চলে)
9. [যা নিজে থেকেই হয়](#9-যা-নিজে-থেকেই-হয়)
10. [প্রতিদিনের কাজ, ধাপে ধাপে](#10-প্রতিদিনের-কাজ-ধাপে-ধাপে)
11. [কোথায় কী বদলায়](#11-কোথায়-কী-বদলায়)
12. [যা এখনও সেট আপ করা বাকি](#12-যা-এখনও-সেট-আপ-করা-বাকি)

---

## 1. সাইন ইন, রোল ও অনুমতি

### সাইন ইন করা
কর্মীরা **/login** পেজে নিজের ইমেইল ও পাসওয়ার্ড দিয়ে সাইন ইন করেন (অথবা Google দিয়ে, যদি তাদের Google ইমেইল আর অ্যাকাউন্টের ইমেইল একই হয়)। সাইন ইনের পর কর্মীরা সরাসরি অ্যাডমিনে (**/admin**) চলে যান। Super Admin কোনো নতুন কর্মীর অ্যাকাউন্ট খুললে সেই কর্মী ইমেইলে একটি অস্থায়ী পাসওয়ার্ড পান। প্রথমবার সাইন ইনের সময় তাকে নিজের পাসওয়ার্ড ঠিক করে নিতে হয়।

### রোল (ভূমিকা)
প্রতিটি অ্যাকাউন্টের একটি করে রোল থাকে। বাম পাশের মেনুতে কোন কোন পেজ দেখা যাবে, আর প্রতিটি পেজে কোন কোন বাটন থাকবে, তা রোলই ঠিক করে। সার্ভারও একই নিয়ম যাচাই করে, তাই শুধু বাটন লুকিয়ে রাখাই একমাত্র সুরক্ষা নয়।

| রোল | কাদের জন্য | সংক্ষেপে |
|---|---|---|
| **Super Admin / CEO** (সুপার অ্যাডমিন / প্রধান নির্বাহী; ADMIN) | মালিক | সবসময় সবকিছু দেখতে ও করতে পারেন। তাঁর ক্ষমতা সীমিত করা যায় না। অন্য রোলগুলো কী কী করতে পারবে, তা তিনিই ঠিক করেন। |
| **Manager** (ম্যানেজার) | যিনি প্রতিদিনের কাজ চালান | গ্রাহক (পাসপোর্টের তথ্যসহ), ডিল, ইনভয়েস (তৈরি, পরিবর্তন, বাতিল, শেয়ার, স্বাক্ষর), কাজ, ডকুমেন্ট, টাকার অঙ্ক। পেমেন্ট দেখতে পারেন, কিন্তু রেকর্ড করতে পারেন না। হিসাব-কিতাব (Hisab Kitab) বা Finance (হিসাবের খাতা) নেই। |
| **Accountant** (হিসাবরক্ষক) | যিনি টাকার হিসাব ঠিক রাখেন | পেমেন্ট (রেকর্ড করা, ইনভয়েসে বসানো, টাকা ফেরত), ইনভয়েস (বাতিল ও ক্রেডিট নোট অনুমোদনসহ), Finance, হিসাব-কিতাব, অনুমোদন। গ্রাহক ও ডিল দেখতে পারেন, বদলাতে পারেন না। |
| **Employee** (কর্মী) | যিনি গ্রাহকদের সাথে কাজ করেন | নিজের গ্রাহক, কাজ ও ডকুমেন্ট; ডিল ও ইনভয়েস দেখতে পারেন; টাকার অঙ্ক ছাড়া ড্যাশবোর্ড। |
| **Moderator** (মডারেটর) | যিনি ওয়েবসাইট দেখাশোনা করেন | ওয়েবসাইটের কনটেন্ট, ডিরেক্টরি পেজ, রিভিউ, জিজ্ঞাসা (এনকোয়ারি) ও আবেদন; ইনভয়েস বানাতে পারেন। অফিসের কোনো পেজ নেই, কখনও কিছু মুছতে পারেন না। |
| **Member** (সদস্য; USER) | অ্যাকাউন্ট আছে এমন ওয়েবসাইট ভিজিটর | অ্যাডমিনে একেবারেই ঢুকতে পারেন না। ওয়েবসাইটে সদস্যদের ড্যাশবোর্ড ব্যবহার করেন। |

### ডিফল্ট অনুমতি
একটি অনুমতি মানে একটি জিনিস (রিসোর্স) আর একটি কাজ: **See** (দেখা), **Add** (যোগ করা), **Change** (পরিবর্তন করা), **Delete** (মুছে ফেলা), **Export** (এক্সপোর্ট বা ডাউনলোড করা), **Approve** (অনুমোদন করা), **Cancel** (বাতিল করা), **Use** (ব্যবহার করা)। Super Admin **Office settings → Roles and permissions** (অফিস সেটিংস → রোল ও অনুমতি) থেকে এর যেকোনোটি বদলাতে পারেন। নিচের টেবিলে স্ট্যান্ডার্ড সেটিং দেখানো হলো।

| জিনিস | Manager | Accountant | Employee | Moderator |
|---|---|---|---|---|
| Dashboard (ড্যাশবোর্ড) | See | See | See | — |
| Money figures (টাকার অঙ্ক: মোট হিসাব, গ্রাহকের কাছে পাওনা, ডিলের মূল্য) | See | See | — | — |
| Customers (গ্রাহক) | See, Add, Change, Export | See | See, Add, Change (শুধু নিজের) | — |
| Passport details (পাসপোর্টের তথ্য) | See | — | — | — |
| Deals (ডিল) | See, Add, Change, Cancel | See | See (শুধু নিজের) | — |
| Invoices (ইনভয়েস) | See, Add, Change, Cancel, Export | See, Add, Change, Approve, Export | See | See, Add |
| Authority signature (কর্তৃপক্ষের স্বাক্ষর) | Use | Use | — | — |
| Payments (পেমেন্ট) | See | See, Add, Change, Approve, Export | — | — |
| Accounts (Finance) (হিসাবের খাতা) | — | See, Add, Change, Export | — | — |
| Hisab Kitab (হিসাব-কিতাব) | — | See, Add, Change | — | — |
| Documents (ডকুমেন্ট) | See, Add, Change, Export | See | See, Add | — |
| Tasks (কাজ) | See, Add, Change, Delete | See, Add, Change | See, Add, Change (শুধু নিজের) | — |
| Approvals (অনুমোদন) | See (সব অনুরোধ) | See (সব), Approve | — | — |
| Users (ব্যবহারকারী) | See | — | — | — |
| Website: enquiries, applications (ওয়েবসাইট: জিজ্ঞাসা, আবেদন) | See, Change | — | — | See, Change |
| Website: content, directory, media, reviews (ওয়েবসাইট: কনটেন্ট, ডিরেক্টরি, ছবি, রিভিউ) | — | — | — | See, Add, Change |

সব কর্মীই **Notifications** (নোটিফিকেশন) আর **Approvals** (অনুমোদন) খুলতে পারেন (নিজের অনুরোধের খোঁজ রাখার জন্য)।

### সংবেদনশীল অনুমতি
এগুলো Office settings-এ একটি ঢাল (শিল্ড) চিহ্ন দিয়ে দেখানো থাকে, কারণ এগুলো দিয়ে টাকা, পরিচয় বা স্বাক্ষরের ক্ষমতা খুলে যায়: Money figures (টাকার অঙ্ক), Passport details (পাসপোর্টের তথ্য), Authority signature (কর্তৃপক্ষের স্বাক্ষর; Use ও Change), Documents Export (ডকুমেন্ট এক্সপোর্ট), সব Approve, সব Delete, Roles (রোল), Users Change (ব্যবহারকারী পরিবর্তন), Settings (সেটিংস)।

### কে কোন রেকর্ড দেখেন
- **Employee** (কর্মী) রোলের কর্মীরা শুধু তাদের দায়িত্বে দেওয়া গ্রাহক, তাদের দেওয়া বা তাদের তৈরি কাজ, আর তাদের গ্রাহকদের ডিল দেখতে পান।
- **কোনো শাখার সাথে যুক্ত কর্মীরা** শুধু সেই শাখার গ্রাহক, ডিল ও অঙ্ক দেখেন, যদি না তাদের জন্য "All branches" (সব শাখা) টিক দেওয়া থাকে (Office settings → Staff)। Super Admin সবসময় সবকিছু দেখেন।
- কোনো রোল যদি কোনো পেজ খুলতে না পারে, তাহলে পেজে **"Your role cannot open this page"** (আপনার রোল এই পেজ খুলতে পারে না) লেখা দেখায়, সাথে ওই রোল যে প্রথম পেজটি খুলতে পারে তার একটি লিংক থাকে।

---

## 2. অ্যাডমিন স্ক্রিন

- **বাম পাশের মেনু** (ফোনে উপরের বাম কোণের ☰ বাটনে চাপলে মেনু খোলে)। এতে দুটি গ্রুপ আছে:
  - **Office** (অফিস): Dashboard (ড্যাশবোর্ড), Customers (গ্রাহক), Deals (ডিল), Invoices (ইনভয়েস), Collections (আদায়), Finance (হিসাবের খাতা), Hisab Kitab (হিসাব-কিতাব), Documents (ডকুমেন্ট), Tasks (কাজ), Approvals (অনুমোদন), Notifications (নোটিফিকেশন), Audit log (অডিট লগ), Office settings (অফিস সেটিংস), এবং **Admin guide** (অ্যাডমিন নির্দেশিকা; শুধু Super Admin): অ্যাডমিনের ভেতরেই এই নির্দেশিকা, উপরে **EN / BN** সুইচ দিয়ে ইংরেজি বা বাংলায় পড়া যায়।
  - **Website** (ওয়েবসাইট): Enquiries (জিজ্ঞাসা), Applications (আবেদন), Opportunities (সুযোগ), Suppliers (সরবরাহকারী), Factories (কারখানা), Education (শিক্ষা), Healthcare (চিকিৎসা), Users (ব্যবহারকারী), Website payments (ওয়েবসাইটের পেমেন্ট), Receipts (রসিদ), Reviews (রিভিউ), Website content (ওয়েবসাইটের কনটেন্ট), Media library (মিডিয়া লাইব্রেরি), পেজ এডিটরগুলো (Business, Education, Healthcare, Umrah, About, Services, Contact, Opportunities, Apply, Pay, Sign-in, Privacy Policy, Terms of Use; অর্থাৎ ব্যবসা, শিক্ষা, চিকিৎসা, উমরাহ, আমাদের সম্পর্কে, সেবা, যোগাযোগ, সুযোগ, আবেদন, পেমেন্ট, সাইন ইন, গোপনীয়তা নীতি ও ব্যবহারের শর্তাবলির পেজ), Documents and PDFs (ডকুমেন্ট ও PDF), Settings (সেটিংস)।
  - আপনার রোল যে পেজগুলো খুলতে পারে, শুধু সেগুলোই দেখা যায়।
- **নোটিফিকেশনের সংখ্যা**: "Notifications"-এর পাশের সংখ্যাটি (ফোনে উপরের ঘণ্টা চিহ্নের উপরেও) জানায় আপনার কয়টি না-পড়া নোটিফিকেশন আছে। ট্যাব খোলা থাকলে প্রতি মিনিটে এটি যাচাই হয়, আর ট্যাবে ফিরে এলে সাথে সাথেই যাচাই হয়।
- **মেনুর নিচের অংশ**: আপনার রোল, **My profile** (আমার প্রোফাইল), **View public website** (পাবলিক ওয়েবসাইট দেখুন), **Sign out** (সাইন আউট)।
- **পাশের প্যানেল**: বেশিরভাগ "Add" (যোগ করুন), "New" (নতুন) ও "Details" (বিস্তারিত) বাটন ডান দিক থেকে একটি প্যানেল খোলে (ফোনে পুরো স্ক্রিন জুড়ে)। ✕ চেপে, Escape কী চেপে, অথবা প্যানেলের পাশে ক্লিক করে এটি বন্ধ করুন। সেভ করার বাটনগুলো প্যানেলের নিচে থাকে; কিছু ভুল হলে ঠিক তার উপরেই কারণটি লেখা দেখায়।
- **"Are you sure?" বক্স** (আপনি কি নিশ্চিত?): কিছু মুছতে বা বাতিল করতে গেলে সাইটের নিজস্ব বক্সে আগে জিজ্ঞেস করা হয়। Cancel (বাতিল) চাপলে সবকিছু আগের মতোই থাকে।
- **মেসেজ**: উপরে ছোট একটি সবুজ মেসেজ জানায় কী সেভ হয়েছে; লাল মেসেজ জানায় কী ভুল হয়েছে।

---

## 3. সবকিছু কীভাবে যুক্ত

```
ওয়েবসাইট                              অফিস
ভিজিটর ── জিজ্ঞাসা ──► Enquiries
ভিজিটর ── আবেদন ──► Applications ──"Add to customers"──► গ্রাহক (C-000001)
        └─ অনলাইনে পেমেন্ট (bKash/Nagad) ──► Website payments ──► রসিদ ──► হিসাব-কিতাব (আয়)
                                                                 │
                                           গ্রাহক ──► ডিল (D-000001: সেবা, দাম, সময়সূচি)
                                                          │   └─ Print agreement (চুক্তিপত্র প্রিন্ট)
                                                          ▼
                                           ইনভয়েস (INV-000001) ── ইস্যু ──► স্বাক্ষরিত, নম্বরযুক্ত, লক করা
                                                          │   ├─ Share by WhatsApp (লিংক 30 দিন চালু থাকে)
                                                          │   ├─ Revise (নতুন ভার্সন) / Credit note / Cancel
                                                          ▼
                                           Collections: পেমেন্ট ──► রসিদ (BPR-…)
                                                          │   └─ ইনভয়েসে না বসানো টাকা = গ্রাহকের অগ্রিম
                                                          ▼
                                           ডিল "Mark completed" ──► আয় অর্জিত হয়
হিসাব-কিতাবের এন্ট্রি (ভাড়া, বেতন, সরাসরি আসা কারও ফি) ────────────────────────┐
উপরের প্রতিটি টাকার ধাপ ─────────────────────────────────────────────┴──► Finance (জার্নাল, রিপোর্ট) ──► Dashboard
ডকুমেন্ট (মেয়াদ শেষ) · কাজ (নির্ধারিত তারিখ) · ইনভয়েস (বাকি/মেয়াদোত্তীর্ণ) · ডিল (শেষ তারিখ) ──► Notifications
"Approve" অনুমতি নেই এমন কারও করা বাতিল / ক্রেডিট নোট / টাকা ফেরত / রিভার্সাল ──► Approvals
প্রতিটি পরিবর্তন ──► Audit log
```

সহজ কথায়:
1. মানুষ বেঙ্গল পোর্টের কাছে আসে ওয়েবসাইটের মাধ্যমে (**Enquiries** (জিজ্ঞাসা), **Applications** (আবেদন), অনলাইন পেমেন্ট), অথবা সরাসরি অফিসে চলে আসে।
2. যার সাথেই আপনি ব্যবসা করেন, তিনি একজন **Customer** (গ্রাহক) হন। ওয়েবসাইটের একটি আবেদনকে এক ক্লিকেই গ্রাহক বানানো যায়।
3. একজন গ্রাহক যা কেনেন, সেটি একটি **Deal** (ডিল, অর্থাৎ চুক্তি): সেবাগুলো, দাম, সময়সূচি, আর দুই পক্ষের কে কী করবে তার প্রতিশ্রুতি। ডিলটি একটি **service agreement** (সেবা চুক্তিপত্র) হিসেবে প্রিন্ট হয়।
4. ডিল থেকে তৈরি হয় **Invoice** (ইনভয়েস), অর্থাৎ টাকা চেয়ে একটি বিল। ইস্যু করলে এতে স্বাক্ষর বসে, নম্বর পড়ে, আর এটি লক হয়ে যায়।
5. গ্রাহক যে টাকা দেন, তা **Collections** (আদায়)-এ একটি **Payment** (পেমেন্ট) হিসেবে রেকর্ড হয়, আর তার একটি **Receipt** (রসিদ) তৈরি হয়। একটি পেমেন্ট কয়েকটি ইনভয়েসে ভাগ করে বসানো যায়; যা বাকি থাকে, তা গ্রাহকের **advance** (অগ্রিম) হিসেবে জমা থাকে।
6. ইনভয়েসের সাথে যুক্ত নয় এমন প্রতিদিনের টাকার লেনদেন (ভাড়া, বেতন, সরাসরি অফিসে আসা কারও পরামর্শ ফি) যায় হিসাব-কিতাব (**Hisab Kitab**)-এ।
7. টাকা জড়িত প্রতিটি ধাপ নিজে থেকেই হিসাবের খাতায় (**Finance**) লেখা হয়ে যায়। **Dashboard** (ড্যাশবোর্ড) তার সব অঙ্ক এই খাতা থেকেই নেয়।
8. **Notifications** (নোটিফিকেশন) ঠিক মানুষদের মনে করিয়ে দেয়: কোন ইনভয়েসের টাকা দেওয়ার সময় হয়েছে, কোন ফলো-আপ বাকি, কোন শেষ তারিখ আসছে, কোন ডকুমেন্টের মেয়াদ শেষ হচ্ছে। ঝুঁকিপূর্ণ কাজগুলো দ্বিতীয় একজনের সিদ্ধান্তের জন্য **Approvals** (অনুমোদন)-এ অপেক্ষা করে। **Audit log** (অডিট লগ) সবকিছু লিখে রাখে।

---

## 4. অ্যাডমিনে ব্যবহৃত শব্দ

| শব্দ | অর্থ |
|---|---|
| **Customer** (গ্রাহক) | এমন কোনো ব্যক্তি বা কোম্পানি, যার সাথে আপনি ব্যবসা করেন। প্রত্যেকের একটি নম্বর থাকে, যেমন **C-000012**। এটি *user* (ব্যবহারকারী, অর্থাৎ যে অ্যাকাউন্ট দিয়ে সাইন ইন করা হয়) থেকে আলাদা। একজন মানুষ দুটোই হতে পারেন। |
| **Lead** (লিড, সম্ভাব্য গ্রাহক) | এমন গ্রাহক যিনি এখনও কিছু কেনেননি (এটি গ্রাহকের একটি স্ট্যাটাস)। |
| **Deal** (ডিল, চুক্তি) | গ্রাহক যা কিনতে রাজি হয়েছেন: সেবা, দাম, সময়সূচি, প্রতিশ্রুতি, শর্ত। নম্বর যেমন **D-000034**। |
| **Invoice** (ইনভয়েস) | একটি বিল: "আপনার কাছে আমাদের এত টাকা পাওনা, এই তারিখের মধ্যে দিতে হবে"। নম্বর যেমন **INV-000056**। ইস্যু করা মানেই টাকা চলে এসেছে, এমন নয়। |
| **Draft** (খসড়া) | যে ইনভয়েস এখনও ইস্যু হয়নি। এটি ইচ্ছেমতো বদলানো যায়, আর হিসাবের খাতায় এর কোনো প্রভাব পড়ে না। |
| **Issue** (ইস্যু করা) | খসড়াকে আসল ইনভয়েসে পরিণত করা: এতে নম্বর পড়ে, কর্তৃপক্ষের স্বাক্ষর বসে, আর এটি লক হয়ে যায়। |
| **Revision / version** (সংশোধন / ভার্সন) | ইস্যু করা ইনভয়েসে কোনো পরিবর্তন। পুরোনো ভার্সনটি কারণসহ রেখে দেওয়া হয়; নতুনটি পরের ভার্সন নম্বর পায়। |
| **Credit note** (ক্রেডিট নোট) | ইস্যু করা ইনভয়েসে পাওনা টাকা কমানো (ছাড় বা মওকুফ)। নম্বর যেমন **CN-000003**। |
| **Payment** (পেমেন্ট) | গ্রাহক আসলে যে টাকা দিয়েছেন। Collections (অফিসে দেওয়া টাকা) বা Website payments (অনলাইনে দেওয়া টাকা)-এ রেকর্ড হয়। |
| **Receipt** (রসিদ) | পেমেন্টের প্রমাণ, গ্রাহকের জন্য। নম্বর যেমন **BPR-2026-HXW4XK2**। |
| **Advance** (অগ্রিম) | গ্রাহক যে টাকা দিয়েছেন কিন্তু এখনও কোনো ইনভয়েসের বিপরীতে বসানো হয়নি। কোম্পানি টাকাটা গ্রাহকের হয়ে রেখে দেয়, আর কাজ শেষ না হওয়া পর্যন্ত এই টাকা গ্রাহককে ফেরত দেওয়ার দায় থাকে। |
| **Hisab Kitab entry (transaction)** (হিসাব-কিতাবের এন্ট্রি বা লেনদেন) | দৈনিক ক্যাশ বইয়ের একটি লাইন: যে টাকা এসেছে বা গেছে। |
| **Category** (ক্যাটাগরি) | হিসাব-কিতাবের এন্ট্রির ধরন (Rent (ভাড়া), Salaries (বেতন), Tuition fees (টিউশন ফি)…)। প্রতিটি ক্যাটাগরির জন্য হিসাবের খাতায় আলাদা একটি অ্যাকাউন্ট থাকে। |
| **Unpaid bill** (অপরিশোধিত বিল) | হিসাব-কিতাবের যে খরচ "Not paid yet" (এখনও পরিশোধ হয়নি) হিসেবে সেভ করা হয়েছে: এই টাকা কোম্পানিকে দিতে হবে। |
| **Revenue earned** (অর্জিত আয়) | যে আয় অর্জিত বলে ধরা হয়: হিসাব-কিতাবের আয়, ওয়েবসাইটের পেমেন্ট, আর ইনভয়েস করা কাজ, যখন সেই কাজের ডিলটি সম্পন্ন হয়। |
| **Invoiced, not yet earned** (ইনভয়েস হয়েছে, এখনও অর্জিত হয়নি) | যে ইস্যু করা ইনভয়েসগুলোর কাজ এখনও শেষ হয়নি (অনর্জিত আয়)। |
| **Owed to us** (আমাদের পাওনা) | ইস্যু করা ইনভয়েসে গ্রাহকদের কাছে এখনও যে টাকা পাওনা (প্রাপ্য)। |
| **Journal entry** (জার্নাল এন্ট্রি) | টাকার প্রতিটি ধাপের পেছনে থাকা ডাবল-এন্ট্রি রেকর্ড। নম্বর যেমন **JE-000101**। কখনও মোছা হয় না; ভুল হলে একটি **reversal** (রিভার্সাল, অর্থাৎ উল্টো এন্ট্রি) দিয়ে তা বাতিল করা হয়। |
| **Debit / Credit** (ডেবিট / ক্রেডিট) | প্রতিটি জার্নাল এন্ট্রির দুই দিক। এই দুই দিক সবসময় সমান হতে হবে। |
| **Money account** (টাকার অ্যাকাউন্ট) | যেখানে টাকা রাখা হয়: Cash in hand (হাতে নগদ), Bank account (ব্যাংক অ্যাকাউন্ট), bKash, Nagad (আর আপনার যোগ করা অন্য যেকোনোটি)। |
| **Exchange rate** (বিনিময় হার) | এক ইউনিট বিদেশি মুদ্রার জন্য কত টাকা (যেমন 1 USD = ৳122.50)। হিসাবের খাতা টাকায় রাখা হয়। |
| **Branch** (শাখা) | কোম্পানির একটি অফিস (Head office (প্রধান কার্যালয়) নিজে থেকেই তৈরি হয়)। |
| **Approval** (অনুমোদন) | দ্বিতীয় কোনো ব্যক্তির সিদ্ধান্তের অপেক্ষায় থাকা একটি অনুরোধ। |

---

## 5. অফিসের পেজ

নিচের প্রতিটি পেজের জন্য দেখানো হয়েছে: **উদ্দেশ্য**, **কে খুলতে পারেন**, **অংশ ও বাটন**, **কী বদলায়**, আর **কিসের সাথে যুক্ত**।

### 5.1 Dashboard (ড্যাশবোর্ড)

**উদ্দেশ্য:** যেকোনো সময়কাল ও শাখার জন্য এক নজরে পুরো কোম্পানি: টাকা, কাজ, শেষ তারিখ, আর টিম কেমন করছে।

**কে খুলতে পারেন:** যেসব রোলের *Dashboard — See* (ড্যাশবোর্ড — দেখা) অনুমতি আছে। টাকার টাইল, চার্ট, শাখার টেবিল আর সাম্প্রতিক লেনদেন শুধু *Money figures — See* (টাকার অঙ্ক — দেখা) অনুমতি থাকলে দেখা যায়। যাদের ড্যাশবোর্ডের অনুমতি নেই, তারা সাইন ইনের পর নিজেদের খোলার অনুমতি আছে এমন প্রথম পেজ থেকে শুরু করেন।

**অংশগুলো:**
1. **Greeting** (শুভেচ্ছা) আর কথায় লেখা সময়কাল (যেমন "1–12 Nov 2026 · all branches")। **New customer** (নতুন গ্রাহক) ও **Record payment** (পেমেন্ট রেকর্ড করুন) বাটন (অনুমতি থাকলে)।
2. **Period and branch** (সময়কাল ও শাখা):
   - **Today** (আজ), **This week** (এই সপ্তাহ; সপ্তাহ শুরু হয় শনিবার), **This month** (এই মাস), **Last month** (গত মাস), **This year** (এই বছর), **Choose dates** (তারিখ বেছে নিন; থেকে–পর্যন্ত)।
   - **Branch** (শাখা; শুধু যখন একাধিক শাখা আছে এবং আপনি কোনো একটি শাখার সাথে যুক্ত নন): All branches (সব শাখা) অথবা একটি শাখা।
   - **Refresh** (রিফ্রেশ) চাপলে অঙ্কগুলো আবার লোড হয়।
3. **Money tiles** (টাকার টাইল; *Money figures* অনুমতি থাকলে):
   - **Revenue earned** (অর্জিত আয়) — সময়কালের মধ্যে অর্জিত হিসেবে ধরা আয় (হিসাব-কিতাব (Hisab Kitab)-এর আয়, ওয়েবসাইটের পেমেন্ট, সম্পন্ন ডিল; বিনিময় হারের লাভ আলাদা করে দেখানো হয়)।
   - **Expenses** (খরচ) — সময়কালের মধ্যে হওয়া খরচ।
   - **Net profit** (নিট লাভ) — আয় থেকে খরচ বাদ দিয়ে যা থাকে (ঋণাত্মক হলে "a loss" অর্থাৎ ক্ষতি লেখা থাকে)।
   - **Still to collect** (এখনও আদায় বাকি) — ইস্যু করা ইনভয়েসে গ্রাহকদের কাছে পাওনা টাকা, সাথে ওয়েবসাইটের আবেদনকারীদের কাছে তাদের আবেদনের বাকি টাকা।
   - **Advances held** (জমা থাকা অগ্রিম) — গ্রাহকদের আগেভাগে দেওয়া টাকা, যা এখনও কোনো ইনভয়েসে বসানো হয়নি।
   - **Invoiced, not yet earned** (ইনভয়েস হয়েছে, এখনও অর্জিত হয়নি) — যে ইস্যু করা ইনভয়েসগুলোর ডিল এখনও সম্পন্ন হয়নি।
4. **Work tiles** (কাজের টাইল; ড্যাশবোর্ড আছে এমন সবার জন্য; প্রতিটিতে চাপলে সংশ্লিষ্ট পেজ খোলে):
   - **Clients** (ক্লায়েন্ট; সাথে সময়কালের নতুন ক্লায়েন্ট), **Active deals** (চলমান ডিল; সাথে তাদের মূল্য), **Waiting for approval** (অনুমোদনের অপেক্ষায়), **Open tasks** (খোলা কাজ; সাথে কয়টির সময় পার হয়ে গেছে)।
   - **New website enquiries** (ওয়েবসাইটের নতুন জিজ্ঞাসা) ও **Applications in review** (পর্যালোচনাধীন আবেদন), যারা ওয়েবসাইট দেখাশোনা করেন তাদের জন্য।
5. **Income and expense chart** (আয় ও খরচের চার্ট): নীল বার = আয়, কমলা = খরচ, প্রতিদিন, প্রতি সপ্তাহ বা প্রতি মাসের হিসাবে (**Daily / Weekly / Monthly** — দৈনিক / সাপ্তাহিক / মাসিক)। কোনো বারের উপর মাউস রাখলে বা ট্যাপ করলে তার অঙ্ক দেখা যায়। **Show as table** (টেবিল আকারে দেখান) একই অঙ্কগুলো টেবিলে দেখায় (তারিখভিত্তিক সারসংক্ষেপ)।
6. **By branch** (শাখা অনুযায়ী; একাধিক শাখা থাকলে): প্রতিটি শাখার আয়, খরচ, নিট, ক্লায়েন্ট ও চলমান ডিল, আর যেসব এন্ট্রিতে কোনো শাখা দেওয়া হয়নি সেগুলোর জন্য একটি "No branch" (কোনো শাখা নেই) সারি।
7. **Recent transactions** (সাম্প্রতিক লেনদেন): সর্বশেষ 10টি জার্নাল এন্ট্রি (**Journal** (জার্নাল) লিংকে চাপলে Finance → Journal খোলে)।
8. **Tasks and follow-ups** (কাজ ও ফলো-আপ): সামনের খোলা কাজগুলো, তাদের নির্ধারিত তারিখসহ (সময় পার হলে লাল)। **Deal deadlines** (ডিলের শেষ তারিখ): শেষ তারিখ অনুযায়ী সাজানো চলমান ডিল (7 দিনের মধ্যে হলে হলুদ, তারিখ পার হয়ে গেলে লাল)।
9. **How the team is doing** (টিম কেমন করছে): সেরা তিনজন, তারপর প্রত্যেক কর্মীর জন্য একটি টেবিল: ক্লায়েন্ট, চলমান ডিল, সম্পন্ন ডিল, শেষ করা কাজ, খোলা কাজ, সময় পার হওয়া কাজ, গ্রাহকের সাথে যোগাযোগ। ক্রম ঠিক করতে প্রতিটি সম্পন্ন ডিলের জন্য 5, প্রতিটি শেষ করা কাজের জন্য 2, আর লগ করা প্রতিটি কল/WhatsApp/ইমেইল/মিটিংয়ের জন্য 1 পয়েন্ট ধরা হয়, আর সময় পার হওয়া প্রতিটি কাজের জন্য 1 পয়েন্ট কাটা হয়।

**কী বদলায়:** কিছুই না; এটি শুধু তথ্য দেখায়।
**কিসের সাথে যুক্ত:** Finance (টাকার সব অঙ্ক হিসাবের খাতা থেকে আসে), Customers, Deals, Tasks, Approvals, Enquiries, Applications।

### 5.2 Customers (গ্রাহক)

**উদ্দেশ্য:** অফিস যাদের সাথে কাজ করে তাদের সবার তালিকা (CRM), প্রথম যোগাযোগ থেকে শুরু করে বারবার আসা ক্লায়েন্ট পর্যন্ত।

**কে খুলতে পারেন:** *Customers — See* (গ্রাহক — দেখা)। Employee রোলের কর্মীরা শুধু নিজেদের গ্রাহক দেখেন; শাখার কর্মীরা নিজেদের শাখার গ্রাহক দেখেন।

#### গ্রাহকের তালিকা (/admin/customers)
- **সার্চ**: নাম, গ্রাহক নম্বর (C-…), ফোন বা ইমেইল দিয়ে।
- **ফিল্টার**: ক্যাটাগরি, স্ট্যাটাস (Lead / Active / Inactive — সম্ভাব্য / সক্রিয় / নিষ্ক্রিয়), কার দায়িত্বে (কোনো কর্মী, অথবা "Not given to anyone" — কারও দায়িত্বে নয়), শাখা, **Follow-up due** (ফলো-আপের সময় হয়েছে: যেসব গ্রাহকের পরের ফলো-আপের তারিখ এসে গেছে)।
- **টেবিল**: গ্রাহক ও নম্বর, ফোন ও WhatsApp, ক্যাটাগরি, লিডের উৎস, স্ট্যাটাস, কার দায়িত্বে, পরের ফলো-আপ (তারিখ পার হলে লাল), কয়টি ডিল ও ইনভয়েস আছে। কোনো সারিতে ক্লিক করলে সেই গ্রাহকের পেজ খোলে। ফোনে প্রতিটি সারি একটি কার্ড হিসেবে দেখায়।
- **Export CSV** (CSV এক্সপোর্ট; *Customers — Export* অনুমতি লাগে): Excel-এ খোলার জন্য তালিকাটি ডাউনলোড করে। পাসপোর্টের কলামগুলো শুধু *Passport details — See* (পাসপোর্টের তথ্য — দেখা) অনুমতি থাকলেই আসে। প্রতিটি এক্সপোর্ট অডিট লগে লেখা থাকে।
- **New customer** (নতুন গ্রাহক; *Customers — Add* অনুমতি লাগে) গ্রাহকের ফর্ম খোলে (নিচে দেখুন)।

#### গ্রাহকের ফর্ম (নতুন বা এডিট)
- **Full name** (পুরো নাম), **Phone** (ফোন; বাধ্যতামূলক), **WhatsApp** (অথবা **Same as phone** (ফোনের নম্বরই) টিক দিন), **Email** (ইমেইল), **Address** (ঠিকানা)।
- **Category** (ক্যাটাগরি; তারা কী কাজে আসেন: Education, Healthcare…) আর **Lead source** (লিডের উৎস; তারা আপনাদের খোঁজ কীভাবে পেলেন: Facebook, কারও রেফারেন্স…)। দুটো তালিকাতেই নতুন নাম যোগ করা যায়: **+ Add new…** (নতুন যোগ করুন) বেছে নিয়ে নতুন একটি লিখুন; পরের বারের জন্য সেটি রেখে দেওয়া হয়।
- **Status** (স্ট্যাটাস): Lead (সম্ভাব্য গ্রাহক), Active (সক্রিয়), Inactive (নিষ্ক্রিয়)।
- **Given to** (কার দায়িত্বে): যে কর্মী এই গ্রাহককে দেখাশোনা করেন (Employee রোলের কর্মীরা এটি দেখেন না: তাদের গ্রাহক নিজে থেকেই তাদের দায়িত্বে দেওয়া হয়)।
- **Branch** (শাখা; একাধিক শাখা থাকলে)।
- **Next follow-up** (পরের ফলো-আপ): এই তারিখ থেকে গ্রাহকটি "Follow-up due" তালিকায় দেখায়, আর যার দায়িত্বে আছেন তিনি একটি রিমাইন্ডার পান।
- **Notes** (নোট)।
- **Passport** (পাসপোর্ট; শুধু *Passport details — See* অনুমতি থাকলে): নম্বর, দেশ, মেয়াদ শেষের তারিখ।
- **একই গ্রাহক আগে আছে কি না যাচাই**: ফোন বা ইমেইলের ঘর থেকে বের হলে, একই ফোন নম্বর (শেষ 10টি অঙ্ক মিলিয়ে দেখা হয়, তাই "+880 1711-223344" আর "01711223344" একই ধরা হয়) বা একই ইমেইলের কোনো গ্রাহক থাকলে তাদের **Already a customer?** (আগে থেকেই গ্রাহক?) হিসেবে দেখানো হয়। তবুও সেভ করলে সার্ভার থেমে যায় এবং তাদের তালিকা দেখায়; জেনেশুনে সেভ করতে চাইলে **Save as a new customer anyway** (তবুও নতুন গ্রাহক হিসেবে সেভ করুন) চাপুন।
- নতুন গ্রাহক সেভ করলে তিনি পরের নম্বরটি (C-…) পান, আর তার পেজ খুলে যায়।

#### গ্রাহকের পেজ (/admin/customers/…)
- **হেডার**: নাম, নম্বর, স্ট্যাটাস, ক্যাটাগরি, কে দেখাশোনা করেন, শাখা।
- **যোগাযোগের বাটন**: **Call** (কল; ফোনের লিংক), **WhatsApp** (তাদের নম্বর দিয়ে WhatsApp খোলে; বাংলাদেশের 01… নম্বর 8801… হিসেবে লেখা হয়), **Email** (ইমেইল)।
- **কাজের বাটন** (প্রতিটি শুধু তার অনুমতি থাকলে দেখায়): **New deal** (নতুন ডিল), **New invoice** (নতুন ইনভয়েস), **Record payment** (পেমেন্ট রেকর্ড করুন), **Add document** (ডকুমেন্ট যোগ করুন), **Edit** (এডিট), **Delete** (মুছুন; শুধু এমন গ্রাহকের জন্য যার কোনো ডিল, ইনভয়েস বা পেমেন্ট নেই; সাধারণত শুধু Super Admin পারেন)।
- **ট্যাব** (খোলা ট্যাবটি ঠিকানায় (URL) রাখা থাকে, তাই একটি লিংক দিয়ে সরাসরি কোনো ট্যাব খোলা যায়):
  1. **Overview** (সারসংক্ষেপ) — কত ইনভয়েস হয়েছে, কত পরিশোধ হয়েছে ও কত এখনও বাকি (টাকায়; বিদেশি মুদ্রার ইনভয়েস তাদের নিজস্ব রেটে; *Money figures* অনুমতি থাকলে), যোগাযোগের তথ্য, পাসপোর্ট (অথবা "Hidden — needs passport permission": লুকানো, পাসপোর্টের অনুমতি লাগবে), নোট, ওয়েবসাইট অ্যাকাউন্ট যুক্ত থাকলে সেটি।
  2. **Activity** (কার্যক্রম) — গ্রাহকের ইতিহাস, নতুনগুলো আগে: কল, WhatsApp, ইমেইল, মিটিং, নোট, আর সিস্টেমের লাইন (গ্রাহক যোগ হয়েছে, পরিবর্তন হয়েছে, কাজ শেষ হয়েছে, পেমেন্ট পাওয়া গেছে…)। উপরের ফর্ম দিয়ে নতুন একটি লগ করুন: **Call / WhatsApp / Email / Meeting / Note** (কল / WhatsApp / ইমেইল / মিটিং / নোট) বেছে নিন, কী হয়েছে লিখুন, চাইলে সময় দিন, তারপর **Log …** (লগ করুন) চাপুন।
  3. **Tasks & follow-ups** (কাজ ও ফলো-আপ) — তাদের কাজগুলো; কোনোটিতে টিক দিলে সেটি শেষ হয়েছে বলে চিহ্নিত হয়; **Add follow-up** (ফলো-আপ যোগ করুন) দিয়ে নির্ধারিত তারিখ আর কে করবেন তা দিয়ে নতুন ফলো-আপ যোগ করুন।
  4. **Deals** (ডিল) — তাদের ডিলগুলো, নম্বর, স্ট্যাটাস, মোট মূল্য ও এ পর্যন্ত অর্জিত আয়সহ।
  5. **Invoices & payments** (ইনভয়েস ও পেমেন্ট) — তাদের ইনভয়েস (নম্বর, তারিখ, মোট, পরিশোধিত, বাকি, স্ট্যাটাস) ও পেমেন্ট (তারিখ, রসিদ, পদ্ধতি, পরিমাণ, কতটা ইনভয়েসে গেছে), প্রতিটি মুদ্রার আলাদা মোটসহ।
  6. **Documents** (ডকুমেন্ট) — তাদের ডকুমেন্ট, মেয়াদ ও যাচাইয়ের অবস্থাসহ (শুধু তাদের ডকুমেন্ট দেখিয়ে Documents পেজ খোলে)।
  7. **Applications** (আবেদন) — ওয়েবসাইটে করা তাদের আবেদনগুলো; প্রতিটিতে চাপলে আবেদনটি খোলে।

**কী বদলায়:** গ্রাহকের রেকর্ড; কার্যক্রমের ইতিহাস; কাজ; অডিট লগ (গ্রাহক যোগ, পরিবর্তন, মুছে ফেলা, এক্সপোর্ট)।
**কিসের সাথে যুক্ত:** Deals, Invoices, Collections, Documents, Tasks, Applications (**Add to customers** (গ্রাহক তালিকায় যোগ করুন) দিয়ে একটি আবেদন গ্রাহকের সাথে যুক্ত করা যায়), Dashboard ও রিমাইন্ডার (ফলো-আপ)।

### 5.3 Deals (ডিল)

**উদ্দেশ্য:** বিল করার আগে, গ্রাহক যা কিনতে রাজি হয়েছেন তা লিখে রাখা: সেবা ও দাম, সময়সূচি, বেঙ্গল পোর্ট কী কী করার প্রতিশ্রুতি দিচ্ছে, ক্লায়েন্ট কী কী করার প্রতিশ্রুতি দিচ্ছেন, আর শর্তাবলি। ডিল থেকেই ইনভয়েস আর প্রিন্ট করা সেবা চুক্তিপত্র তৈরি হয়, আর ডিল সম্পন্ন করলেই ইনভয়েস করা টাকা অর্জিত আয়ে পরিণত হয়।

**কে খুলতে পারেন:** *Deals — See* (ডিল — দেখা)। Employee রোলের কর্মীরা তাদের গ্রাহকদের ডিল দেখেন। মোট মূল্য শুধু *Money figures* (টাকার অঙ্ক) অনুমতি থাকলে দেখা যায়।

#### ডিলের তালিকা (/admin/deals)
- ট্যাব **All / Draft / Active / Completed / Cancelled** (সব / খসড়া / চলমান / সম্পন্ন / বাতিল), সার্চ (শিরোনাম, D-নম্বর, গ্রাহক), গ্রাহক ফিল্টার (কোনো গ্রাহকের পেজ থেকে খুললে)।
- টেবিল: ডিল ও নম্বর, গ্রাহক, স্ট্যাটাস, মোট, অর্জিত আয়, তারিখ, কার দায়িত্বে, ইনভয়েসের সংখ্যা।
- **New deal** (নতুন ডিল; *Deals — Add* অনুমতি লাগে)।

#### ডিলের ফর্ম
- **Customer** (গ্রাহক; নাম, নম্বর, ফোন বা ইমেইল দিয়ে খুঁজুন), **Deal title** (ডিলের শিরোনাম), **Service line** (সেবার ধরন; Business, Education…, সাথে **+ Add new…** (নতুন যোগ করুন)), **Currency** (মুদ্রা), **Description** (বিবরণ)।
- **Services** (সেবা): প্রতিটি সেবার জন্য একটি লাইন (সেবা, সেবার ধরন, পরিমাণ, একক দাম); লিখতে লিখতেই অঙ্ক আর মোট যোগ হয়ে যায়। নতুন লাইনের জন্য **Add a service** (সেবা যোগ করুন) চাপুন; ময়লার ঝুড়ির (বিন) বাটনে চাপলে লাইনটি মুছে যায়।
- **Start date** (শুরুর তারিখ) ও **End date** (শেষের তারিখ) (সময়সূচি; শেষের তারিখের আগে রিমাইন্ডার যায়)।
- **What Bengal Port commits to** (বেঙ্গল পোর্ট যা করার প্রতিশ্রুতি দেয়) ও **What the client commits to** (ক্লায়েন্ট যা করার প্রতিশ্রুতি দেন)।
- **Terms** (শর্তাবলি; Office settings → Reminders and terms থেকে নিজে থেকে বসে যায়; এই ডিলের জন্য বদলানো যায়)।
- **Given to** (কার দায়িত্বে) ও **Branch** (শাখা)।

#### ডিলের পেজ (/admin/deals/…)
- অঙ্ক: ডিলের মোট, কত ইনভয়েস হয়েছে, কত পরিশোধ হয়েছে, কত এখনও বাকি, অর্জিত আয়।
- অংশগুলো: Services (সেবা), Timeline (সময়সূচি: শুরু, শেষ, কত দিন বাকি), What Bengal Port commits to (বেঙ্গল পোর্টের প্রতিশ্রুতি), What the client commits to (ক্লায়েন্টের প্রতিশ্রুতি), Terms (শর্তাবলি), Invoices (ইনভয়েস; প্রতিটির স্ট্যাটাসসহ), Tasks (কাজ)।
- **বাটন** (স্ট্যাটাস ও অনুমতি অনুযায়ী):
  - **Edit** (এডিট) — Draft বা Active থাকা অবস্থায়। আগে তৈরি হওয়া ইনভয়েসগুলো নিজেদের আলাদা কপি রেখে দেয়।
  - **Activate** (চালু করুন) — কাজ শুরু হয়েছে (Draft → Active)।
  - **Make invoice** (ইনভয়েস বানান) — ডিলের সেবাগুলো থেকে একটি **draft invoice** (খসড়া ইনভয়েস) বানায়, আর যাচাই করে ইস্যু করার জন্য সেটি খুলে দেয়। অন্য মুদ্রার ডিল হলে, কোনো রেট সেভ করা না থাকলে বিনিময় হার জানতে চায়।
  - **Mark completed** (সম্পন্ন হিসেবে চিহ্নিত করুন) — কাজ শেষ। এই ডিলে যা ইনভয়েস করা হয়েছে তার সবকিছু এখন **revenue earned** (অর্জিত আয়) হিসেবে গণ্য হয় (অংশ 8 দেখুন)।
  - **Recognise part of the revenue** (আয়ের একটি অংশ অর্জিত ধরুন; *Accounts — Add* অনুমতি লাগে) — লম্বা সময়ের কাজের জন্য: ইনভয়েস করা টাকার একটি অংশ এখনই অর্জিত হিসেবে ধরুন।
  - **Cancel deal** (ডিল বাতিল করুন; কারণসহ) ও **Reopen** (আবার খুলুন)।
  - **Record payment** (পেমেন্ট রেকর্ড করুন) — এই গ্রাহকের জন্য Collections খোলে।
  - **Print agreement** (চুক্তিপত্র প্রিন্ট করুন) — লেটারহেডে সেবা চুক্তিপত্র: দুই পক্ষ, সেবা ও মোট মূল্য, সময়সূচি, দুই পক্ষের প্রতিশ্রুতি, পেমেন্টের সূচি (ডিলের ইনভয়েসগুলো তাদের নির্ধারিত তারিখসহ), শর্তাবলি, আর বেঙ্গল পোর্ট ও ক্লায়েন্টের স্বাক্ষরের লাইন।

**কী বদলায়:** ডিলের রেকর্ড; খসড়া ইনভয়েস; ডিল সম্পন্ন হলে বা আয় অর্জিত ধরা হলে হিসাবের খাতা; গ্রাহকের কার্যক্রম; রিমাইন্ডার (ডিলের শেষ তারিখ); অডিট লগ।
**কিসের সাথে যুক্ত:** Customers, Invoices, Collections, Finance, Notifications (শেষ তারিখ), Dashboard (চলমান ডিল, শেষ তারিখ, টিমের পারফরম্যান্স)।

### 5.4 Invoices (ইনভয়েস)

**উদ্দেশ্য:** খসড়া থেকে পরিশোধ পর্যন্ত প্রতিটি বিল, আর গ্রাহক যে প্রিন্ট করা ইনভয়েস হাতে পান।

**কে খুলতে পারেন:** *Invoices — See* (ইনভয়েস — দেখা)। বানাতে *Add* লাগে; খসড়া এডিট ও ইস্যু করতে *Change* লাগে; বাতিল ও ক্রেডিট নোটের জন্য *Cancel* লাগে (আর সাথে সাথে কার্যকর হতে *Approve* লাগে); শেয়ার করতে *Export* লাগে; খসড়া মোছা Super Admin-এর কাজ।

#### ইনভয়েসের ধরন
1. **Office invoices** (অফিসের ইনভয়েস) — ডিল থেকে, অথবা কোনো গ্রাহকের জন্য হাতে বানানো। ইস্যু করলে এগুলো হিসাবের খাতায় ওঠে (আমাদের পাওনা / ইনভয়েস হয়েছে, এখনও অর্জিত হয়নি)।
2. **Application invoices** (আবেদনের ইনভয়েস) — ওয়েবসাইটের কোনো আবেদন থেকে বানানো (আবেদনের ভেতরে "Generate invoice" (ইনভয়েস তৈরি করুন), অথবা ইনভয়েস ফর্মে "Fill in from an application" (আবেদন থেকে পূরণ করুন))। এগুলোতে আবেদনের পুরো ফি বিল করা হয়, আর কত টাকা পরিশোধ হয়েছে তা দেখানো হয়।
3. **Hisab Kitab invoices** (হিসাব-কিতাবের ইনভয়েস) — আয়ের কোনো এন্ট্রি থেকে বানানো (এন্ট্রির "Generate invoice")। টাকা আগেই পাওয়া গেছে, তাই ইনভয়েসে এটি পরিশোধিত হিসেবে দেখায়।
2 ও 3 নম্বর ধরন **শুধু কাগজের জন্য**: তাদের টাকা আগেই হিসাব-কিতাব (Hisab Kitab) আর ওয়েবসাইটের পেমেন্টের মাধ্যমে হিসাবের খাতায় উঠে গেছে, তাই এগুলো ইস্যু করলে টাকা দ্বিতীয়বার গোনা হয় না, আর এগুলোতে অফিসের পেমেন্ট নেওয়া যায় না।

#### ইনভয়েসের স্ট্যাটাস
| স্ট্যাটাস | অর্থ |
|---|---|
| **Draft** (খসড়া) | ইস্যু হয়নি; বদলানো বা মোছা যায়; হিসাবের খাতায় নেই। |
| **Sent** (পাঠানো হয়েছে) | ইস্যু হয়েছে, এখনও কিছু পরিশোধ হয়নি, পরিশোধের তারিখও পার হয়নি। |
| **Part paid** (আংশিক পরিশোধিত) | কিছু টাকা পাওয়া গেছে। |
| **Paid** (পরিশোধিত) | পুরো টাকা পরিশোধিত (পেমেন্ট ও ক্রেডিট নোট মিলে মোট টাকা পূরণ হয়েছে)। |
| **Overdue** (মেয়াদোত্তীর্ণ) | পরিশোধের তারিখ পার হয়ে গেছে, অথচ এখনও টাকা বাকি। |
| **Cancelled** (বাতিল) | বাতিল করা হয়েছে; যে টাকা পাওনা ছিল তা হিসাবের খাতা থেকে বাদ দেওয়া হয়েছে। |
| **Refunded** (টাকা ফেরত দেওয়া হয়েছে) | এতে যে টাকা পরিশোধ করা হয়েছিল, তা ফেরত দেওয়া হয়েছে। |

#### ইনভয়েসের তালিকা (/admin/accounts/invoices)
- ট্যাব **All / Drafts / Sent / Part paid / Paid / Overdue / Cancelled** (সব / খসড়া / পাঠানো / আংশিক পরিশোধিত / পরিশোধিত / মেয়াদোত্তীর্ণ / বাতিল), সার্চ (নম্বর, গ্রাহক, ফোন, ইমেইল), গ্রাহক ফিল্টার।
- টেবিল: নম্বর (ও ভার্সন), তারিখ, গ্রাহক, মোট, পরিশোধিত, বাকি, স্ট্যাটাস।
- **Open** (খুলুন) চাপলে প্রিন্ট করার উপযোগী ইনভয়েসটি দেখায়। **Actions** (কাজসমূহ) চাপলে ওই ইনভয়েস নিয়ে আপনি যা যা করতে পারেন সব খোলে (নিচে দেখুন)।
- **New invoice** (নতুন ইনভয়েস)।

#### ইনভয়েসের ফর্ম
- **Fill in from an application** (আবেদন থেকে পূরণ করুন; ঐচ্ছিক): কোনো আবেদন খুঁজে নিয়ে সেটির বিল করুন।
- **Customer from the customer list** (গ্রাহক তালিকা থেকে গ্রাহক; ঐচ্ছিক): নাম, ফোন, ইমেইল ও ঠিকানা পূরণ করে দেয় (এগুলো পরেও বদলানো যায়)।
- **Name on the invoice** (ইনভয়েসে যে নাম থাকবে), ফোন, ইমেইল, ঠিকানা।
- **Currency** (মুদ্রা), আর অন্য মুদ্রার জন্য **exchange rate** (বিনিময় হার; 1 ইউনিটের জন্য কত টাকা; সর্বশেষ সেভ করা রেট নিজে থেকে বসে যায়)।
- **Invoice date** (ইনভয়েসের তারিখ), **Due date** (পরিশোধের শেষ তারিখ), **Work starts** (কাজ শুরু), **Work ends** (কাজ শেষ)।
- **Services** (সেবা) লাইন (বিবরণ, পরিমাণ, একক দাম)।
- **Paid** (পরিশোধিত) — শুধু আবেদনের ও হিসাব-কিতাবের ইনভয়েসের জন্য (যে টাকা অন্য জায়গায় আগেই পাওয়া গেছে)।
- **What Bengal Port commits to** (বেঙ্গল পোর্টের প্রতিশ্রুতি), **What the client commits to** (ক্লায়েন্টের প্রতিশ্রুতি), **Terms** (শর্তাবলি; Office settings থেকে নিজে থেকে বসে যায়), **Notes** (নোট; প্রিন্টে আসে)।
- ফর্মের নিচে **Total / Paid / Due** (মোট / পরিশোধিত / বাকি) দেখায়।
- বাটন: **Cancel** (বাতিল), **Save draft** (খসড়া সেভ করুন), **Issue invoice** (ইনভয়েস ইস্যু করুন)। "After issuing, the invoice can't be edited; changes become a new version." (ইস্যু করার পর ইনভয়েস এডিট করা যায় না; কোনো পরিবর্তন করলে তা নতুন ভার্সন হয়।)

#### ইনভয়েসের উপর কাজ (Actions)
- **Open / Print** (খুলুন / প্রিন্ট) — লেটারহেডে ইনভয়েস; প্রিন্ট করুন বা PDF হিসেবে সেভ করুন।
- **Edit draft** (খসড়া এডিট) / **Issue** (ইস্যু) / **Delete draft** (খসড়া মুছুন) — শুধু খসড়ার জন্য।
- **Revise** (সংশোধন) — ইস্যু করা ইনভয়েসের জন্য: একই ফর্ম, সাথে **Reason for the change** (পরিবর্তনের কারণ; বাধ্যতামূলক) ও **Save as version N** (ভার্সন N হিসেবে সেভ করুন)। পুরোনো ভার্সনটি রেখে দেওয়া হয় (**Version history** (ভার্সনের ইতিহাস) দেখুন)। নতুন মোট অঙ্ক আগেই পরিশোধিত বা ক্রেডিট করা টাকার চেয়ে কম হতে পারে না, আর টাকা পাওয়ার পর মুদ্রা বদলানো যায় না।
- **Record payment** (পেমেন্ট রেকর্ড করুন) — এই গ্রাহক ও ইনভয়েস আগে থেকে বসানো অবস্থায় Collections খোলে।
- **Credit note** (ক্রেডিট নোট) — পাওনা টাকা কমান (বাকি টাকার সমান পর্যন্ত যেকোনো অঙ্ক, আর একটি কারণ)। *Invoices — Approve* অনুমতি না থাকলে এটি Approvals-এ অপেক্ষা করে।
- **Cancel invoice** (ইনভয়েস বাতিল) — শুধু যখন কিছুই পরিশোধ হয়নি (না হলে টাকা ফেরত দিন বা ক্রেডিট নোট দিন)। কারণ লিখতে হয়। *Approve* অনুমতি না থাকলে এটি Approvals-এ অপেক্ষা করে। খসড়া হলে বাতিলের বদলে **withdrawn** (প্রত্যাহার) করা যায়।
- **Share by WhatsApp** (WhatsApp-এ শেয়ার) — এই ইনভয়েসের একটি গোপন লিংক তৈরি করে, যা **30 দিন** চালু থাকে, আর একটি মেসেজ ও লিংকসহ WhatsApp খোলে। অন্যভাবে পাঠাতে **Copy link** (লিংক কপি করুন) চাপুন। গ্রাহক সাইন ইন ছাড়াই লিংকটি খুলতে ও প্রিন্ট করতে পারেন।
- **Version history** (ভার্সনের ইতিহাস) — আগের প্রতিটি ভার্সন: তারিখ, কে করেছেন, কারণ, পুরোনো মোট।

#### প্রিন্ট করা ইনভয়েস
লেটারহেড; "INVOICE", নম্বর, আর সংশোধনের পর "Version n"; Draft, Paid, Cancelled বা Refunded হলে একটি সিল (স্ট্যাম্প); কাকে বিল করা হয়েছে (C-নম্বরসহ), ইনভয়েসের তারিখ, পরিশোধের শেষ তারিখ, ডিল, মুদ্রা ও বিনিময় হার, স্ট্যাটাস; সময়সূচি; সেবার টেবিল; মোট, ক্রেডিট নোট, পাওয়া পেমেন্ট, বাকি টাকা; পেমেন্টের শর্ত; দুই পক্ষের প্রতিশ্রুতি; শর্তাবলি; নোট; গ্রাহকের স্বাক্ষরের লাইন আর **ইস্যুর সময় রেকর্ড হওয়া কর্তৃপক্ষের স্বাক্ষর** (নাম ও পদবি); ফুটারে "Template · Version · Issued by" (টেমপ্লেট · ভার্সন · কে ইস্যু করেছেন)।

**কী বদলায়:** ইনভয়েসের রেকর্ড, ভার্সন ও ক্রেডিট নোট; হিসাবের খাতা (ইস্যু, সংশোধন, ক্রেডিট নোট, বাতিল); শেয়ারের লিংক; নোটিফিকেশন (নতুন ইনভয়েসের খবর গ্রাহকের দায়িত্বে থাকা কর্মী ও হিসাবরক্ষকদের কাছে; পরিশোধের তারিখ কাছে এলে ও পার হয়ে গেলে রিমাইন্ডার); অডিট লগ।
**কিসের সাথে যুক্ত:** Deals, Customers, Collections, Finance, Approvals, Applications, হিসাব-কিতাব (Hisab Kitab), Office settings (স্বাক্ষর ও শর্তাবলি)।

### 5.5 Collections (আদায়)

**উদ্দেশ্য:** গ্রাহকেরা অফিসে যে টাকা দেন (নগদ, ব্যাংক ট্রান্সফার, bKash, Nagad, কার্ড, চেক), যেকোনো মুদ্রায়, তা তাদের ইনভয়েসের বিপরীতে বসানো, সাথে রসিদ ও টাকা ফেরত।

**কে খুলতে পারেন:** *Payments — See* (পেমেন্ট — দেখা)। রেকর্ড করতে *Payments — Add* লাগে; *Payments — Approve* থাকলে টাকা ফেরত সাথে সাথে হয়ে যায়, না থাকলে Approvals-এ অপেক্ষা করে।

**অংশগুলো:**
1. **Money accounts strip** (টাকার অ্যাকাউন্টের সারি): Cash in hand (হাতে নগদ), Bank account (ব্যাংক অ্যাকাউন্ট), bKash, Nagad (ও অন্যান্য), তাদের ব্যালান্সসহ (ব্যালান্স শুধু *Money figures* অনুমতি থাকলে দেখায়)।
2. **পেমেন্টের তালিকা**: সার্চ, গ্রাহক ফিল্টার; তারিখ, রসিদ নম্বর (চাপলে রসিদ খোলে), গ্রাহক, কীভাবে দিয়েছেন, পরিমাণ (অন্য মুদ্রার জন্য "≈ ৳…"), কোন কোন ইনভয়েস পরিশোধ করেছে, কত অগ্রিম বাকি আছে, কত ফেরত দেওয়া হয়েছে, স্ট্যাটাস। সর্বশেষ 200টি দেখায়; পুরোনোগুলো খুঁজতে সার্চ করুন।
3. **Record payment** (পেমেন্ট রেকর্ড করুন) প্যানেল:
   - **Customer who paid** (যে গ্রাহক টাকা দিয়েছেন), **Amount received** (পাওয়া টাকার পরিমাণ), **Currency** (মুদ্রা; অন্য মুদ্রার জন্য **Exchange rate** (বিনিময় হার)), **Paid by** (কীভাবে দিয়েছেন), **Money went into** (টাকা কোথায় জমা হয়েছে; "Paid by" দেখে নিজে থেকে বসে যায়: cash (নগদ) → Cash in hand, bank/card/cheque (ব্যাংক/কার্ড/চেক) → Bank account, bKash → bKash, Nagad → Nagad), **Reference** (রেফারেন্স; ট্রানজেকশন আইডি বা চেক নম্বর), **Date received** (টাকা পাওয়ার তারিখ), **Notes** (নোট)।
   - **Apply to invoices** (ইনভয়েসে বসান): গ্রাহকের অপরিশোধিত ইনভয়েসগুলো, সবচেয়ে পুরোনোটি আগে, প্রতিটির পাশে টাকার অঙ্ক লেখার একটি ঘর। **Fill oldest first** (পুরোনোগুলো আগে পূরণ করুন) চাপলে ঘরগুলো নিজে থেকে পূরণ হয়ে যায়। একটি পেমেন্ট শুধু একই মুদ্রার ইনভয়েস পরিশোধ করে।
   - "Applied ৳x · Kept as advance ৳y" (৳x ইনভয়েসে বসানো হয়েছে · ৳y অগ্রিম হিসেবে রাখা হয়েছে) লাইনটি দেখায় বাকি টাকার কী হবে।
   - সেভ করার পর: রসিদ নম্বর ও **Open receipt** (রসিদ খুলুন)।
4. **Payment details** (পেমেন্টের বিস্তারিত; কোনো সারিতে ক্লিক করুন): এটি কী কী পরিশোধ করেছে, **Apply advance to invoices** (অগ্রিম টাকা ইনভয়েসে বসান; অগ্রিম হিসেবে রাখা টাকা পরে কাজে লাগাতে), **Refund** (টাকা ফেরত; পরিমাণ, পদ্ধতি, কারণ), **Open receipt** (রসিদ খুলুন)।

**কী বদলায়:** পেমেন্ট ও রসিদের রেকর্ড; ইনভয়েসগুলোর পরিশোধিত অঙ্ক ও স্ট্যাটাস; হিসাবের খাতা; হিসাব-কিতাব (Hisab Kitab)-এ একটি লাইন (যাতে দিনের ক্যাশ বই পূর্ণ থাকে); গ্রাহকের কার্যক্রম; অডিট লগ।
**কিসের সাথে যুক্ত:** Customers, Invoices, Finance, হিসাব-কিতাব, Approvals (টাকা ফেরত), Receipts।

### 5.6 Finance (হিসাবের খাতা)

**উদ্দেশ্য:** কোম্পানির হিসাবের খাতা, টাকায়, ডাবল-এন্ট্রি পদ্ধতিতে রাখা। এখানকার প্রায় সবকিছু অন্য পেজগুলো থেকে নিজে থেকেই পূরণ হয়। একবার পোস্ট করা কোনো কিছু কখনও মোছা হয় না: ভুল হলে রিভার্সাল দিয়ে তা বাতিল করা হয়।

**কে খুলতে পারেন:** *Accounts — See* (হিসাবের খাতা — দেখা; সাধারণত Super Admin ও হিসাবরক্ষকেরা)।

ট্যাবগুলো (খোলা ট্যাবটি ঠিকানায় রাখা থাকে):

#### Reports (রিপোর্ট)
- সময়কাল: **This month / Last month / This year / Custom** (এই মাস / গত মাস / এই বছর / নিজের পছন্দের তারিখ); লাভ-ক্ষতি ও ব্যালান্স শিটের জন্য **Branch** (শাখা)।
- **Profit and loss** (লাভ-ক্ষতি) — সময়কালের আয়ের লাইন, খরচের লাইন, নিট লাভ বা ক্ষতি। আয় যখন অর্জিত হয়, তখনই গণ্য হয় (অংশ 8 দেখুন)।
- **Balance sheet** (ব্যালান্স শিট) — শেষ তারিখে কোম্পানির যা আছে (সম্পদ), যা দেনা (দায়), আর যা মালিকদের (মূলধন), সাথে একটি **Balanced** (মিলেছে) টিক, যখন সম্পদ = দায় + মূলধন।
- **Cash flow** (নগদ প্রবাহ) — শুরুতে কত টাকা ছিল, কত এসেছে, কত গেছে, শেষে কত আছে; নগদ, ব্যাংক ও মোবাইল ওয়ালেটের জন্য।
- **Trial balance** (ট্রায়াল ব্যালান্স) — প্রতিটি অ্যাকাউন্টের ডেবিট ও ক্রেডিটের মোট; দুই কলাম অবশ্যই সমান হতে হবে।
- **Owed to us** (আমাদের পাওনা) — অপরিশোধিত ইস্যু করা ইনভয়েস, কত দেরি হয়েছে সেই অনুযায়ী ভাগ করা: এখনও সময় হয়নি, 1–30, 31–60, 61–90, 90 দিনের বেশি দেরি; তারপর প্রতিটি ইনভয়েস ও গ্রাহক।
- **Unpaid bills** (অপরিশোধিত বিল) — হিসাব-কিতাব (Hisab Kitab)-এর যে খরচগুলো "Not paid yet" (এখনও পরিশোধ হয়নি) হিসেবে সেভ করা। **Mark paid** (পরিশোধিত হিসেবে চিহ্নিত করুন) চাপলে আপনার বেছে নেওয়া অ্যাকাউন্ট থেকে একটি বিল পরিশোধ হয়।
- লাভ-ক্ষতি, ট্রায়াল ব্যালান্স ও জার্নালের জন্য **Download CSV** (CSV ডাউনলোড)।

#### Journal (জার্নাল)
- প্রতিটি জার্নাল এন্ট্রি: নম্বর (JE-…), তারিখ, কী ছিল, কোথা থেকে এসেছে (ইনভয়েস, পেমেন্ট, হিসাব-কিতাব, ট্রান্সফার, হাতে এন্ট্রি করা…), কে করেছেন, পরিমাণ, স্ট্যাটাস (Posted / Reversed — পোস্ট করা / রিভার্স করা)। ▸ চাপলে এর ডেবিট ও ক্রেডিট লাইনগুলো দেখা যায় (অন্য মুদ্রার ক্ষেত্রে বিদেশি মুদ্রার অঙ্কও)।
- ফিল্টার: শব্দ, তারিখ, অ্যাকাউন্ট, এন্ট্রির ধরন।
- **New journal entry** (নতুন জার্নাল এন্ট্রি) — এমন বিষয়ের জন্য যা অন্য কোথাও রেকর্ড হয় না (শুরুর ব্যালান্স, মালিকের নিজের টাকা ব্যবসায় দেওয়া, সংশোধন): তারিখ, কিসের জন্য, অন্তত দুটি লাইন (অ্যাকাউন্ট, ডেবিট বা ক্রেডিট, নোট)। ডেবিট আর ক্রেডিট সমান হলেই কেবল সেভ করা যায়।
- **Reverse** (রিভার্স) — শুধু হাতে করা এন্ট্রি ও ট্রান্সফারের জন্য (বাকিগুলোর ক্ষেত্রে লেখা থাকে "Made automatically — correct it where it came from": নিজে থেকে তৈরি, যেখান থেকে এসেছে সেখানেই ঠিক করুন)। কারণ লিখতে হয়; *Accounts — Approve* অনুমতি না থাকলে এটি Approvals-এ অপেক্ষা করে।

#### Chart of accounts (অ্যাকাউন্টের তালিকা)
- সব অ্যাকাউন্ট, Assets (সম্পদ), Liabilities (দায়), Equity (মূলধন), Income (আয়), Expenses (খরচ) অনুযায়ী ভাগ করা, ব্যালান্সসহ।
- **Built-in** (আগে থেকে তৈরি) অ্যাকাউন্ট (লক করা): 1000 Cash in hand (হাতে নগদ), 1010 Bank account (ব্যাংক অ্যাকাউন্ট), 1020 bKash, 1030 Nagad, 1100 Accounts receivable (প্রাপ্য), 2000 Accounts payable (প্রদেয়), 2100 Customer advances (গ্রাহকের অগ্রিম), 2200 Deferred revenue (অনর্জিত আয়), 3000 Owner's equity (মালিকের মূলধন), 3100 Retained earnings (সংরক্ষিত মুনাফা), 4000 Service revenue (সেবা থেকে আয়), 4100 Other income (অন্যান্য আয়), 4900 Exchange gain/loss (বিনিময় হারের লাভ/ক্ষতি), 5000 General expenses (সাধারণ খরচ), 5100 Refunds (টাকা ফেরত)। হিসাব-কিতাবের প্রতিটি ক্যাটাগরি নিজের একটি অ্যাকাউন্ট পায় (আয়ের জন্য 41xx, খরচের জন্য 51xx)।
- **Add account** (অ্যাকাউন্ট যোগ করুন) / **Edit** (এডিট): চার অঙ্কের কোড, নাম, ধরন, টাকার অ্যাকাউন্টের ধরন (নগদ, ব্যাংক, মোবাইল ওয়ালেট), মুদ্রা, বিবরণ, সক্রিয় কি না।

#### Transfers (ট্রান্সফার)
নিজেদের অ্যাকাউন্টগুলোর মধ্যে টাকা সরানো (নগদ থেকে ব্যাংকে, bKash থেকে ব্যাংকে…): কোথা থেকে, কোথায়, পরিমাণ, তারিখ, নোট। সাম্প্রতিক ট্রান্সফারগুলোর তালিকা দেখায়।

#### Budgets (বাজেট)
একটি সময়কালের পরিকল্পনা: আয় বা খরচের প্রতিটি অ্যাকাউন্টের জন্য একটি অঙ্ক। প্রতিটি লাইনে দেখায় বাজেট, আসল অঙ্ক, পার্থক্য আর একটি বার (খরচের বাজেটের 90 %-এ পৌঁছালে হলুদ, 100 % পার হলে লাল; আয়ের ক্ষেত্রে লক্ষ্যে পৌঁছালে সবুজ)। **New budget** (নতুন বাজেট) / এডিট।

#### Exchange rates (বিনিময় হার)
তারিখ অনুযায়ী সেভ করা রেট (1 ইউনিটের জন্য কত টাকা)। **Add today's rate** (আজকের রেট যোগ করুন)। ওই মুদ্রায় পেমেন্ট ও ইনভয়েস রেকর্ড করার সময় সর্বশেষ রেট নিজে থেকে বসে যায়।

**কী বদলায়:** জার্নাল এন্ট্রি, অ্যাকাউন্ট, বাজেট, রেট, ট্রান্সফার; অডিট লগ।
**কিসের সাথে যুক্ত:** টাকা জড়িত সবকিছু; Dashboard তার তথ্য এখান থেকেই নেয়।

### 5.7 Hisab Kitab (হিসাব-কিতাব)

**উদ্দেশ্য:** দৈনিক ক্যাশ বই। ইনভয়েসের পেমেন্ট নয় এমন যেকোনো আসা-যাওয়া টাকা দ্রুত লিখে রাখার উপায়: ভাড়া, বেতন, বিদ্যুৎ-পানি-গ্যাসের বিল, কুরিয়ার, সরাসরি অফিসে আসা কারও পরামর্শ ফি, আর ওয়েবসাইটের কোনো আবেদনের জন্য নগদে দেওয়া টাকা। প্রতিটি এন্ট্রি নিজে থেকেই হিসাবের খাতাতেও উঠে যায়।

**কে খুলতে পারেন:** *Hisab Kitab — See* (হিসাব-কিতাব — দেখা; যোগ ও পরিবর্তন করতে *Add* / *Change* লাগে; মোছা Super Admin-এর কাজ)।

**অংশগুলো:**
1. **হেডার**: **Generate invoice** (ইনভয়েস তৈরি করুন; একটি ফাঁকা ইনভয়েস), **Record cash payment** (নগদ পেমেন্ট রেকর্ড করুন; কোনো সদস্যের আবেদনের আয়), **Add transaction** (লেনদেন যোগ করুন)।
2. **Period** (সময়কাল): **Today** (আজ), **7 days** (7 দিন), **This month** (এই মাস), অথবা একটি তারিখ। প্রতিদিনের রেকর্ড রেখে দেওয়া হয়; যেকোনো তারিখ বেছে নিয়ে সেদিনের হিসাব আবার দেখতে পারেন।
3. **অঙ্ক**: নিট লাভ বা ক্ষতি, মোট আয়, মোট খরচ, গড় লেনদেন; **Cash movement** (টাকার আসা-যাওয়া) চার্ট ও **Running net result** (চলতি নিট ফল)।
4. **Transaction ledger** (লেনদেনের খাতা): সার্চ (আইটেম, নোট বা পক্ষ), **Invoices** (ইনভয়েস; ইনভয়েসের তালিকা খোলে), **Categories** (ক্যাটাগরি), **Day as PDF** (দিনের PDF; মালিকের স্বাক্ষরসহ লেটারহেডে দিনের রিপোর্ট) অথবা **Print** (প্রিন্ট)।
   - প্রতিটি সারি: তারিখ ও সময়, আইটেম, গ্রাহক/পক্ষ (থাকলে আবেদন ও পেমেন্টের পদ্ধতিসহ), পরিমাণ × একক দাম অথবা সরাসরি মোট, টাকার অঙ্ক (+ আয়, − খরচ), আর অপরিশোধিত বিলের জন্য **Not paid yet** (এখনও পরিশোধ হয়নি)।
   - সারির বাটন: **Mark paid** (পরিশোধিত হিসেবে চিহ্নিত করুন; অপরিশোধিত বিলের জন্য: নগদ থেকে পরিশোধ হয়; ব্যাংক বা ওয়ালেট থেকে দিতে Finance → Unpaid bills ব্যবহার করুন), **Print / PDF** (প্রিন্ট / PDF; একটি এন্ট্রি ভাউচার হিসেবে), **Generate invoice** (আয়ের এন্ট্রির জন্য), **Edit** (এডিট), **Delete** (মুছুন)। কোনো পেমেন্ট বা টাকা ফেরতের মাধ্যমে তৈরি এন্ট্রিতে একটি তালা চিহ্ন থাকে: এগুলো আসলেই হাতবদল হওয়া টাকার রেকর্ড, তাই এদের টাকার অঙ্ক বদলানো যায় না (তবে লেখা, তারিখ ও ক্যাটাগরি এখনও ঠিক করা যায়)।
5. **Categories** (ক্যাটাগরি) প্যানেল: আয় ও খরচের ক্যাটাগরি যোগ করুন, নাম বদলান, মুছুন। যে ক্যাটাগরিতে এন্ট্রি আছে তার নাম বদলানো যায়, কিন্তু মোছা যায় না।

**এন্ট্রির ফর্ম ("Record money movement" — টাকার আসা-যাওয়া রেকর্ড করুন):**
- **Expense** (খরচ) অথবা **Income** (আয়)।
- **What was bought or paid for?** (কী কেনা হয়েছে বা কিসের জন্য টাকা দেওয়া হয়েছে?) / **What was the payment for?** (টাকাটা কিসের জন্য পাওয়া গেছে?)
- **Date & time** (তারিখ ও সময়), **Category** (ক্যাটাগরি; অথবা তালিকা থেকেই নতুন একটি তৈরি করুন)।
- **Customer account** (গ্রাহকের অ্যাকাউন্ট; ঐচ্ছিক): কোনো সদস্যের ওয়েবসাইট অ্যাকাউন্ট, আর তার একটি আবেদন। কোনো আবেদনের আয় হলে সেটি **ওই আবেদনের পেমেন্ট** হিসেবেও রেকর্ড হয় (তাদের ড্যাশবোর্ডে রসিদসহ); তখন **Paid by** (কীভাবে দিয়েছেন) দিয়ে পদ্ধতি বেছে নিন।
- **Paid from** (কোথা থেকে দেওয়া হয়েছে; খরচের জন্য) / **Received into** (কোথায় জমা হয়েছে; আয়ের জন্য): Cash in hand, Bank account, bKash, Nagad। খরচের ক্ষেত্রে আরও আছে **Not paid yet: a bill to pay later** (এখনও পরিশোধ হয়নি: পরে দিতে হবে এমন বিল): তখন পরিশোধিত হিসেবে চিহ্নিত না করা পর্যন্ত এটি এখানে আর Finance → Unpaid bills-এ অপরিশোধিত হিসেবে দেখায়।
- **Vendor / paid to** (বিক্রেতা / কাকে দেওয়া হয়েছে) অথবা **Customer / received from** (গ্রাহক / কার কাছ থেকে পাওয়া গেছে) (যে নামটি দেখানো হবে)।
- **Amount** (টাকার অঙ্ক): পরিমাণ × একক দাম, অথবা সরাসরি মোট।
- **Notes** (নোট)।

**কী বদলায়:** ক্যাশ বইয়ের এন্ট্রি; হিসাবের খাতা (আয়/খরচ, টাকার অ্যাকাউন্ট, অপরিশোধিত বিলের জন্য প্রদেয়); আবেদনের পেমেন্টের ক্ষেত্রে আবেদনে একটি পেমেন্ট ও রসিদও; অডিট লগ।
**কিসের সাথে যুক্ত:** Finance, Dashboard, Invoices (Generate invoice), Applications ও Website payments (আবেদনের জন্য নগদ টাকা), Documents and PDFs (দিনের রিপোর্টের স্বাক্ষর)।

### 5.8 Documents (ডকুমেন্ট)

**উদ্দেশ্য:** কোম্পানির গোপন কাগজপত্র এক জায়গায়: ক্লায়েন্টের কাগজ, ভিসার কাগজ (পাসপোর্ট, ভিসা), কর্মীদের কাগজ (NID, সার্টিফিকেট) আর কোম্পানির কাগজ (ট্রেড লাইসেন্স, ট্যাক্স)। প্রতিটির সব ভার্সন, মেয়াদ শেষের তারিখ, আর যাচাই হয়েছে কি না, তা রাখা থাকে।

**কে খুলতে পারেন:** *Documents — See* (ডকুমেন্ট — দেখা)। আপলোড করতে *Add* লাগে; যাচাই করতে *Approve* লাগে; ডাউনলোড করতে *Export* লাগে; মুছতে *Delete* লাগে। পাসপোর্ট, NID ও ভিসা শুধু *Passport details — See* অনুমতি থাকা রোলই খুলতে পারে। কোনো ডকুমেন্ট নির্দিষ্ট কয়েকটি রোলের জন্য সীমিত করা যায় ("Only these roles may open it" — শুধু এই রোলগুলো এটি খুলতে পারবে)।

**অংশগুলো:**
- ট্যাব **All / Client / Visa / Employee / Company** (সব / ক্লায়েন্ট / ভিসা / কর্মী / কোম্পানি); সার্চ; **Checked or not** (যাচাই হয়েছে কি না: waiting, verified, rejected — অপেক্ষায়, যাচাই করা, প্রত্যাখ্যাত); **Expiring in 30 days** (30 দিনের মধ্যে মেয়াদ শেষ); কোনো গ্রাহকের পেজ থেকে খুললে গ্রাহক ফিল্টার।
- টেবিল: নাম ও ধরন, নম্বর, কার ডকুমেন্ট (গ্রাহক বা কর্মী), মেয়াদ শেষ ("in 12 days" অর্থাৎ 12 দিন পর; 15 দিনের মধ্যে হলে হলুদ, 7 দিনের মধ্যে হলে বা মেয়াদ শেষ হয়ে গেলে লাল), যাচাই হয়েছে কি না, সর্বশেষ ফাইল ও ভার্সন, কে যোগ করেছেন।
- **Add document** (ডকুমেন্ট যোগ করুন): বিভাগ (Client, Visa, Employee, Company), ধরন (Passport, NID, Visa, Trade licence…, সাথে **+ Add new…** (নতুন যোগ করুন)), নাম, নম্বর, গ্রাহক (Client ও Visa-র জন্য লাগবে), কর্মী (Employee-র জন্য লাগবে), ইস্যুর তারিখ, মেয়াদ শেষের তারিখ, নোট, যে রোলগুলো এটি খুলতে পারবে, আর ফাইল (PDF, JPEG, PNG বা WebP, সর্বোচ্চ 10 MB; ছবি আগে ছোট করে নেওয়া হয়)।
- **Document details** (ডকুমেন্টের বিস্তারিত; কোনো সারিতে ক্লিক করুন): বিস্তারিত তথ্য; **প্রতিটি ভার্সন**, সাথে **View** (দেখুন) ও **Download** (ডাউনলোড); "This document is private. Opening and downloading it is recorded." (এই ডকুমেন্টটি গোপন। এটি খোলা ও ডাউনলোড করার রেকর্ড রাখা হয়।); **Upload new version** (নতুন ভার্সন আপলোড করুন; এতে এটি আবার "waiting to be checked" বা যাচাইয়ের অপেক্ষায় চলে যায়); একটি নোটসহ **Verify / Reject / Back to waiting** (যাচাই করুন / প্রত্যাখ্যান করুন / আবার অপেক্ষায় রাখুন); **Edit details** (বিস্তারিত এডিট করুন); **Delete** (মুছুন)।

**কী বদলায়:** ডকুমেন্ট ও তাদের ফাইল; যাচাইয়ের অবস্থা; অডিট লগ (প্রতিবার দেখা ও ডাউনলোডসহ); মেয়াদ শেষের রিমাইন্ডার।
**কিসের সাথে যুক্ত:** Customers (Documents ট্যাব), Notifications (মেয়াদ শেষের 15 ও 7 দিন আগে, বদলানো যায়), Office settings (রিমাইন্ডারের দিন)।

### 5.9 Tasks (কাজ)

**উদ্দেশ্য:** কী করতে হবে, কে করবেন, কবের মধ্যে: কাজ, গ্রাহকদের সাথে ফলো-আপ, আর শেষ তারিখ।

**কে খুলতে পারেন:** *Tasks — See* (কাজ — দেখা)। Employee রোলের কর্মীরা তাদের দেওয়া বা তাদের তৈরি কাজ দেখেন।

- ট্যাব **Mine** (আমার), **Everyone's open** (সবার খোলা কাজ; Employee-দের জন্য নয়), **Overdue** (সময় পার হয়েছে), **Done** (শেষ)।
- টেবিল: টিক বক্স (শেষ হিসেবে চিহ্নিত করুন / আবার খুলুন), কাজটি (ধরন, কে যোগ করেছেন, নোট), নির্ধারিত তারিখ (লাল "Overdue"), কার দায়িত্বে, কোন বিষয়ে (গ্রাহক, ডিল), স্ট্যাটাস, **Edit** (এডিট)।
- **New task** (নতুন কাজ): কী করতে হবে, ধরন (**Task / Follow-up / Deadline** — কাজ / ফলো-আপ / শেষ তারিখ), নির্ধারিত তারিখ, কার দায়িত্বে, গ্রাহক, নোট। যাকে কাজটি দেওয়া হয়, তাকে সাথে সাথে জানানো হয়।
- এডিট করার সময় আরও আছে: স্ট্যাটাস (Open / Done / Cancelled — খোলা / শেষ / বাতিল) ও **Delete** (মুছুন)।

**কী বদলায়:** কাজ; গ্রাহকের কার্যক্রম ("Done: …"); নোটিফিকেশন।
**কিসের সাথে যুক্ত:** Customers (Tasks ট্যাব), Deals, Dashboard, Notifications (সময় হলে রিমাইন্ডার)।

### 5.10 Approvals (অনুমোদন)

**উদ্দেশ্য:** ঝুঁকিপূর্ণ কাজে দ্বিতীয় একজন সিদ্ধান্ত নেন। কেউ নিজের অনুরোধ নিজে অনুমোদন করতে পারেন না।

| অনুরোধ | কে সিদ্ধান্ত নিতে পারেন |
|---|---|
| ইনভয়েস বাতিল | *Invoices — Approve* (হিসাবরক্ষক, Super Admin) |
| ক্রেডিট নোট | *Invoices — Approve* |
| পেমেন্টের টাকা ফেরত | *Payments — Approve* |
| জার্নাল এন্ট্রি রিভার্স | *Accounts — Approve* (ডিফল্টভাবে Super Admin) |

- ট্যাব **Waiting / Approved / Not approved / All** (অপেক্ষায় / অনুমোদিত / অনুমোদিত হয়নি / সব)।
- প্রতিটি অনুরোধে থাকে: এটি কী, সারসংক্ষেপ (পরিমাণ ও কারণ), কে কখন চেয়েছেন, আর ইনভয়েস, পেমেন্ট বা জার্নালের লিংক।
- **Approve** (অনুমোদন করুন; একটি "Are you sure?" জিজ্ঞাসার পর) চাপলে কাজটি সাথে সাথে হয়ে যায়, আর আপনার নাম রেকর্ড হয়; **Don't approve** (অনুমোদন করবেন না) চাপুন, চাইলে একটি নোটসহ। যেটিই হোক, যিনি অনুরোধ করেছিলেন তাকে জানানো হয়।
- যাদের *Approvals — See* অনুমতি নেই, তারা শুধু নিজেদের অনুরোধ দেখেন।

**কী বদলায়:** অনুমোদনের পর কাজটি নিজেই (বাতিল, ক্রেডিট নোট, টাকা ফেরত, রিভার্সাল) এবং সেই কাজের ফলে যা যা বদলায়; নোটিফিকেশন; অডিট লগ।
**কিসের সাথে যুক্ত:** Invoices, Collections, Finance, Notifications, Dashboard ("Waiting for approval" — অনুমোদনের অপেক্ষায়)।

### 5.11 Notifications (নোটিফিকেশন)

**উদ্দেশ্য:** আপনার নিজের রিমাইন্ডার ও খবর।

| ধরন | কাকে পাঠানো হয় | কখন |
|---|---|---|
| Payment reminder (পেমেন্টের রিমাইন্ডার) | গ্রাহকের দায়িত্বে থাকা কর্মী ও হিসাবরক্ষকেরা | কোনো ইনভয়েসের পরিশোধের তারিখ 3 দিন পরে হলে (বদলানো যায়); মেয়াদোত্তীর্ণ ইনভয়েসের জন্য সপ্তাহে একবার |
| Follow-up reminder (ফলো-আপের রিমাইন্ডার) | গ্রাহকের দায়িত্বে থাকা কর্মী (কেউ না থাকলে অনুমোদনকারীরা) | কোনো গ্রাহকের ফলো-আপের তারিখ এলে বা কোনো ফলো-আপ কাজের সময় হলে |
| Work deadline (কাজের শেষ তারিখ) | ডিল বা কাজের দায়িত্বে থাকা কর্মী | কোনো ডিল শেষ হতে 7 ও 1 দিন বাকি থাকলে (বদলানো যায়); কোনো কাজের সময় হলে |
| Document expiry (ডকুমেন্টের মেয়াদ শেষ) | যিনি আপলোড করেছেন, গ্রাহকের দায়িত্বে থাকা কর্মী, অনুমোদনকারীরা | মেয়াদ শেষের 15 ও 7 দিন আগে (বদলানো যায়) |
| New invoice (নতুন ইনভয়েস) | গ্রাহকের দায়িত্বে থাকা কর্মী ও হিসাবরক্ষকেরা | কোনো ইনভয়েস ইস্যু হলে |
| Waiting for approval (অনুমোদনের অপেক্ষায়) | যারা অনুমোদন করতে পারেন; পরে যিনি অনুরোধ করেছিলেন | অনুরোধ করা হলে; পরে সিদ্ধান্ত হলে |
| Task given to you (আপনাকে দেওয়া কাজ) | সেই ব্যক্তি | তাকে কোনো কাজ দেওয়া হলে |

- ট্যাব **All** (সব), **Unread** (না-পড়া), **What I receive** (আমি কী কী পাব)। কোনো নোটিফিকেশনে ক্লিক করলে যে বিষয়ে সেটি, তা খোলে (আর নোটিফিকেশনটি পড়া হয়ে যায়)। **Mark all as read** (সব পড়া হয়েছে হিসেবে চিহ্নিত করুন)।
- **What I receive**: প্রতিটি ধরনের জন্য **here** (এখানে) এবং/অথবা **by email** (ইমেইলে) টিক দিন (ইমেইলের জন্য মেইল সার্ভার সেট আপ থাকতে হবে)। তারপর **Save my choices** (আমার পছন্দ সেভ করুন)।
- **Send due reminders now** (বাকি রিমাইন্ডারগুলো এখনই পাঠান; *Settings — Change* অনুমতি লাগে): রিমাইন্ডার এমনিতেই প্রতি 15 মিনিটে নিজে থেকে যায়; এই বাটন যেগুলোর সময় হয়েছে সেগুলো সাথে সাথে পাঠিয়ে দেয়। একই রিমাইন্ডার কখনও দুবার যায় না।

### 5.12 Audit log (অডিট লগ)

**উদ্দেশ্য:** কে কখন কী করেছেন। এটি বদলানো বা মোছা যায় না।

- ফিল্টার: সার্চ, **About** (কোন বিষয়ে: গ্রাহক, ডিল, ইনভয়েস, পেমেন্ট, জার্নাল এন্ট্রি, অ্যাকাউন্টের তালিকা, হিসাব-কিতাব, বাজেট, বিনিময় হার, রিপোর্ট এক্সপোর্ট, ডকুমেন্ট, কর্মী ও সদস্য, রোল ও অনুমতি, শাখা, স্বাক্ষর, সেটিংস), **Done by** (কে করেছেন), **From / To** (থেকে / পর্যন্ত) তারিখ।
- প্রতিটি লাইনে: কখন, কে (ও তার রোল), কী হয়েছে (রেকর্ডের লিংকসহ), পরিবর্তনগুলো (পুরোনো → নতুন মান), আর কম্পিউটারের ঠিকানা (IP)।
- **Show older entries** (পুরোনো এন্ট্রি দেখান) চাপলে আরও লোড হয়।

### 5.13 Office settings (অফিস সেটিংস)

**উদ্দেশ্য:** Super Admin-এর নিয়ন্ত্রণ। প্রতিটি ট্যাবের জন্য আলাদা অনুমতি লাগে।

1. **Staff** (কর্মী; *Users — Change* অনুমতি লাগে): প্রত্যেক কর্মী, তার **role** (রোল), **branch** (শাখা) আর **All branches** (সব শাখা; সব শাখার তথ্য দেখতে পারবেন) সহ। রোল বদলালে আগে জিজ্ঞেস করা হয়, নতুন রোল কার্যকর করতে ওই ব্যক্তিকে সাইন আউট করে দেওয়া হয়, আর বিষয়টি রেকর্ড হয়। আপনি নিজের রোল বদলাতে পারবেন না; শুধু একজন Super Admin আরেকজনকে Super Admin বানাতে পারেন। নতুন কর্মী যোগ করা হয় **Users** (ব্যবহারকারী; ওয়েবসাইট গ্রুপে) থেকে, একটি রোলসহ।
2. **Roles and permissions** (রোল ও অনুমতি; *Roles — Change* অনুমতি লাগে): Manager, Accountant, Employee বা Moderator বেছে নিন, তারপর ওই রোল কী কী করতে পারবে তা একটি একটি করে টিক দিন (Office, Website, Running the admin — অফিস, ওয়েবসাইট, অ্যাডমিন চালানো)। পরিবর্তনটি সাথে সাথে ওই রোলের সবার জন্য কার্যকর হয়। সোনালি একটি বিন্দু দেখায় কোথায় স্ট্যান্ডার্ড থেকে বদলানো হয়েছে; ঢাল চিহ্ন দেখায় কোনগুলো সংবেদনশীল অনুমতি; **Put … back to standard** (… আবার স্ট্যান্ডার্ডে ফিরিয়ে নিন) ওই রোলের জন্য আপনার করা পরিবর্তনগুলো বাতিল করে।
3. **Branches** (শাখা; *Branches — Change* অনুমতি লাগে): অফিস যোগ বা এডিট করুন: ছোট কোড (2–12টি অক্ষর বা অঙ্ক), নাম, ঠিকানা, ফোন, খোলা/বন্ধ। বন্ধ শাখার রেকর্ড রেখে দেওয়া হয়।
4. **Signature** (স্বাক্ষর; *Signature — Change* অনুমতি লাগে): **ইনভয়েসে প্রিন্ট হওয়া কর্তৃপক্ষের স্বাক্ষর**।
   - নতুন যোগ করুন: যিনি স্বাক্ষর করছেন তার নাম ও পদবি, আর একটি ছবি (PNG বা JPEG; সাদা কাগজে স্বাক্ষর করুন, সোজা করে ছবি তুলুন, চারপাশের বাড়তি অংশ কেটে ফেলুন)।
   - নতুন একটি যোগ করলে পুরোনোটি বাদ হয়ে যায়; আগে ইস্যু হওয়া ইনভয়েসগুলোতে ইস্যুর সময়ের স্বাক্ষরই থেকে যায়।
   - **Stop using it** (এটি আর ব্যবহার করবেন না) চাপলে নতুন ইনভয়েসে হাতে স্বাক্ষর করার জন্য একটি ফাঁকা লাইন থাকে।
   - কোনো স্বাক্ষর ব্যবহার হচ্ছে না, কিন্তু Documents and PDFs-এ একটি সেভ করা আছে, এমন হলে এই ট্যাবে **Use it on invoices** (ইনভয়েসে এটি ব্যবহার করুন) অপশন দেখায়।
   - শুধু *Authority signature — Use* (কর্তৃপক্ষের স্বাক্ষর — ব্যবহার) অনুমতি থাকা রোলই এই স্বাক্ষরসহ ইনভয়েস ইস্যু করে।
5. **Reminders and terms** (রিমাইন্ডার ও শর্তাবলি; *Settings — Change* অনুমতি লাগে): ডকুমেন্টের মেয়াদ শেষের কত দিন আগে সতর্ক করা হবে (15, 7), ইনভয়েসের পরিশোধের তারিখের কত দিন আগে মনে করানো হবে (3), ডিলের শেষ তারিখের কত দিন আগে সতর্ক করা হবে (7, 1), গ্রাহকেরা কোন কোন মুদ্রায় টাকা দেন (BDT সবসময় থাকে), আর ইনভয়েস ও চুক্তিপত্রে প্রিন্ট হওয়া **standard terms** (স্ট্যান্ডার্ড শর্তাবলি; বাতিল, টাকা ফেরত, অতিরিক্ত চার্জ)।

**কী বদলায়:** ব্যবহারকারীদের রোল ও শাখা; অনুমতি; শাখা; স্বাক্ষর; সেটিংস; অডিট লগ।

---

## 6. ওয়েবসাইটের পেজ

### 6.1 Enquiries (জিজ্ঞাসা)
**উদ্দেশ্য:** ওয়েবসাইটের যোগাযোগ ও জিজ্ঞাসার ফর্ম দিয়ে পাঠানো প্রশ্ন (General, Business, Education, Healthcare, Umrah — সাধারণ, ব্যবসা, শিক্ষা, চিকিৎসা, উমরাহ)।
- টেবিল: ব্যক্তি, বিভাগ (ডিভিশন), যোগাযোগ, মেসেজ, **status** (স্ট্যাটাস; সারিতেই বদলান: Draft (খসড়া), Submitted (জমা হয়েছে), In review (পর্যালোচনাধীন), Approved (অনুমোদিত), Rejected (প্রত্যাখ্যাত), Cancelled (বাতিল)), কবে এসেছে।
- সার্চ, **Export to Excel** (Excel-এ এক্সপোর্ট)।
- সারির বাটন: **View** (দেখুন; সব বিস্তারিত, মেসেজ, আর **Staff notes** (কর্মীদের নোট): যে নোট শুধু কর্মীরা দেখতে পান), **Print / PDF** (প্রিন্ট / PDF; লেটারহেডে জিজ্ঞাসাটি), **Delete** (মুছুন)।
- স্ট্যাটাস বদলালে সাথে সাথে সেভ হয়ে যায়। সাইন ইন করা কোনো সদস্য জিজ্ঞাসা পাঠালে সেটি তার অ্যাকাউন্টের সাথে যুক্ত থাকে।

### 6.2 Applications (আবেদন)
**উদ্দেশ্য:** কোনো সেবার জন্য পূরণ করা আবেদন ফর্ম (Business, Education, Healthcare, Umrah — ব্যবসা, শিক্ষা, চিকিৎসা, উমরাহ), তাদের ডকুমেন্ট ও পেমেন্টসহ।
- টেবিল: রেফারেন্স (BP-…), আবেদনকারী, ধরন, যোগাযোগ, **status** (স্ট্যাটাস: Draft (খসড়া), Submitted (জমা হয়েছে), In review (পর্যালোচনাধীন), Approved (অনুমোদিত), Rejected (প্রত্যাখ্যাত), Cancelled (বাতিল); স্ট্যাটাস বদলালে আবেদনকারীকে ইমেইল যায়), কবে জমা হয়েছে।
- সার্চ, **Export to Excel** (Excel-এ এক্সপোর্ট)।
- **View** (দেখুন) চাপলে আবেদনটি খোলে:
  - **Payment** (পেমেন্ট): কত পরিশোধ হয়েছে, কত বাকি, **Amount due** (দেয় টাকা: আবেদনের খরচ কত; Super Admin বা হিসাবরক্ষক ঠিক করেন, তারপর **Save amount** (টাকার অঙ্ক সেভ করুন))। গ্রাহক এটি পুরোটা বা কিছু অংশ, অনলাইনে বা অফিসে এসে দিতে পারেন।
  - **Generate invoice** (ইনভয়েস তৈরি করুন; একটি আবেদনের ইনভয়েস), **Add to customers** (গ্রাহক তালিকায় যোগ করুন; অফিসের গ্রাহক তালিকায় গ্রাহক তৈরি করে বা আগে থেকে থাকলে খুঁজে বের করে, আর আবেদন ও তার পেমেন্টগুলো তার সাথে যুক্ত করে দেয়; তারপর **Open C-…** (C-… খুলুন))।
  - আবেদনকারীর আপলোড করা **Documents** (ডকুমেন্ট; ডাউনলোড করা যায়)।
  - সব উত্তর, ফর্মের মতোই ভাগ করে সাজানো। ভুল ঠিক করতে **Edit answers** (উত্তর এডিট করুন); **Print / PDF** (প্রিন্ট / PDF) চাপলে পূরণ করা ফর্মটি লেটারহেডে প্রিন্ট হয়।
  - **Staff notes** (কর্মীদের নোট)।
- **Delete** (মুছুন) চাপলে আবেদনটি তার ডকুমেন্ট ও নোটসহ মুছে যায় (সাধারণত শুধু Super Admin পারেন)।
- /admin/applications?open=ID ধরনের লিংক দিয়ে সরাসরি একটি আবেদন খোলা যায় (গ্রাহকের পেজ এটি ব্যবহার করে)।

### 6.3 Opportunities, Suppliers, Factories, Education, Healthcare (সুযোগ, সরবরাহকারী, কারখানা, শিক্ষা, চিকিৎসা)
**উদ্দেশ্য:** পাবলিক ওয়েবসাইটে দেখানো তালিকাগুলো।
- **Opportunities** (সুযোগ): শিরোনাম, ক্যাটাগরি (সাথে **+ Create new category** (নতুন ক্যাটাগরি তৈরি করুন)), জায়গা, শেষ তারিখ, বিবরণ, ছবি, **Visibility** (দৃশ্যমানতা: প্রকাশিত নাকি লুকানো)।
- **Suppliers** (সরবরাহকারী) ও **Factories** (কারখানা): নাম, দেশ, শিল্পখাত, পণ্য বা সেবা, বিবরণ, কার্ডের ছবি, **Feature this partner** (এই পার্টনারকে বিশেষভাবে দেখান; এদের সবার আগে দেখানো হয়)।
- **Education** (শিক্ষা): শিক্ষাপ্রতিষ্ঠান, সাথে দেশ, প্রোগ্রাম, বিবরণ ও একাধিক ছবি (Education পেজগুলোতে স্লাইডশো হিসেবে দেখায়)।
- **Healthcare** (চিকিৎসা): হাসপাতাল, সাথে জায়গা (দেশ ও শহর), সেবা, বিবরণ ও একাধিক ছবি (Healthcare-এর দেশভিত্তিক পেজগুলোতে দেখায়)।
- প্রতিটি পেজে: সার্চ, টেবিল, **Add …** (… যোগ করুন), **Edit** (এডিট), **Delete** (মুছুন)। ছবি আপলোড করা যায় (নিজে থেকে ছোট করে WebP-তে রূপান্তর করা হয়) অথবা Media library (মিডিয়া লাইব্রেরি) থেকে বেছে নেওয়া যায়।

### 6.4 Users (ব্যবহারকারী)
**উদ্দেশ্য:** যারা সাইন ইন করতে পারেন তারা সবাই: ওয়েবসাইটের সদস্য ও কর্মী।
- টেবিল: নাম, ইমেইল, ফোন, **role** (রোল; সারিতেই বদলান: Member (সদস্য), Employee (কর্মী), Accountant (হিসাবরক্ষক), Manager (ম্যানেজার), Moderator (website) (মডারেটর; ওয়েবসাইট), Super Admin / CEO (সুপার অ্যাডমিন / প্রধান নির্বাহী)), কার্যক্রম, কবে যোগ দিয়েছেন, প্রবেশাধিকার।
- **Add user** (ব্যবহারকারী যোগ করুন): নাম, ইমেইল, ফোন, রোল। তারা একটি অস্থায়ী পাসওয়ার্ডসহ ইমেইল পান, আর প্রথম সাইন ইনের সময় নিজের পাসওয়ার্ড ঠিক করে নিতে হয়। কাউকে কর্মীর রোল দিতে *Roles — Change* (রোল — পরিবর্তন) অনুমতি লাগে; শুধু একজন Super Admin আরেকজন Super Admin বানাতে পারেন; কেউ নিজের রোল বদলাতে পারেন না। রোল বদলালে ওই ব্যক্তি সাইন আউট হয়ে যান, আর বিষয়টি অডিট লগে রেকর্ড হয়।
- **Block** (ব্লক) / **Unblock** (আনব্লক): ব্লক করা ব্যক্তি সাইন ইন করতে পারেন না, আর সব জায়গা থেকে সাইন আউট হয়ে যান; তার রেকর্ড রেখে দেওয়া হয়।

### 6.5 Website payments (ওয়েবসাইটের পেমেন্ট)
**উদ্দেশ্য:** আবেদনের জন্য পেমেন্ট, অনলাইনে (bKash, Nagad) করা অথবা অফিসে রেকর্ড করা।
- টেবিল: গ্রাহক, সেবা, পরিমাণ, পদ্ধতি, বাকি টাকা, স্ট্যাটাস (Paid (পরিশোধিত), Partly paid (আংশিক পরিশোধিত), Due (বাকি), Pending (প্রক্রিয়াধীন), Failed (ব্যর্থ), Refunded (টাকা ফেরত দেওয়া হয়েছে)), তারিখ।
- **Refund** (টাকা ফেরত) / **Refunds** (ফেরতের তালিকা): পুরো টাকা বা কিছু অংশ ফেরত দিন (bKash বা Nagad-এ দেওয়া হলে সেই পথেই, অথবা হাতে ফেরত দিয়ে তা রেকর্ড করুন); টাকা ফেরতের ইতিহাস।
- পাওয়া প্রতিটি পেমেন্ট আর সম্পন্ন প্রতিটি টাকা ফেরত নিজে থেকেই হিসাব-কিতাব (Hisab Kitab)-এ এন্ট্রি হয়ে যায় ("Service payments" (সেবার পেমেন্ট) / "Refunds" (টাকা ফেরত)), তাই এগুলো হিসাবের খাতায় থাকে।

### 6.6 Receipts (রসিদ)
**উদ্দেশ্য:** প্রতিটি পেমেন্টের জন্য তৈরি রসিদ: রসিদ নম্বর, গ্রাহক, পরিশোধিত টাকা, বাকি টাকা, তারিখ। প্রিন্ট করতে যেকোনো একটি খুলুন। গ্রাহকেরা তাদের ড্যাশবোর্ডে নিজেদের রসিদ দেখতে পান।

### 6.7 Reviews (রিভিউ)
**উদ্দেশ্য:** প্রতিটি সেবার জন্য গ্রাহকদের রিভিউ। যে সদস্যরা কোনো সেবার জন্য টাকা দিয়েছেন, তারা নিজেদের ড্যাশবোর্ড থেকে রিভিউ লিখতে পারেন।
- প্রতিটি রিভিউতে: দেখানোর নাম, সেবা, রেটিং, লেখা, ছবি। ওয়েবসাইটে দেখাতে **Approve** (অনুমোদন করুন), নামিয়ে নিতে **Hide** (লুকান); এছাড়া এডিট করা, ছবি সরানো, মুছে ফেলা।
- **Add a review you received outside the website** (ওয়েবসাইটের বাইরে পাওয়া রিভিউ যোগ করুন; যেমন WhatsApp-এ পাওয়া রিভিউ)।

### 6.8 Website content and Media library (ওয়েবসাইটের কনটেন্ট ও মিডিয়া লাইব্রেরি)
- **Website content** (ওয়েবসাইটের কনটেন্ট) দিয়ে হোম পেজ আর প্রতিটি পেজে থাকা সাধারণ অংশগুলো এডিট করা যায়: Logo and name (লোগো ও নাম), Utility bar (একেবারে উপরের ছোট বার), Menu (মেনু), Hero heading (প্রধান শিরোনাম), Introduction (পরিচিতি), Statistics (পরিসংখ্যান), Division cards (বিভাগের কার্ড), Pathways (পথ), Process (প্রক্রিয়া), Featured items (বিশেষ আইটেম), Trust points (আস্থার কারণ), Closing call to action (শেষের আহ্বান), Footer (ফুটার), WhatsApp button (WhatsApp বাটন)। প্রতিটি অংশের একটি ফর্ম আছে; **Advanced JSON** (অ্যাডভান্সড JSON) শুধু অভিজ্ঞদের জন্য।
- **Media library** (মিডিয়া লাইব্রেরি): ছবি একবার আপলোড করে যেকোনো জায়গায় বারবার ব্যবহার করুন।

### 6.9 Page editors (পেজ এডিটর)
**Business page** (ব্যবসার পেজ), **Education page** (শিক্ষার পেজ), **Healthcare page** (চিকিৎসার পেজ), **Umrah page** (উমরাহর পেজ), **About page** (আমাদের সম্পর্কে পেজ), **Services page** (সেবার পেজ), **Contact page** (যোগাযোগের পেজ), **Opportunities page** (সুযোগের পেজ), **Apply page** (আবেদনের পেজ), **Pay page** (পেমেন্টের পেজ), **Sign-in page** (সাইন ইন পেজ), **Privacy Policy** (গোপনীয়তা নীতি), **Terms of Use** (ব্যবহারের শর্তাবলি): প্রতিটি দিয়ে ওই পাবলিক পেজের লেখা ও ছবি একটি ফর্মের মাধ্যমে এডিট করা যায় (**Form editor** (ফর্ম এডিটর); অভিজ্ঞদের জন্য **Advanced JSON** (অ্যাডভান্সড JSON))। **Save changes** (পরিবর্তন সেভ করুন) চাপলে সাথে সাথে ওয়েবসাইটে প্রকাশ হয়ে যায়। এর মধ্যে অন্য কেউ একই পেজ সেভ করে থাকলে, তাদের কাজের উপর লিখে না দিয়ে আপনাকে জানানো হয়।

### 6.10 Documents and PDFs (ডকুমেন্ট ও PDF)
প্রতিটি প্রিন্টের সেটিংস (ইনভয়েস, রসিদ, চুক্তিপত্র, আবেদন, জিজ্ঞাসা, হিসাব-কিতাব (Hisab Kitab)): **letterhead** (লেটারহেড; বেঙ্গল পোর্টের নিজস্ব লেটারহেড, আপনার সাবটাইটেল, ট্যাগলাইন ও ওয়েবসাইটসহ; অথবা নিজের ছবি আপলোড করুন), আর **signatures** (স্বাক্ষর): গ্রাহকের লেবেল, আর মালিকের নাম, পদবি ও স্বাক্ষরের ছবি, যা আবেদন, জিজ্ঞাসা ও হিসাব-কিতাবের রিপোর্টে ব্যবহার হয়। (ইনভয়েসে ব্যবহার হয় Office settings → Signature (অফিস সেটিংস → স্বাক্ষর)-এর কর্তৃপক্ষের স্বাক্ষর।)

### 6.11 Settings (সেটিংস)
- **Service fees** (সেবার ফি): প্রতিটি বিভাগের জন্য, নতুন আবেদনে কত ফি দিতে হবে, গ্রাহকদের কাছে সেটি কীভাবে দেখানো হবে, আর আংশিক পেমেন্ট সর্বনিম্ন কত হতে পারবে।
- **System status** (সিস্টেমের অবস্থা): পেজ খোলার সময় ডাটাবেস, ইমেইল, bKash, Nagad ও ব্যাকআপ টুল ঠিকমতো কাজ করছে কি না তার দ্রুত যাচাই।
- **Backup** (ব্যাকআপ): ডাটাবেসের একটি পূর্ণ কপি ডাউনলোড করুন।

---

## 7. My profile (আমার প্রোফাইল)
**/profile** পেজে (মেনুর নিচের লিংক): আপনার নাম, ফোন ও অন্যান্য তথ্য; **Email and password** (ইমেইল ও পাসওয়ার্ড; পাসওয়ার্ড বদলালে অন্য ডিভাইসগুলো থেকে আপনি সাইন আউট হয়ে যান); **Enable 2FA / Disable 2FA** (2FA চালু / বন্ধ করুন; চালু থাকলে সাইন ইনের সময় ইমেইলে একটি কোড আসে)।

---

## 8. হিসাবের খাতা কীভাবে চলে

বেঙ্গল পোর্ট **টাকায়, ডাবল-এন্ট্রি পদ্ধতিতে হিসাবের খাতা** রাখে। এই এন্ট্রিগুলো আপনাকে কখনও নিজে করতে হয় না: প্রতিটি পেজ নিজেই এগুলো পোস্ট করে। নিচের টেবিলে দেখানো হলো প্রতিটি কাজে খাতায় কী লেখা হয়।

| কাজ | ডেবিট (বাড়ে) | ক্রেডিট | এর মানে |
|---|---|---|---|
| অফিসের ইনভয়েস ইস্যু | Accounts receivable (প্রাপ্য) | Deferred revenue (অনর্জিত আয়) | গ্রাহকের কাছে আমাদের টাকা পাওনা; কাজ এখনও শেষ হয়নি, তাই আয় এখনও অর্জিত হয়নি। |
| ইনভয়েসের বিপরীতে পেমেন্ট বসানো | Cash / Bank / bKash / Nagad (নগদ / ব্যাংক / bKash / Nagad) | Accounts receivable | গ্রাহক তার দেনা পরিশোধ করেছেন। |
| পেমেন্ট অগ্রিম হিসেবে রাখা | Cash / Bank / bKash / Nagad | Customer advances (গ্রাহকের অগ্রিম) | গ্রাহকের টাকা আমাদের কাছে আছে; কাজ শেষ না হওয়া পর্যন্ত এটি তাকে ফেরত দেওয়ার দায় আমাদের। |
| পরে অগ্রিম টাকা ইনভয়েসে বসানো | Customer advances | Accounts receivable | অগ্রিম টাকা দিয়ে ইনভয়েস পরিশোধ হলো। |
| ডিল সম্পন্ন / আয় অর্জিত ধরা | Deferred revenue | Service revenue (সেবা থেকে আয়) | কাজ শেষ: ইনভয়েস করা টাকা এখন অর্জিত। |
| ক্রেডিট নোট বা বাতিল | Deferred revenue | Accounts receivable | গ্রাহকের দেনা কমলো। |
| ভিন্ন বিনিময় হারে পরিশোধ | — | Exchange gain/loss (বিনিময় হারের লাভ/ক্ষতি) | টাকার অঙ্কে যে পার্থক্য হয়, সেটুকু। |
| টাকা ফেরত | Customer advances (তারপর Refunds (টাকা ফেরত)) | Cash / Bank / … | টাকা ফেরত দেওয়া হলো। |
| হিসাব-কিতাব (Hisab Kitab)-এর আয় | Cash / Bank / bKash / Nagad | ক্যাটাগরির আয়ের অ্যাকাউন্ট | টাকা পাওয়া গেল। |
| হিসাব-কিতাবের খরচ, পরিশোধিত | ক্যাটাগরির খরচের অ্যাকাউন্ট | Cash / Bank / bKash / Nagad | টাকা খরচ হলো। |
| হিসাব-কিতাবের খরচ, এখনও পরিশোধ হয়নি | ক্যাটাগরির খরচের অ্যাকাউন্ট | Accounts payable (প্রদেয়) | আমাদের দিতে হবে এমন একটি বিল। |
| অপরিশোধিত বিল পরিশোধিত হিসেবে চিহ্নিত | Accounts payable | Cash / Bank / bKash / Nagad | বিলটি পরিশোধ হলো। |
| ওয়েবসাইটের পেমেন্ট / টাকা ফেরত | হিসাব-কিতাবের মাধ্যমে (Service payments / Refunds) | | টাকা পাওয়ার সময়েই গণ্য হয়। |
| ট্রান্সফার | যে অ্যাকাউন্টে টাকা গেছে | যে অ্যাকাউন্ট থেকে টাকা এসেছে | আমাদের নিজেদের অ্যাকাউন্টের মধ্যে টাকা সরানো হলো। |
| সংশোধন | মূল এন্ট্রির ঠিক উল্টো | | একটি রিভার্সাল, কখনও মুছে ফেলা নয়। |

**আয় কখন গণ্য হয়:**
- ওয়েবসাইটের পেমেন্ট ও হিসাব-কিতাবের আয় গণ্য হয় **টাকা পাওয়ার সময়**।
- অফিসের ইনভয়েস গণ্য হয় **কাজ শেষ হলে**: ইনভয়েস ইস্যু করা মানে "ইনভয়েস হয়েছে, এখনও অর্জিত হয়নি"; ডিলে **Mark completed** (সম্পন্ন হিসেবে চিহ্নিত করুন) চাপলে (অথবা **Recognise part of the revenue** (আয়ের একটি অংশ অর্জিত ধরুন) দিলে) তা অর্জিত হয়।
- আবেদনের ও হিসাব-কিতাবের ইনভয়েস শুধু কাগজের জন্য (তাদের টাকা আগেই গোনা হয়ে গেছে)।

**বিদেশি মুদ্রা:** প্রতিটি পেমেন্ট ও ইনভয়েস তার মুদ্রা, বিনিময় হার ও তারিখ সংরক্ষণ করে; হিসাবের খাতায় টাকার অঙ্ক আর মূল মুদ্রার অঙ্ক দুটোই দেখায়।

**হিসাবের খাতা শুরু হয় ফাঁকা অবস্থায়।** এই ভার্সনের আগে বানানো ইনভয়েসগুলো খাতায় নেই। শুরুর ব্যালান্স আনতে (প্রথম দিনে হাতে থাকা নগদ, আগে থেকে পাওনা টাকা) **Finance → Journal → New journal entry** (হিসাবের খাতা → জার্নাল → নতুন জার্নাল এন্ট্রি) ব্যবহার করুন।

---

## 9. যা নিজে থেকেই হয়

- **নম্বর**: গ্রাহক C-000001…, ডিল D-000001…, ইনভয়েস INV-000001…, ক্রেডিট নোট CN-000001…, জার্নাল এন্ট্রি JE-000001…, রসিদ BPR-বছর-কোড, আবেদন BP-কোড।
- **রিমাইন্ডার** প্রতি 15 মিনিটে (5.11 দেখুন); একই রিমাইন্ডার কখনও দুবার যায় না।
- **ইমেইল**: আবেদনের স্ট্যাটাস বদল, নতুন অ্যাকাউন্টের অস্থায়ী পাসওয়ার্ড, পাসওয়ার্ড রিসেট, আর বেছে নিলে নোটিফিকেশন (সবগুলোর জন্য মেইল সার্ভার লাগে)।
- **হিসাবের খাতা**: টাকার প্রতিটি ধাপ খাতায় পোস্ট হয় (অংশ 8)।
- **হিসাব-কিতাব (Hisab Kitab)**: ওয়েবসাইটের পেমেন্ট, টাকা ফেরত ও অফিসের পেমেন্ট দিনের ক্যাশ বইয়ে উঠে যায়।
- **স্বাক্ষর**: একটি ইনভয়েস ইস্যুর সময় যে কর্তৃপক্ষের স্বাক্ষর চালু ছিল, সেটিই রেকর্ড করে রাখে।
- **অডিট লগ**: প্রতিটি পরিবর্তন, প্রতিটি এক্সপোর্ট, আর গোপন ডকুমেন্ট প্রতিবার খোলা বা ডাউনলোড করা।
- **ছবি**: আপলোড করা ছবি ছোট করে WebP-তে রূপান্তর করা হয়।

---

## 10. প্রতিদিনের কাজ, ধাপে ধাপে

**নতুন একজন ক্লায়েন্ট অফিসে এসেছেন**
1. Customers (গ্রাহক) → **New customer** (নতুন গ্রাহক): নাম, ফোন, ক্যাটাগরি, লিডের উৎস, কার দায়িত্বে, পরের ফলো-আপ।
2. তার পেজে → **Activity** (কার্যক্রম): কী কথা হলো তা লগ করুন।

**তিনি একটি সেবা নিতে রাজি হয়েছেন**
1. তার পেজে → **New deal** (নতুন ডিল): সেবা ও দাম, শুরু ও শেষের তারিখ, দুই পক্ষের প্রতিশ্রুতি।
2. ডিলে → **Activate** (চালু করুন), তারপর দুই পক্ষের স্বাক্ষরের জন্য **Print agreement** (চুক্তিপত্র প্রিন্ট করুন)।

**বিল করুন**
1. ডিলে → **Make invoice** (ইনভয়েস বানান) → যাচাই করুন → **Issue invoice** (ইনভয়েস ইস্যু করুন)।
2. Invoices (ইনভয়েস) → **Actions** (কাজসমূহ) → **Share by WhatsApp** (WhatsApp-এ শেয়ার) (অথবা প্রিন্ট করে হাতে দিন)।

**তিনি টাকা দিচ্ছেন**
1. Collections (আদায়) → **Record payment** (পেমেন্ট রেকর্ড করুন) (অথবা ইনভয়েসের **Record payment**): পরিমাণ, পদ্ধতি, **Fill oldest first** (পুরোনোগুলো আগে পূরণ করুন) → **Record payment**।
2. **Open receipt** (রসিদ খুলুন) চেপে রসিদটি তাকে দিন।

**কাজ শেষ হয়েছে**
- ডিলে → **Mark completed** (সম্পন্ন হিসেবে চিহ্নিত করুন)।

**ইনভয়েস তৈরির আগেই তিনি টাকা দিয়েছেন**
- কোনো ইনভয়েস ছাড়াই পেমেন্টটি রেকর্ড করুন: এটি তার অগ্রিম হিসেবে জমা থাকবে। ইনভয়েস ইস্যু হলে পেমেন্টটি খুলুন → **Apply advance to invoices** (অগ্রিম টাকা ইনভয়েসে বসান)।

**ইনভয়েস ইস্যুর পর ছাড় দেওয়া**
- Invoices → Actions → **Credit note** (ক্রেডিট নোট; পরিমাণ ও কারণ)।

**ইস্যুর পর দাম বদলেছে**
- Invoices → Actions → **Revise** (সংশোধন): পরিবর্তন করুন, কারণ লিখুন, **Save as version 2** (ভার্সন 2 হিসেবে সেভ করুন)।

**একজন শিক্ষার্থী মার্কিন ডলারে টাকা দিচ্ছেন**
- Record payment → মুদ্রা **USD**, বিনিময় হার (সর্বশেষ রেট থেকে নিজে থেকে বসে যায়) → এটি USD ইনভয়েসের বিপরীতে পরিশোধ হয়।

**ব্যাংক ট্রান্সফারে ভাড়া দেওয়া হয়েছে**
- হিসাব-কিতাব (Hisab Kitab) → **Add transaction** (লেনদেন যোগ করুন) → Expense (খরচ) → ক্যাটাগরি Rent (ভাড়া) → **Paid from: Bank account** (কোথা থেকে দেওয়া: ব্যাংক অ্যাকাউন্ট)।

**আগামী সপ্তাহে বিদ্যুৎ বিল দিতে হবে**
- হিসাব-কিতাব → Add transaction → Expense → **Paid from: Not paid yet** (কোথা থেকে দেওয়া: এখনও পরিশোধ হয়নি) → পরে **Mark paid** (পরিশোধিত হিসেবে চিহ্নিত করুন) (অথবা Finance (হিসাবের খাতা) → Unpaid bills (অপরিশোধিত বিল) → ব্যাংক থেকে Mark paid)।

**ওয়েবসাইটের একজন আবেদনকারী অফিসে এসে নগদে টাকা দিচ্ছেন**
- হিসাব-কিতাব → **Record cash payment** (নগদ পেমেন্ট রেকর্ড করুন) → তার অ্যাকাউন্ট ও আবেদন বেছে নিন → টাকার অঙ্ক। এটি আবেদনে রেকর্ড হয়, আর তার ড্যাশবোর্ডে একটি রসিদ আসে।

**নতুন কোনো কর্মীকে অ্যাক্সেস দেওয়া**
1. Users (ব্যবহারকারী) → রোলসহ **Add user** (ব্যবহারকারী যোগ করুন) (Employee, Accountant…)।
2. Office settings (অফিস সেটিংস) → Staff (কর্মী) → তার **branch** (শাখা)।

**একটি পাসপোর্টের মেয়াদ শেষ হতে চলেছে**
- Documents (ডকুমেন্ট) → **Add document** (ডকুমেন্ট যোগ করুন) (বিভাগ Visa, ধরন Passport, গ্রাহক, মেয়াদ শেষের তারিখ, ফাইল)। মেয়াদ শেষের 15 ও 7 দিন আগে রিমাইন্ডার আসে।

**দিনের শেষে**
- হিসাব-কিতাব → Today (আজ) → **Day as PDF** (দিনের PDF)।

**মাসের শেষে**
- Finance → Reports (রিপোর্ট) → This month (এই মাস): Profit and loss (লাভ-ক্ষতি), Balance sheet (ব্যালান্স শিট), Owed to us (আমাদের পাওনা), Unpaid bills; দরকার হলে **Download CSV** (CSV ডাউনলোড)।

---

## 11. কোথায় কী বদলায়

| আপনি যা করেন | যে রেকর্ড বদলায় | হিসাবের খাতায় | কাকে জানানো হয় | অডিট লগ |
|---|---|---|---|---|
| গ্রাহক যোগ / এডিট | গ্রাহক, কার্যক্রম | — | — | হ্যাঁ |
| কল / নোট লগ করা | কার্যক্রম | — | — | — |
| কাজ যোগ করা | কাজ, কার্যক্রম | — | যাকে কাজটি দেওয়া হয়েছে | — |
| ডিল যোগ / চালু করা | ডিল | — | — | হ্যাঁ |
| ডিল থেকে ইনভয়েস বানানো | খসড়া ইনভয়েস | — | — | হ্যাঁ |
| ইনভয়েস ইস্যু করা | ইনভয়েস (নম্বর, স্বাক্ষর, লক) | প্রাপ্য / অনর্জিত আয় | গ্রাহকের দায়িত্বে থাকা কর্মী, হিসাবরক্ষকেরা | হ্যাঁ |
| ইনভয়েস সংশোধন | নতুন ভার্সন, পুরোনোটিও রাখা থাকে | পুরোনো পোস্টিং রিভার্স, নতুনটি পোস্ট | — | হ্যাঁ |
| ক্রেডিট নোট | ক্রেডিট নোট, ইনভয়েসের স্ট্যাটাস | অনর্জিত আয় / প্রাপ্য | অনুমোদনকারীরা (অপেক্ষায় থাকলে) | হ্যাঁ |
| ইনভয়েস বাতিল | ইনভয়েস বাতিল হয় | যে টাকা পাওনা ছিল তা বাদ দেওয়া হয় | অনুমোদনকারীরা (অপেক্ষায় থাকলে) | হ্যাঁ |
| ইনভয়েস শেয়ার | শেয়ার লিংক, "sent" (পাঠানো) তারিখ | — | — | হ্যাঁ |
| পেমেন্ট রেকর্ড করা | পেমেন্ট, রসিদ, পরিশোধিত ইনভয়েস, ক্যাশ বইয়ের লাইন, কার্যক্রম | টাকার অ্যাকাউন্ট / প্রাপ্য বা অগ্রিম | — | হ্যাঁ |
| টাকা ফেরত | ফেরত, স্ট্যাটাস, ক্যাশ বইয়ের লাইন | অগ্রিম বা Refunds (টাকা ফেরত) / টাকার অ্যাকাউন্ট | অনুমোদনকারীরা (অপেক্ষায় থাকলে) | হ্যাঁ |
| ডিল সম্পন্ন হিসেবে চিহ্নিত করা | ডিল | অনর্জিত আয় / সেবা থেকে আয় | — | হ্যাঁ |
| হিসাব-কিতাব (Hisab Kitab)-এর এন্ট্রি | ক্যাশ বইয়ের এন্ট্রি (আর আবেদনের পেমেন্ট ও রসিদ) | টাকার অ্যাকাউন্ট ও ক্যাটাগরি (অথবা প্রদেয়) | — | হ্যাঁ |
| বিল পরিশোধিত হিসেবে চিহ্নিত করা | বিল পরিশোধিত | প্রদেয় / টাকার অ্যাকাউন্ট | — | হ্যাঁ |
| জার্নাল এন্ট্রি / ট্রান্সফার / রিভার্সাল | জার্নাল | যেভাবে এন্ট্রি করা হয়েছে | অনুমোদনকারীরা (রিভার্সাল অপেক্ষায় থাকলে) | হ্যাঁ |
| ডকুমেন্ট যোগ / যাচাই করা | ডকুমেন্ট, ভার্সন, যাচাইয়ের অবস্থা | — | পরে মেয়াদ শেষের রিমাইন্ডার | হ্যাঁ (দেখা ও ডাউনলোডও) |
| রোল / অনুমতি / শাখা / স্বাক্ষর / সেটিংস বদলানো | ব্যবহারকারী, অনুমতি, শাখা, স্বাক্ষর, সেটিংস | — | — | হ্যাঁ |
| আবেদনের স্ট্যাটাস বদলানো | আবেদন | — | আবেদনকারী (ইমেইলে) | — |
| ওয়েবসাইটের পেমেন্ট | পেমেন্ট, রসিদ | হিসাব-কিতাবের মাধ্যমে | — | — |

---

## 12. যা এখনও সেট আপ করা বাকি

- **ইনভয়েসের শর্তাবলি**: স্ট্যান্ডার্ড শর্তাবলিতে এখন শুধু নমুনা লেখা আছে। Office settings → Reminders and terms (অফিস সেটিংস → রিমাইন্ডার ও শর্তাবলি)-এ গিয়ে সেগুলো বদলে দিন।
- **কর্তৃপক্ষের স্বাক্ষর**: Office settings → Signature (স্বাক্ষর)-এ গিয়ে যোগ করুন (অথবা Documents and PDFs (ডকুমেন্ট ও PDF)-এ থাকা স্বাক্ষরটি ব্যবহার করুন)।
- **ইমেইল**: ইমেইলে রিমাইন্ডার আর অ্যাকাউন্টের ইমেইল পাঠাতে লাইভ সার্ভারে মেইল সার্ভারের তথ্য দিতে হবে।
- **bKash / Nagad**: অনলাইন পেমেন্টের জন্য লাইভ গেটওয়ের ক্রেডেনশিয়াল (লগইন তথ্য) লাগবে।
- **শুরুর ব্যালান্স**: হিসাবের খাতায় আগের টাকার হিসাবও রাখতে চাইলে Finance → Journal (হিসাবের খাতা → জার্নাল)-এ সেগুলো এন্ট্রি করুন।
