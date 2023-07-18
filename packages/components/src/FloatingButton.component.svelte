<svelte:options tag="floating-button" />

<script>
  export let backgroundimage,
    id,
    bottom = `33px`;

  function handleClick() {
    window.dispatchEvent(
      new CustomEvent('floating-button::click', {
        bubbles: true,
        detail: {
          id
        }
      })
    );
  }

  $: cssVarStyles = `--bg: url("${backgroundimage}"); --bottom: ${bottom}`;
</script>

<button class="floating-button" style={cssVarStyles} on:click={handleClick} />

<style>
  .floating-button {
    height: 53px;
    background-image: var(--bg);
    background-position: center;
    background-size: cover;
    background-color: transparent;
    border: none;
    border-radius: 50%;
    bottom: var(--bottom);
    box-sizing: border-box;
    padding: 0;
    position: absolute;
    right: 16px;
    width: 53px;
  }

  .floating-button:hover {
    cursor: pointer;
  }
</style>
