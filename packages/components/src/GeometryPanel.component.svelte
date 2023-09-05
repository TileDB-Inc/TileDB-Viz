<svelte:options customElement="geometry-panel" />

<script>
  import { onMount, onDestroy } from 'svelte';
  import Section from './Section.component.svelte';
  import events from './constants/events';

  let modes = {
    ADD: {event: 'rectangle_add', enable: false},
    EDIT: {event: 'rectangle_edit', enable: false}
  } 

  let addRectangleModeStatus = false;
  let pendingGeometry = [];
  let selectedGeometry = undefined;

  function deleteGeometry(id) {
    window.dispatchEvent(
      new CustomEvent(events.BUTTON_CLICK, {
        bubbles: true,
        detail: {
          id: 'geometry_clear',
          props: {
            id: id?.toString()
          }
        }
      })
    );
  }

  function selectGeometry(id) {
    window.dispatchEvent(
      new CustomEvent(events.BUTTON_CLICK, {
        bubbles: true,
        detail: {
          id: 'geometry_pick',
          props: {
            id: id
          }
        }
      })
    );
  }

  function savePendingGeometry() {
    window.dispatchEvent(
      new CustomEvent(events.BUTTON_CLICK, {
        bubbles: true,
        detail: {
          id: 'geometry_save'
        }
      })
    );
  }

  function toggleMode(mode) {
    for (const [key, val] of Object.entries(modes)) {
      if (key === mode)
      {
        val.enable = !val.enable;
      }
      else {
        val.enable = false;
      }
    }

    modes = modes;

    window.dispatchEvent(
      new CustomEvent(events.BUTTON_CLICK, {
        bubbles: true,
        detail: {
          id: modes[mode].event,
          props: {
            enable: modes[mode].enable
          }
        }
      })
    );
  }

  function rectangleOperationUpdate(e) {
    switch (e.detail.type)
    {
      case 'RECTANGLE_LIST':
        pendingGeometry = JSON.parse(e.detail.ids);
        break;
      case 'RECTANGLE_ADD':
        pendingGeometry = [...pendingGeometry, e.detail.id];
        break;
      case 'RECTANGLE_INFO':
        selectedGeometry = {
          name: e.detail.id
          // Add all other info -- need exhaustive list
        };
        break;
    }
  }

  onMount(() => {
    window.addEventListener(
      events.ENGINE_INFO_UPDATE,
      rectangleOperationUpdate,
      {
        capture: true
      }
    );
  });

  onDestroy(() => {
    window.removeEventListener(events.ENGINE_INFO_UPDATE, rectangleOperationUpdate, {
      capture: true
    });
  });
</script>

<Section id={'group-panel'}>
  <div slot="header" class="Viewer-GeometrySelector__title">
    <svg width="24" height="24" viewBox="0 0 304 296" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="45" y="109" width="96" height="96" stroke="var(--viewer-text-disabled)" stroke-width="14"/>
      <path d="M90.1724 137.5L143 46L195.828 137.5H90.1724Z" stroke="var(--viewer-text-disabled)" stroke-width="14"/>
      <circle cx="212" cy="203" r="48" stroke="var(--viewer-text-disabled)" stroke-width="14"/>
    </svg>
    Geometry
  </div>
  <div class="Viewer-GeometrySelector__content" slot="content">
    <div class="Viewer-GeometrySelector__toolbox">
      <button class="Viewer-GeometrySelector__button" on:click={e => toggleMode('ADD')}>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="20" 
          height="20" 
          fill="none"
          viewBox="0 0 16 16"
        >
          <path 
            d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"
            fill={modes['ADD'].enable ? 'var(--viewer-enabled)' : 'var(--viewer-text-primary)'}
            fill-opacity="0.7"
          />
          <path 
            d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"
            fill={modes['ADD'].enable ? 'var(--viewer-enabled)' : 'var(--viewer-text-primary)'}
            fill-opacity="0.7"
          />
        </svg>
      </button>
      <button class="Viewer-GeometrySelector__button" on:click={e => toggleMode('EDIT')}>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="20" 
          height="20" 
          fill="none"
          viewBox="0 0 16 16"
        >
          <path 
            d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"
            fill={modes['EDIT'].enable ? 'var(--viewer-enabled)' : 'var(--viewer-text-primary)'}
            fill-opacity="0.7"
            
          />
        </svg>
      </button>
    </div>
    {#if selectedGeometry}
      <div class="Viewer-GeometrySelector__pickInfo">
        <div class="Viewer-GeometrySelector__controls">
          <button>
            Apply
          </button>
          <button>
            Cancel
          </button>
        </div>
      </div>
    {/if}
    <ul class="Viewer-GeometrySelector__list">
      {#each pendingGeometry as geometry}
        <li class="Viewer-GeometrySelector__item">
          <button class="Viewer-GeometrySelector__button_item" on:click={e => selectGeometry(geometry)}>
            {geometry}
          </button>
          <button class="Viewer-GeometrySelector__button" on:click={e => deleteGeometry(geometry)}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14.0333 7.49996C14.2629 7.49998 14.49 7.54743 14.7004 7.63935C14.9108 7.73127 15.0999 7.86568 15.2559 8.03413C15.4119 8.20259 15.5315 8.40146 15.607 8.61828C15.6826 8.8351 15.7125 9.0652 15.6949 9.29413L15.1183 16.7941C15.0861 17.2128 14.8971 17.604 14.589 17.8893C14.281 18.1747 13.8765 18.3333 13.4566 18.3333H6.54325C6.12332 18.3333 5.71887 18.1747 5.41079 17.8893C5.10271 17.604 4.91371 17.2128 4.88159 16.7941L4.30492 9.29413C4.28735 9.0652 4.31728 8.8351 4.39282 8.61828C4.46836 8.40146 4.58789 8.20259 4.7439 8.03413C4.89992 7.86568 5.08906 7.73127 5.29946 7.63935C5.50986 7.54743 5.73698 7.49998 5.96659 7.49996H14.0333ZM10.8333 1.66663C11.2753 1.66663 11.6992 1.84222 12.0118 2.15478C12.3243 2.46734 12.4999 2.89127 12.4999 3.33329H15.4166C15.7481 3.33329 16.066 3.46499 16.3005 3.69941C16.5349 3.93383 16.6666 4.25177 16.6666 4.58329C16.6666 4.91481 16.5349 5.23276 16.3005 5.46718C16.066 5.7016 15.7481 5.83329 15.4166 5.83329H4.58325C4.25173 5.83329 3.93379 5.7016 3.69937 5.46718C3.46495 5.23276 3.33325 4.91481 3.33325 4.58329C3.33325 4.25177 3.46495 3.93383 3.69937 3.69941C3.93379 3.46499 4.25173 3.33329 4.58325 3.33329H7.49992C7.49992 2.89127 7.67551 2.46734 7.98807 2.15478C8.30063 1.84222 8.72456 1.66663 9.16658 1.66663H10.8333Z"
                fill="#FF2020"
                fill-opacity="0.7"
              />
            </svg>
          </button>
        </li>
      {/each}
    </ul>
    {#if pendingGeometry.length !== 0}
      <div class="Viewer-GeometrySelector__controls">
        <button on:click={savePendingGeometry}>
          Save
        </button>
        <button on:click={e => deleteGeometry(-1)}>
          Clear
        </button>
      </div>
    {/if}
  </div>
</Section>

<style lang="scss">
  .Viewer-GeometrySelector {
    display: flex;
    font-family: Inter, Arial, 'sans-serif';
    flex-direction: column;

    &__enabled {
      fill: var(--viewer-enabled);
    }

    &__title {
      font-style: normal;
      font-weight: 700;
      font-size: 16px;
      line-height: 24px;
      color: var(--viewer-text-primary);
      display: flex;
      align-items: center;
      margin: 0;
      justify-content: space-between;

      svg {
        margin-right: 10px;
      }
    }

    &__button {
      background: no-repeat;
      border: none;
      width: 28px;
      height: 28px;
      padding: 0;
  
      &:hover {
        cursor: pointer;
      }
    }

    &__content {
      overflow: hidden;
      transition: 0.8s max-height;
      display: flex;
      flex-direction: column;
    }

    &__controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 6px;
    }

    &__list {
      list-style: none;
      padding: 0 1px;
      margin: 16px 0;
    }

    &__value {
      border: 1px solid var(--viewer-border);
      border-radius: 6px;
      padding: 6px 16px;
      margin: 0;
      height: 40px;
      font-style: normal;
      font-weight: 400;
      font-size: 14px;
      color: rgba(0, 0, 0, 0.87);
    }

    &__item {

      padding-left: 16px;
      padding-right: 16px;

      display: flex;
      flex-direction: row;
      justify-content: space-between;
      color: var(--viewer-text-primary);
      line-height: 16px;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
</style>
