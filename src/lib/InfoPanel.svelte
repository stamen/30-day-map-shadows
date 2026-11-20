<script>
  // Edit the text here.
  const TITLE = 'Shadow Abstraction';
  const DESCRIPTION = [
    'Everything on this map is either fully in sunlight or in shadow.',
    'The sun follows its real path across the sky for the chosen place and date. Wherever a mountain, ridge or canyon wall blocks it, the ground goes dark. The shapes come from real elevation data, with heights exaggerated 1.5× to make the shadows easier to see.',
    'Select the colors you wish to see as patterns form.'
  ];

  let open = $state(true);
</script>

<section class="info">
  <button class="header" aria-expanded={open} onclick={() => (open = !open)}>
    <h1 class="heavy">{TITLE}</h1>
    <span class="chevron" aria-hidden="true">{open ? '−' : '+'}</span>
  </button>
  {#if open}
    <div class="body">
      {#each DESCRIPTION as paragraph}
        <p>{paragraph}</p>
      {/each}
    </div>
  {/if}
</section>

<style>
  .info {
    position: absolute;
    top: 16px;
    left: 16px;
    width: 288px;
    max-width: calc(100% - 32px);
    box-sizing: border-box;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.75);
    color: #f2f2f5;
    font-size: 13px;
    line-height: 1.45;
  }
  .header {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 400; /* Archivo Black has one weight; anything heavier would be faked */
  }
  .chevron {
    font-size: 18px;
    line-height: 1;
    opacity: 0.7;
  }
  .body {
    padding: 0 14px 12px;
  }
  p {
    margin: 0 0 8px;
    opacity: 0.85;
  }
  p:last-child {
    margin-bottom: 0;
  }
</style>
