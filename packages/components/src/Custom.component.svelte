<svelte:options tag="cool-card" />

<script>
  export let title;
  function handleClick() {
    window.dispatchEvent(
      new CustomEvent('youhou', { bubbles: true, detail: 'fdsafsd' })
    );
  }
</script>

<div class="Viz-custom-component">
  <h1>Hi from web component updated {title}</h1>
  <button on:click={handleClick}> Click me </button>
</div>

<style>
  .Viz-custom-component {
    background-color: cadetblue;
    height: 100px;
    width: 500px;
  }
</style>
