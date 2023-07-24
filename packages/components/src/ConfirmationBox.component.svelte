<svelte:options tag="confirmation-box" />

<script>
  import { onMount, onDestroy } from 'svelte';
  import events from './constants/events';

  let visible = false;

  function hideModal(e) {
    visible = false;
  }

  function handleAccept() {
    hideModal();

    window.dispatchEvent(
      new CustomEvent(events.CONFIRM_BOX_ACCEPT, {
        bubbles: true
      })
    );
  }

  onMount(() => {
    const CUSTOM_EVENT = events.CONFIRM_BOX_SHOW;
    window.addEventListener(
      CUSTOM_EVENT,
      () => {
        visible = true;
      },
      {
        capture: true
      }
    );
  });

  onDestroy(() => {
    window.removeEventListener(CUSTOM_EVENT, toggleVissible, {
      capture: true
    });
  });
</script>

{#if visible}
  <div class="tdb-modal">
    <h4 class="tdb-modal__title">Clear cache</h4>
    <p class="tdb-modal__description">
      Are you sure you want to delete the array's cache?
    </p>
    <div class="tdb-modal__buttons">
      <button
        on:click={handleAccept}
        id="tdb-confirm-btn"
        class="tdb-modal__button tdb-modal__button--active">Clear cache</button
      >
      <button on:click={hideModal} id="tdb-cancel-btn" class="tdb-modal__button"
        >Cancel</button
      >
    </div>
  </div>
{/if}

<style>
  .tdb-modal {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto;
    max-width: 200px;
    background-color: #fff;
    height: 155px;
    padding: 10px;
    border-radius: 6px;
    text-align: center;
    font-family: Arial, sans-serif;
  }
  .tdb-modal__buttons {
    display: flex;
    gap: 10px;
  }

  .tdb-modal__button {
    border-radius: 6px;
    border: 1px solid #333;
    padding: 12px;
    flex-basis: 50%;
    background-color: transparent;
    white-space: nowrap;
  }

  .tdb-modal__button:hover {
    cursor: pointer;
  }

  .tdb-modal__button--active {
    background-color: #0070f0;
    border: none;
    color: #fff;
  }
</style>
