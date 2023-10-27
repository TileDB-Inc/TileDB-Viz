<svelte:options customElement="info-panel" />

<script lang="ts">
  import { Events } from './constants/events';
  import { onMount, onDestroy } from 'svelte';
  import { ButtonProps, GUIEvent } from './types';

  export let attributes = '[]';
  export let idAttribute = '';

  let results: any[] = [];
  let headings = JSON.parse(attributes ?? '[]') as any[];
  let itemsPerPage: number = 10;
  let page: number = 0;

  let selectedItemIndex = -1;

  $: pages = Math.ceil(results.length / itemsPerPage);

  function itemsPerPageOnChange(event: Event) {
    itemsPerPage = Number.parseInt((event.target as HTMLSelectElement).value);
  }

  function pageOnChange(event: Event) {
    page = Math.max(
      0,
      Math.min(
        pages - 1,
        page + Number.parseInt((event.target as HTMLButtonElement).value)
      )
    );
  }

  function clear() {
    results = [];

    window.dispatchEvent(
      new CustomEvent<GUIEvent<ButtonProps>>(Events.BUTTON_CLICK, {
        bubbles: true,
        detail: {
          target: 'geometry',
          props: {
            command: 'clear'
          }
        }
      })
    );
  }

  function clearSelection() {
    const previousID =
      selectedItemIndex !== -1
        ? results[selectedItemIndex][idAttribute]
        : undefined;
    selectedItemIndex = -1;

    window.dispatchEvent(
      new CustomEvent<GUIEvent<ButtonProps>>(Events.BUTTON_CLICK, {
        bubbles: true,
        detail: {
          target: 'geometry',
          props: {
            command: 'select',
            data: {
              id: -1n,
              previousID
            }
          }
        }
      })
    );
  }

  function itemOnSelect(page: number, index: number) {
    const previousID =
      selectedItemIndex !== -1
        ? results[selectedItemIndex][idAttribute]
        : undefined;
    selectedItemIndex = page * itemsPerPage + index;

    window.dispatchEvent(
      new CustomEvent<GUIEvent<ButtonProps>>(Events.BUTTON_CLICK, {
        bubbles: true,
        detail: {
          target: 'geometry',
          props: {
            command: 'select',
            data: {
              id: results[selectedItemIndex][idAttribute],
              previousID
            }
          }
        }
      })
    );
  }

  function itemOnPick(event: CustomEvent<GUIEvent<any[]>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== 'geometry') return;

    results = [...results, ...event.detail.props];

    event.stopPropagation();
  }

  onMount(() => {
    window.addEventListener(Events.PICK_OBJECT, itemOnPick, {
      capture: true
    });
  });

  onDestroy(() => {
    window.removeEventListener(Events.PICK_OBJECT, itemOnPick, {
      capture: true
    });
  });
</script>

<div class="Viewer-DataTable">
  <div class="Viewer-DataTable__header">
    {results.length} Results Found
    <button class="Viewer-DataTable__button error" on:click={clear}>
      <svg class="icon" focusable="false" viewBox="0 0 48 48">
        <path
          d="M33.68 18C34.231 18 34.7761 18.1139 35.2811 18.3345C35.7861 18.5552 36.24 18.8777 36.6144 19.282C36.9889 19.6863 37.2757 20.1636 37.457 20.684C37.6383 21.2043 37.7102 21.7566 37.668 22.306L36.284 40.306C36.2069 41.3109 35.7533 42.2496 35.0139 42.9345C34.2745 43.6194 33.3038 43.9999 32.296 44H15.704C14.6962 43.9999 13.7255 43.6194 12.9861 42.9345C12.2467 42.2496 11.7931 41.3109 11.716 40.306L10.332 22.306C10.2898 21.7566 10.3617 21.2043 10.543 20.684C10.7243 20.1636 11.0111 19.6863 11.3856 19.282C11.76 18.8777 12.2139 18.5552 12.7189 18.3345C13.2239 18.1139 13.769 18 14.32 18H33.68ZM26 4C27.0609 4 28.0783 4.42143 28.8284 5.17157C29.5786 5.92172 30 6.93913 30 8H37C37.7956 8 38.5587 8.31607 39.1213 8.87868C39.6839 9.44129 40 10.2044 40 11C40 11.7956 39.6839 12.5587 39.1213 13.1213C38.5587 13.6839 37.7956 14 37 14H11C10.2044 14 9.44129 13.6839 8.87868 13.1213C8.31607 12.5587 8 11.7956 8 11C8 10.2044 8.31607 9.44129 8.87868 8.87868C9.44129 8.31607 10.2044 8 11 8H18C18 6.93913 18.4214 5.92172 19.1716 5.17157C19.9217 4.42143 20.9391 4 22 4H26Z"
        />
      </svg>
      Clear all
    </button>
  </div>
  <div class="Viewer-DataTable__main">
    {#if results.length}
      <table class="Viewer-DataTable__table">
        <thead>
          <tr>
            {#each headings as heading}
              <th title={heading.type}>
                {heading.name}
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each results.slice(page * itemsPerPage, (page + 1) * itemsPerPage) as item, index}
            <tr
              on:click={() => itemOnSelect(page, index)}
              class:Viewer-DataTable__row-even={index % 2}
              class:Viewer-DataTable__row-selected={page * itemsPerPage +
                index ===
                selectedItemIndex}
            >
              {#each headings as heading}
                <td
                  class:Viewer-DataTable__td-selected={page * itemsPerPage +
                    index ===
                    selectedItemIndex}
                >
                  {item[heading.name]}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <div class="Viewer-DataTable__info">
        No results found for the selected area.
      </div>
    {/if}
  </div>
  <div class="Viewer-DataTable__controls">
    <button class="Viewer-DataTable__button" on:click={clearSelection}
      >Clear selection</button
    >
    <div class="Viewer-DataTable__horizontal-container">
      <div class="Viewer-DataTable__pagination-control">
        <label for="itemsPerPage">Items per page:</label>
        <div class="Viewer-DataTable__select">
          <select name="itemsPerPage" on:change={e => itemsPerPageOnChange(e)}>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="icon"
            focusable="false"
            viewBox="0 0 48 48"
          >
            <path
              d="M24 33C23.4948 33.0009 22.9945 32.9006 22.5287 32.7051C22.0628 32.5095 21.6409 32.2227 21.2877 31.8615L7.69042 18.0791C7.24757 17.6279 6.99963 17.0209 7 16.3886C7.00037 15.7564 7.24902 15.1497 7.69239 14.699C7.91034 14.4775 8.17023 14.3015 8.45689 14.1815C8.74355 14.0615 9.05125 13.9998 9.36203 14C9.6728 14.0002 9.98043 14.0622 10.2669 14.1826C10.5535 14.303 10.8131 14.4792 11.0308 14.701L24 27.8475L36.9692 14.701C37.1869 14.4793 37.4466 14.3032 37.7332 14.1829C38.0197 14.0626 38.3273 14.0005 38.638 14.0003C38.9487 14.0002 39.2564 14.0618 39.5431 14.1818C39.8297 14.3017 40.0896 14.4776 40.3076 14.699C40.751 15.1497 40.9997 15.7564 41 16.3886C41.0004 17.0208 40.7525 17.6279 40.3096 18.0791L26.7129 31.8615C26.3595 32.2227 25.9375 32.5095 25.4715 32.705C25.0056 32.9005 24.5053 33.0008 24 33Z"
            />
          </svg>
        </div>
      </div>
      {#if pages > 0}
        <div class="Viewer-DataTable__pagination-control">
          <button
            class="Viewer-DataTable__icon-button"
            value={'-1'}
            on:click={pageOnChange}
          >
            <svg class="icon left" viewBox="0 0 48 48">
              <path
                d="M33 24C33.0009 24.5052 32.9006 25.0055 32.7051 25.4713C32.5096 25.9372 32.2227 26.3591 31.8615 26.7123L18.0791 40.3096C17.6279 40.7524 17.0209 41.0004 16.3887 41C15.7565 40.9996 15.1497 40.751 14.699 40.3076C14.4775 40.0897 14.3016 39.8298 14.1815 39.5431C14.0615 39.2564 13.9998 38.9487 14 38.638C14.0002 38.3272 14.0623 38.0196 14.1826 37.7331C14.303 37.4465 14.4792 37.1869 14.701 36.9692L27.8475 24L14.701 11.0308C14.4793 10.8131 14.3032 10.5534 14.1829 10.2668C14.0626 9.98034 14.0006 9.67274 14.0004 9.362C14.0002 9.05126 14.0619 8.74359 14.1818 8.45693C14.3018 8.17028 14.4776 7.91037 14.699 7.69236C15.1497 7.24899 15.7565 7.00034 16.3887 6.99997C17.0209 6.9996 17.6279 7.24752 18.0791 7.69036L31.8615 21.2871C32.2227 21.6405 32.5095 22.0625 32.705 22.5285C32.9006 22.9944 33.0009 23.4947 33 24Z"
              />
            </svg>
          </button>
          {page + 1} / {pages}
          <button
            class="Viewer-DataTable__icon-button"
            value="1"
            on:click={pageOnChange}
          >
            <svg class="icon right" viewBox="0 0 48 48">
              <path
                d="M33 24C33.0009 24.5052 32.9006 25.0055 32.7051 25.4713C32.5096 25.9372 32.2227 26.3591 31.8615 26.7123L18.0791 40.3096C17.6279 40.7524 17.0209 41.0004 16.3887 41C15.7565 40.9996 15.1497 40.751 14.699 40.3076C14.4775 40.0897 14.3016 39.8298 14.1815 39.5431C14.0615 39.2564 13.9998 38.9487 14 38.638C14.0002 38.3272 14.0623 38.0196 14.1826 37.7331C14.303 37.4465 14.4792 37.1869 14.701 36.9692L27.8475 24L14.701 11.0308C14.4793 10.8131 14.3032 10.5534 14.1829 10.2668C14.0626 9.98034 14.0006 9.67274 14.0004 9.362C14.0002 9.05126 14.0619 8.74359 14.1818 8.45693C14.3018 8.17028 14.4776 7.91037 14.699 7.69236C15.1497 7.24899 15.7565 7.00034 16.3887 6.99997C17.0209 6.9996 17.6279 7.24752 18.0791 7.69036L31.8615 21.2871C32.2227 21.6405 32.5095 22.0625 32.705 22.5285C32.9006 22.9944 33.0009 23.4947 33 24Z"
              />
            </svg>
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style lang="scss">
  .Viewer-DataTable {
    height: 400px;
    background: var(--viewer-background-primary);
    display: grid;
    grid-template-rows: 40px minmax(0, 1fr) 40px;
    font-size: 14px;
    font-family: Inter, Arial, 'sans-serif';
    color: var(--viewer-text-primary);
    fill: var(--viewer-text-primary);

    &__header {
      border-bottom: 1px solid var(--viewer-border);
      vertical-align: middle;
      line-height: 28px;
      padding: 6px 20px;
      font-weight: 600;
      font-size: 18px;
      display: flex;
      justify-content: space-between;
    }

    &__controls {
      padding: 6px 20px;
      border-top: 1px solid var(--viewer-border);
      display: flex;
      justify-content: space-between;
      line-height: 24px;
    }

    &__button {
      background-color: #fff;
      border: 0 solid var(--viewer-border);
      border-radius: 24px;
      box-sizing: border-box;
      cursor: pointer;
      display: inline-block;
      font-family: 'Segoe UI';
      font-weight: 600;
      line-height: 16px;
      vertical-align: middle;
      padding: 4px 24px;
      text-align: center;
      text-decoration: none var(--viewer-text-primary) solid;
      text-decoration-thickness: auto;
      transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: var(--viewer-shadow-small);
    }

    &__icon-button {
      background-color: #fff;
      border: 0 solid var(--viewer-border);
      border-radius: 100px;
      box-sizing: border-box;
      cursor: pointer;
      display: inline-block;
      box-shadow: var(--viewer-shadow-small);
    }

    &__button:hover,
    &__icon-button:hover {
      background-color: var(--viewer-accent);
      color: #fff;
      fill: #fff;
    }

    &__icon-button:hover svg,
    &__button:hover svg {
      color: #fff;
      fill: #fff;
    }

    &__horizontal-container {
      display: flex;
      gap: 16px;
      vertical-align: middle;
    }

    &__pagination-control {
      display: flex;
      gap: 6px;
    }

    &__main {
      overflow: auto;
    }

    &__info {
      text-align: center;
      padding: 16px;
      color: var(--viewer-text-primary);
    }

    &__row-even {
      background: var(--viewer-accent-05);
    }

    &__row-selected {
      box-shadow: inset 0 0 16px var(--viewer-accent);
    }

    &__td-selected {
      text-wrap: pretty !important;
    }
  }

  .error:hover {
    background: var(--viewer-text-error) !important;
  }

  select {
    appearance: none;
    outline: 10px red;
    border: 0;
    box-shadow: none;

    flex: 1;
    padding: 0 6px;
    color: var(--viewer-text-primary);
    background-color: #fff;
    cursor: pointer;
  }

  .Viewer-DataTable__select {
    position: relative;
    display: flex;
    width: 50px;
    height: 25px;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: var(--viewer-shadow-small);
  }

  .Viewer-DataTable__select svg {
    position: absolute;
    right: 0;
    padding: 4px;
    background-color: #fff;
    transition: 0.25s all ease;
    pointer-events: none;
  }

  .Viewer-DataTable__select:hover svg {
    fill: var(--viewer-accent);
  }

  .Viewer-DataTable__table {
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
  }

  .Viewer-DataTable__table th {
    border-top: 1px solid var(--viewer-border);
    border-bottom: 1px solid var(--viewer-border);
    border-right: 1px solid var(--viewer-border);
    padding: 2px 16px;
    position: relative;
    text-transform: capitalize;
  }

  .Viewer-DataTable__table td {
    border-bottom: 1px solid var(--viewer-border);
    border-right: 1px solid var(--viewer-border);
    padding: 2px 2px 2px 4px;
  }
  .Viewer-DataTable__table th:first-child,
  .Viewer-DataTable__table td:first-child {
    border-left: 1px solid var(--viewer-border);
  }

  .Viewer-DataTable__table thead {
    position: sticky;
    top: 0;
    background: var(--viewer-background-primary);
  }

  .Viewer-DataTable__table tbody tr {
    cursor: pointer;
  }

  .Viewer-DataTable__table tbody td {
    overflow: hidden;
    max-width: 200px;
    text-overflow: ellipsis;
    text-wrap: nowrap;
  }

  .Viewer-DataTable__table tbody tr:hover {
    background: var(--viewer-accent-20);
  }

  .icon {
    vertical-align: bottom;
    margin: auto;
    width: 16px;
    height: 16px;
    fill: var(--viewer-text-primary);
    background: transparent;
    pointer-events: none;
  }

  .right {
    margin-right: -1px;
  }

  .left {
    transform: rotate(180deg);
    -webkit-transform: rotate(180deg);
    margin-left: -1px;
  }
</style>
