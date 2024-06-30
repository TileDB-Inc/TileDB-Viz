<svelte:options
  customElement={{
    tag: 'loading-screen'
  }}
/>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Events } from './constants/events';
  import { GUIEvent } from './types';

  let status = 'Initializing canvas';
  let display: boolean = true;

  function loadingTilesUpdate(event: CustomEvent<GUIEvent<{show: boolean, message: string}>>) {
    if (event.detail.target === 'LOADING_SCREEN') {
      status = event.detail.props.message;
      display = event.detail.props.show;
    }
  }

  onMount(() => {
    window.addEventListener(Events.ENGINE_INFO_UPDATE, loadingTilesUpdate, {
      capture: true
    });
  });

  onDestroy(() => {
    window.removeEventListener(Events.ENGINE_INFO_UPDATE, loadingTilesUpdate, {
      capture: true
    });
  });
</script>

<div class="Viewer-Loading" class:loaded={!display}>
  <div class="Viewer-Loading__icon-container">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="loading-icon"
      viewBox="0 0 24 24"
    >
      <path
        class="outer"
        d="M3 12a9 9 0 0 0 9 9a9 9 0 0 0 9 -9a9 9 0 0 0 -9 -9"
      />
      <path class="inner" d="M17 12a5 5 0 1 0 -5 5" />
    </svg>
  </div>
  <div class="Viewer-Loading__info-container">
    {status}...
  </div>
</div>

<style lang="scss">
  .Viewer-Loading {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 100;
    width: 100%;
    height: 100%;
    background: var(--viewer-background-secondary);
    transition: visibility 0.5s, opacity 0.5s linear;
  }

  .Viewer-Loading__icon-container {
    text-align: center;
  }

  .Viewer-Loading__info-container {
    text-align: center;
    color: var(--viewer-text-primary);
    font-size: 14px;
    font-family: Inter, Arial, 'sans-serif';
    width: 320px;
    margin: auto;
  }

  .loaded {
    visibility: hidden;
    opacity: 0;
  }

  .loading-icon {
    width: 60px;
    fill: none;
    stroke: var(--viewer-accent);
    stroke-width: 2px;
    stroke-linecap: round;
    margin-top: 40vh;
  }

  @keyframes rotating {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes rotating-inverse {
    from {
      transform: rotate(360deg);
    }
    to {
      transform: rotate(0deg);
    }
  }
  .outer {
    transform-origin: center;
    animation: rotating 2s linear infinite;
  }
  .inner {
    transform-origin: center;
    animation: rotating-inverse 2s linear infinite;
  }
</style>
