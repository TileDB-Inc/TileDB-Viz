<script lang="typescript">
  import ToggleSwitch from './ToggleSwitch.component.svelte';
  import Slider from './misc/InlineSlider.component.svelte';
  import { onMount, onDestroy } from 'svelte';
  import { Commands, Events } from './constants/events';
  import { GUIEvent, ButtonProps, GUISliderPropertyState } from './types/index';
  import { OptionsPanelInitializationEvent } from '@tiledb-inc/viz-common';

  let tiles = 0;
  let diskSpace = 0;
  let cameraTargetX = 0;
  let cameraTargetY = 0;

  let globalState: {
    prefetchBias: GUISliderPropertyState;
  } = undefined;

  function optionsInfoUpdate(e) {
    switch (e.detail.type) {
      case 'CACHE_INFO':
        tiles = e.detail.tiles;
        diskSpace = e.detail.diskSpace;
        break;
    }
  }

  function clearCache(event: Event) {
    window.dispatchEvent(
      new CustomEvent<GUIEvent<ButtonProps>>(Events.BUTTON_CLICK, {
        bubbles: true,
        detail: {
          target: 'cache',
          props: {
            command: Commands.CLEAR
          }
        }
      })
    );
  }

  function onInitialize(event: CustomEvent<GUIEvent<OptionsPanelInitializationEvent>>) {
    if (event.detail.target !== 'options-panel') {
      return;
    }

    window.removeEventListener(Events.INITIALIZE, onInitialize, {
      capture: true
    });
    event.stopPropagation();

    const payload = event.detail.props;

    globalState = {
      prefetchBias: {property: payload.prefetchBias, value: payload.prefetchBias.default}
    };
  }

  onMount(() => {
    window.addEventListener(Events.ENGINE_INFO_UPDATE, optionsInfoUpdate, {
      capture: true
    });

    window.addEventListener(Events.INITIALIZE, onInitialize, {
      capture: true
    });
  });

  onDestroy(() => {
    window.removeEventListener(Events.ENGINE_INFO_UPDATE, optionsInfoUpdate, {
      capture: true
    });
  });
</script>

<div class="Viewer-Settings">
  <div class="Viewer-Settings__header">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="icon"
      viewBox="0 0 48 48"
      stroke-width="2"
      stroke="currentColor"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path
        d="M26.1271 4.27897C27.2225 4.27897 28.1187 5.15572 28.1187 6.2716V8.76238C29.5806 9.14098 30.9468 9.71884 32.2294 10.4561L33.9821 8.68267C34.7588 7.88562 36.0135 7.88562 36.7903 8.68267L39.5985 11.4923C40.3752 12.2694 40.3752 13.5248 39.5985 14.3019L37.8259 16.0554C38.5628 17.3108 39.1404 18.7056 39.5188 20.1602L42.0084 20.1403C43.1038 20.1403 44 21.017 44 22.1329V26.1182C44 27.2141 43.1038 28.1108 42.0084 28.1108H39.4989C39.1205 29.5455 38.5429 30.9204 37.7861 32.2236L39.5387 33.9771C40.3155 34.7542 40.3155 36.0096 39.5387 36.7867L36.7106 39.5963C35.914 40.3734 34.6592 40.3734 33.8825 39.5963L32.1099 37.8229C30.8154 38.5801 29.4411 39.138 27.9992 39.5166V42.0074C27.9992 43.1033 27.103 44 26.0076 44H22.0243C20.909 44 20.0327 43.1033 20.0327 42.0074V39.4967C18.5788 39.1181 17.2045 38.5402 15.91 37.783L14.1374 39.5365H14.1175C13.3209 40.3136 12.0661 40.3136 11.2894 39.5365L8.46126 36.707C7.66461 35.9099 7.66461 34.6546 8.45927 33.8775L10.2119 32.104C9.43517 30.8088 8.87751 29.4339 8.4991 27.9912H5.99164C4.87632 27.9912 4 27.0946 4 25.9986V22.0134C4 20.8975 4.87632 20.0207 5.99164 20.0207H8.48118C8.83967 18.5581 9.43716 17.1713 10.1741 15.9079L8.40151 14.1345C7.60486 13.3375 7.60486 12.0821 8.40151 11.305L11.2097 8.46348C11.9865 7.66643 13.2412 7.66643 14.0179 8.46348L15.7706 10.217C17.0452 9.43987 18.4194 8.88194 19.8733 8.50334L19.8534 5.99263C19.8534 4.87676 20.7297 4 21.845 4H25.8283L26.1271 4.27897ZM24.1354 16.2347C19.7339 16.2347 16.1689 19.8015 16.1689 24.2052C16.1689 28.589 19.7339 32.1758 24.1354 32.1758C28.517 32.1758 32.102 28.589 32.102 24.2052C32.102 19.8015 28.517 16.2347 24.1354 16.2347Z"
      >
      </path>
    </svg>
    Settings
  </div>
  <div class="Viewer-Settings__container">
    <div style="display: flex; gap: 6px;">
      <div class="Viewer-Settings__group">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M2.62676 18.3333C2.09651 18.3333 1.66675 17.9034 1.66675 17.3733V2.62664C1.66675 2.09639 2.09661 1.66663 2.62676 1.66663H17.3734C17.9037 1.66663 18.3334 2.09649 18.3334 2.62664V17.3733C18.3334 17.9035 17.9036 18.3333 17.3734 18.3333H2.62676ZM3.58677 13.4177V16.4131H6.58213V13.4177H3.58677ZM8.50232 13.4177V16.4131H11.4978V13.4177H8.50232ZM16.4134 13.4177H13.418V16.4131H16.4134V13.4177ZM3.58677 8.5022V11.4977H6.58213V8.5022H3.58677ZM8.50232 8.5022V11.4977H11.4978V8.5022H8.50232ZM13.4179 8.5022V11.4977H16.4132V8.5022H13.4179ZM3.58677 6.58207H6.58213V3.58672H3.58677V6.58207ZM8.50232 3.58672V6.58207H11.4978V3.58672H8.50232ZM13.4179 3.58672V6.58207H16.4132V3.58672H13.4179Z"
            fill="var(--viewer-text-primary)"
            fill-opacity="0.7"
          />
        </svg>
        <p class="Viewer-Settings__label">
          Cached tiles: {tiles}
        </p>
        <button class="Viewer-Settings__button" on:click={clearCache}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M14.0333 7.49996C14.2629 7.49998 14.49 7.54743 14.7004 7.63935C14.9108 7.73127 15.0999 7.86568 15.2559 8.03413C15.4119 8.20259 15.5315 8.40146 15.607 8.61828C15.6826 8.8351 15.7125 9.0652 15.6949 9.29413L15.1183 16.7941C15.0861 17.2128 14.8971 17.604 14.589 17.8893C14.281 18.1747 13.8765 18.3333 13.4566 18.3333H6.54325C6.12332 18.3333 5.71887 18.1747 5.41079 17.8893C5.10271 17.604 4.91371 17.2128 4.88159 16.7941L4.30492 9.29413C4.28735 9.0652 4.31728 8.8351 4.39282 8.61828C4.46836 8.40146 4.58789 8.20259 4.7439 8.03413C4.89992 7.86568 5.08906 7.73127 5.29946 7.63935C5.50986 7.54743 5.73698 7.49998 5.96659 7.49996H14.0333ZM10.8333 1.66663C11.2753 1.66663 11.6992 1.84222 12.0118 2.15478C12.3243 2.46734 12.4999 2.89127 12.4999 3.33329H15.4166C15.7481 3.33329 16.066 3.46499 16.3005 3.69941C16.5349 3.93383 16.6666 4.25177 16.6666 4.58329C16.6666 4.91481 16.5349 5.23276 16.3005 5.46718C16.066 5.7016 15.7481 5.83329 15.4166 5.83329H4.58325C4.25173 5.83329 3.93379 5.7016 3.69937 5.46718C3.46495 5.23276 3.33325 4.91481 3.33325 4.58329C3.33325 4.25177 3.46495 3.93383 3.69937 3.69941C3.93379 3.46499 4.25173 3.33329 4.58325 3.33329H7.49992C7.49992 2.89127 7.67551 2.46734 7.98807 2.15478C8.30063 1.84222 8.72456 1.66663 9.16658 1.66663H10.8333Z"
              fill="var(--viewer-text-primary)"
              fill-opacity="0.7"
            />
          </svg>
        </button>
      </div>
      <div class="Viewer-Settings__group">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M2.81108 9.7576L4.74599 5.33498C5.04118 4.66022 5.83099 4.14246 6.5663 4.14246H13.4339C14.1696 4.14246 14.9585 4.6591 15.2542 5.33498L17.1892 9.75784C16.6579 9.45967 16.045 9.28955 15.3922 9.28955H4.60796C3.95525 9.28955 3.34234 9.45942 2.81108 9.7576ZM1.66675 12.9659C1.66675 11.3414 2.98315 10.0247 4.60794 10.0247H15.3922C17.0167 10.0247 18.3334 11.3413 18.3334 12.9659C18.3334 14.5905 17.017 15.9071 15.3922 15.9071H4.60794C2.98341 15.9071 1.66675 14.5905 1.66675 12.9659ZM3.13737 12.9659C3.13737 13.7773 3.79603 14.4366 4.60799 14.4366C5.41927 14.4366 6.07851 13.7778 6.07851 12.9659C6.07851 12.1546 5.41984 11.4953 4.60799 11.4953C3.79661 11.4953 3.13737 12.154 3.13737 12.9659ZM14.9021 11.9856V13.9463C14.9021 14.0816 15.0119 14.1914 15.1472 14.1914H15.6374C15.7728 14.1914 15.8825 14.0816 15.8825 13.9463V11.9856C15.8825 11.8501 15.7728 11.7404 15.6374 11.7404H15.1472C15.0119 11.7404 14.9021 11.8501 14.9021 11.9856ZM13.1864 11.9856V13.9463C13.1864 14.0816 13.2962 14.1914 13.4315 14.1914H13.9217C14.0571 14.1914 14.1668 14.0816 14.1668 13.9463V11.9856C14.1668 11.8501 14.0571 11.7404 13.9217 11.7404H13.4315C13.2962 11.7404 13.1864 11.8501 13.1864 11.9856ZM11.4707 11.9856V13.9463C11.4707 14.0816 11.5805 14.1914 11.7158 14.1914H12.2061C12.3414 14.1914 12.4511 14.0816 12.4511 13.9463V11.9856C12.4511 11.8501 12.3414 11.7404 12.2061 11.7404H11.7158C11.5805 11.7404 11.4707 11.8501 11.4707 11.9856ZM4.11789 12.9659C4.11789 12.6956 4.33804 12.4757 4.60813 12.4757C4.87832 12.4757 5.09827 12.6958 5.09827 12.9659C5.09827 13.2362 4.87822 13.4561 4.60813 13.4561C4.33784 13.4561 4.11789 13.236 4.11789 12.9659Z"
            fill="var(--viewer-text-primary)"
            fill-opacity="0.7"
          />
        </svg>

        <p class="Viewer-Settings__label">
          ~{diskSpace.toFixed(3)}GB
        </p>
      </div>
    </div>
    <ToggleSwitch
      id={'camera_minimap'}
      command={Commands.VISIBILITY}
      label={'Display minimap'}
      value={true}
    />
    {#if globalState !== undefined}
      <Slider
        state={globalState.prefetchBias}
        dataset={'engine'}
        formatter={val => (val * 100).toFixed(1) + '%'}
      />
    {/if}
  </div>
</div>

<style lang="scss">
  .Viewer-Settings {
    display: flex;
    font-family: Inter, Arial, 'sans-serif';
    flex-direction: column;
    gap: 6px;

    &__option {
      display: flex;
      flex-direction: row;
    }

    &__horizontalInputGroup {
      display: flex;
      gap: 6px;
      justify-content: space-evenly;

      input {
        border: 1px solid var(--viewer-border);
        border-radius: 6px;
        padding: 6px;
        margin: 0;
        height: 20px;
        font-style: normal;
        font-weight: normal;
        font-size: 14px;
        color: rgba(0, 0, 0, 0.87);
        width: 100px;
      }
    }

    &__header {
      border-bottom: 1px solid var(--viewer-border);
      vertical-align: middle;
      line-height: 28px;
      padding: 6px 20px;
      font-weight: 600;
      font-size: 14px;
      display: flex;

      svg {
        margin-right: 10px;
        width: 24px;
        height: 24px;
      }
    }

    &__container {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 16px;
    }

    &__group {
      display: flex;
      border-radius: 8px;
      border: 1px solid var(--viewer-border-disabled);
      align-items: center;
      padding: 4px;
    }

    &__label {
      white-space: nowrap;
      font-family: Inter, Arial, 'sans-serif';
      font-size: 12px;
      font-weight: 600;
      color: var(--viewer-text-primary);
      line-height: 20px;
      text-align: center;
      margin: 0;
      padding: 0px 8px;
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
  }
</style>
