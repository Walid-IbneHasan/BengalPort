<script lang="ts">
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  let receipt: any,
    error = "";
  onMount(async () => {
    try {
      receipt = await api(`/payments/receipt/${page.params.number}`);
    } catch (e) {
      error = "Receipt not found";
    }
  });
</script>

<svelte:head><title>Payment Receipt — Bengal Port</title></svelte:head>
<section class="section">
  <div class="receipt">
    <header>
      <img src="/images/logo.webp" alt="Bengal Port" />
      <div>
        <h1>PAYMENT RECEIPT</h1>
        <p>Bengal Port · Connecting Bengal to the World</p>
      </div>
    </header>
    {#if error}<p class="error">{error}</p>{:else if !receipt}<p>
        Loading receipt…
      </p>{:else}<div class="meta">
        <p>Receipt Number <b>{receipt.receiptNumber}</b></p>
        <p>
          Payment Date <b>{new Date(receipt.createdAt).toLocaleDateString()}</b>
        </p>
        <p>
          Customer <b
            >{receipt.payment.user?.name ||
              receipt.payment.application?.fullName ||
              "Customer"}</b
          >
        </p>
        <p>Service <b>{receipt.payment.service}</b></p>
        <p>Payment Method <b>{receipt.payment.method}</b></p>
        <p>Transaction ID <b>{receipt.payment.transactionId}</b></p>
      </div>
      <table>
        <tbody
          ><tr
            ><td>Total Amount</td><td
              >৳{Number(receipt.previousDue).toLocaleString()}</td
            ></tr
          ><tr
            ><td>Amount Paid</td><td
              >৳{Number(receipt.payment.amount).toLocaleString()}</td
            ></tr
          ><tr
            ><th>Remaining Due</th><th
              >৳{Number(receipt.remainingDue).toLocaleString()}</th
            ></tr
          ></tbody
        >
      </table>
      <button class="btn" onclick={() => window.print()}
        >PRINT / DOWNLOAD PDF</button
      >{/if}
  </div>
</section>

<style>
  .receipt {
    width: min(780px, 92vw);
    margin: auto;
    background: white;
    padding: 45px;
    box-shadow: var(--shadow);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 3px solid var(--gold);
    padding-bottom: 22px;
  }
  header img {
    width: 90px;
    height: 90px;
    border-radius: 50%;
  }
  header h1 {
    color: var(--navy);
  }
  .meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 30px;
    margin: 35px 0;
  }
  .meta p {
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #e5e7ea;
    padding: 10px 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 30px;
  }
  td,
  th {
    padding: 15px;
    border: 1px solid #dfe2e5;
    text-align: left;
  }
  td:last-child,
  th:last-child {
    text-align: right;
  }
  @media print {
    body > *:not(main) {
      display: none;
    }
    .receipt {
      box-shadow: none;
      width: 100%;
    }
    .btn {
      display: none;
    }
  }
  @media (max-width: 600px) {
    .receipt {
      padding: 22px;
    }
    .meta {
      grid-template-columns: 1fr;
    }
  }
</style>
