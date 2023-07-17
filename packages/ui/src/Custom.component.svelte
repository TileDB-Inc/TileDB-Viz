<svelte:options customElement="cool-card" />

<script>
  import { get_current_component } from 'svelte/internal';
  const component = get_current_component();

  // example function for dispatching events
  const dispatchEvent = (name, detail) =>
    component.dispatchEvent(new CustomEvent(name, { detail }));
  export let title;

  function handleClick() {
    alert('clicked');
    window.dispatchEvent(new CustomEvent('cool-event', { bubbles: true }));
  }
</script>

<div class="Viz-custom-component">
  <h1>Hi from web component! {title}</h1>
</div>

<style>
  .Viz-custom-component {
    background-color: aquamarine;
    height: 500px;
  }
</style>
