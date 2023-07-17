<svelte:options customElement="cool-card" />
  
<script>
  export let title;
</script>

<div class="Viz-custom-component">
  <h1>Hi from web component {title}</h1>
</div>


<style>
	.Viz-custom-component {
		background-color: blueviolet;
	}
</style>