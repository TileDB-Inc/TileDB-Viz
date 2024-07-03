<script lang="ts">
    import { GUIEvent } from '@tiledb-inc/viz-common';
  import { ButtonProps, GUIChannelPropertyState, SliderProps } from '../types';
    import { Commands, Events } from '../constants/events';
    import { hexToRgb } from '../utils/helpers';

  export let state: GUIChannelPropertyState;
  export let dataset: string = '';

  function onChangeLow() {
    if (state.valueMin >= state.valueMax) {
      state.valueMin = state.valueMax;
    }

    onRangeChange();
  }

  function onChangeHigh() {
    if (state.valueMax <= state.valueMin) {
      state.valueMax = state.valueMin;
    }

    onRangeChange();
  }

  function onRangeChange() {
    window.dispatchEvent(
      new CustomEvent<GUIEvent<SliderProps>>(Events.SLIDER_CHANGE, {
        bubbles: true,
        detail: {
          target: `${dataset}_${state.property.id}`,
          props: {
            range: [state.valueMin, state.valueMax]
          }
        }
      })
    );
  }

  function onVisibilityChange() {
    state.visible = !state.visible;

    window.dispatchEvent(
      new CustomEvent<GUIEvent<ButtonProps>>(Events.TOGGLE_INPUT_CHANGE, {
        bubbles: true,
        detail: {
          target: `${dataset}_${state.property.id}`,
          props: {
            command: Commands.VISIBILITY,
            data: state.visible
          }
        }
      })
    );
  }

  function onColorChange() {
    window.dispatchEvent(
      new CustomEvent<GUIEvent<ButtonProps>>(Events.COLOR_CHANGE, {
        bubbles: true,
        detail: {
          target: `${dataset}_${state.property.id}`,
          props: {
            command: Commands.COLOR,
            data: hexToRgb(state.color)
          }
        }
      })
    );
  }
</script>

<div
  class="Viewer-DoubleSlider"
  style="--minValue: {(state.valueMin /
    (state.property.max - state.property.min)) *
    100}%; --maxValue: {(state.valueMax /
    (state.property.max - state.property.min)) *
    100}%; --color: {state.color}"
>
  <div class="Viewer-DoubleSlider__info">
    <div class="Viewer-DoubleSlider__options">
      <button class="Viewer-DoubleSlider__icon-wrapper" on:click={onVisibilityChange}>
        {#if state.visible}
          <svg
            class="Viewer-DoubleSlider__icon"
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>Hide channel</title>
            <path
              d="M24 8C29.908 8 35.054 11.054 39 15C41.922 17.922 44 22.044 44 24C44 25.956 41.922 30.078 39 33C35.054 36.946 29.908 40 24 40C18.092 40 12.946 36.946 9 33C5.054 29.054 4 25.956 4 24C4 22.044 6.078 17.922 9 15C12.946 11.054 18.092 8 24 8ZM24 14C21.3478 14 18.8043 15.0536 16.9289 16.9289C15.0536 18.8043 14 21.3478 14 24C14 26.6522 15.0536 29.1957 16.9289 31.0711C18.8043 32.9464 21.3478 34 24 34C26.6522 34 29.1957 32.9464 31.0711 31.0711C32.9464 29.1957 34 26.6522 34 24C34 21.3478 32.9464 18.8043 31.0711 16.9289C29.1957 15.0536 26.6522 14 24 14ZM24 18.5C25.4587 18.5 26.8576 19.0795 27.8891 20.1109C28.9205 21.1424 29.5 22.5413 29.5 24C29.5 25.4587 28.9205 26.8576 27.8891 27.8891C26.8576 28.9205 25.4587 29.5 24 29.5C22.5413 29.5 21.1424 28.9205 20.1109 27.8891C19.0795 26.8576 18.5 25.4587 18.5 24C18.5 22.5413 19.0795 21.1424 20.1109 20.1109C21.1424 19.0795 22.5413 18.5 24 18.5Z"
              fill="var(--viewer-text-tertiary)"
            />
          </svg>
        {:else}
          <svg
            class="Viewer-DoubleSlider__icon"
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>Show channel</title>
            <path
              d="M42.12 5.87936C42.6452 6.4041 42.9572 7.10495 42.9956 7.84638C43.034 8.58781 42.7962 9.31715 42.328 9.89336L42.122 10.1214L10.122 42.1214C9.57953 42.6719 8.84553 42.9918 8.07299 43.0144C7.30045 43.037 6.54898 42.7606 5.97522 42.2428C5.40145 41.725 5.04966 41.0058 4.99317 40.235C4.93668 39.4642 5.17986 38.7013 5.672 38.1054L5.878 37.8774L9.898 33.8614C9.592 33.5794 9.292 33.2914 9 32.9994C5.054 29.0534 4 25.9554 4 23.9994C4 22.0434 6.078 17.9214 9 14.9994C12.946 11.0534 18.092 7.99936 24 7.99936C27.342 7.99936 30.44 8.97736 33.216 10.5394L37.878 5.87936C38.1566 5.60058 38.4874 5.37943 38.8515 5.22855C39.2156 5.07766 39.6059 5 40 5C40.3941 5 40.7844 5.07766 41.1485 5.22855C41.5126 5.37943 41.8434 5.60058 42.122 5.87936H42.12ZM40.956 17.2854C42.806 19.7914 44 22.5194 44 23.9994C44 25.9554 41.922 30.0774 39 32.9994C35.054 36.9454 29.908 39.9994 24 39.9994C22.26 39.9994 20.582 39.7334 18.984 39.2594L24.246 33.9934L24.434 33.9894C26.9655 33.8792 29.3608 32.812 31.1358 31.0037C32.9107 29.1953 33.933 26.7805 33.996 24.2474L40.956 17.2874V17.2854ZM24 13.9994C22.2806 13.999 20.5901 14.4419 19.0919 15.2854C17.5936 16.1289 16.3381 17.3445 15.4467 18.8147C14.5552 20.285 14.0579 21.9603 14.0028 23.6788C13.9477 25.3973 14.3366 27.101 15.132 28.6254L18.618 25.1374C18.4283 24.2413 18.4653 23.312 18.7258 22.4339C18.9863 21.5558 19.462 20.7566 20.1096 20.109C20.7573 19.4613 21.5564 18.9857 22.4346 18.7252C23.3127 18.4647 24.2419 18.4276 25.138 18.6174L28.626 15.1314C27.1983 14.3853 25.6109 13.9969 24 13.9994Z"
              fill="var(--viewer-text-tertiary)"
            />
          </svg>
        {/if}
      </button>
      <div>{state.property.name}</div>
    </div>
    <input type="color" bind:value={state.color} on:input={onColorChange}/>
  </div>
  <div class="Viewer-DoubleSlider__sliders">
    <input
      type="range"
      min={state.property.min}
      max={state.property.max}
      step={state.property.step}
      bind:value={state.valueMin}
      on:input={onChangeLow}
    />
    <input
      type="range"
      min={state.property.min}
      max={state.property.max}
      step={state.property.step}
      bind:value={state.valueMax}
      on:input={onChangeHigh}
    />
  </div>
  <div class="Viewer-DoubleSlider__controls">
    <input
      type="number"
      min={state.property.min}
      max={state.property.max}
      bind:value={state.valueMin}
      on:change={onChangeLow}
    />
    <input
      type="number"
      min={state.property.min}
      max={state.property.max}
      bind:value={state.valueMax}
      on:change={onChangeHigh}
    />
  </div>
</div>

<style lang="scss">
  .Viewer-DoubleSlider {
    display: flex;
    flex-direction: column;
    font-family: Inter, Arial, 'sans-serif';
    padding: 8px;
    border-radius: 8px;
    box-shadow: var(--viewer-shadow-small);

    &__sliders {
      position: relative;
      min-height: 20px;
    }

    &__controls {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
    }

    &__info {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      color: var(--viewer-text-primary);
      font-size: 14px;
      margin-bottom: 10px;
      text-transform: capitalize;
    }

    &__options {
      display: flex;
      flex-direction: row;
      line-height: 20px;
      align-items: center;
    }

    &__icon {
      height: auto;
      width: 18px;
    }

    &__icon-wrapper {
      background: none;
      border: none;
      padding: 0;
      margin: 3px 8px 3px 8px;
      cursor: pointer;
      width: 18px;
      height: 18px;
    }
  }

  input[type='color'] {
    cursor: pointer;
    -webkit-appearance: none;
    padding: 0;
    border-radius: 10px;
    width: 18px;
    height: 18px;
    margin: 3px 0px;
    border: 1px solid var(--viewer-border);
  }

  input[type='color']::-webkit-color-swatch {
    border: none;
    border-radius: 10px;
    padding: 0;
  }

  input[type='color']::-webkit-color-swatch-wrapper {
    border: none;
    border-radius: 10px;
    padding: 0;
  }

  input[type='number']::-webkit-inner-spin-button {
    -webkit-appearance: none;
  }

  input[type='number'] {
    color: var(--viewer-text-primary);
    font-size: 14px;
    border: 1px solid var(--viewer-border);
    background: var(--viewer-background-primary);
    padding: 4px;
    text-align: center;
    border-radius: 8px;
    width: 50px;
  }

  .Viewer-DoubleSlider__sliders input[type='range']:first-child {
    height: 0;
    z-index: 1;
  }

  .Viewer-DoubleSlider__sliders input[type='range']:last-child {
    background: linear-gradient(
      to right,
      var(--viewer-border) 0%,
      var(--viewer-border) var(--minValue),
      var(--color) var(--maxValue),
      var(--viewer-border) var(--maxValue),
      var(--viewer-border) 100%
    );
    box-shadow: var(--viewer-shadow-medium);
  }

  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    pointer-events: all;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    box-shadow: var(--viewer-shadow-medium);
    cursor: pointer;
    background: var(--viewer-surface-primary);
    content: 10;
    transition:
      background 0.2s ease-in-out,
      width 0.2s ease-in-out,
      height 0.2s ease-in-out;
  }

  input[type='range']::-webkit-slider-thumb:hover {
    background: var(--viewer-background-primary);
    width: 20px;
    height: 20px;
    z-index: 4;
  }

  input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    height: 1px;
    width: 100%;
    position: absolute;
    background-color: #c6c6c6;
    pointer-events: none;
  }

  input[type='range']::-webkit-slider-thumb:active {
    box-shadow:
      inset 0 0 3px
        color-mix(in srgb, var(--viewer-background-primary), var(--color)),
      0 0 9px
        color-mix(in srgb, var(--viewer-background-primary), var(--color));
    -webkit-box-shadow:
      inset 0 0 3px
        color-mix(in srgb, var(--viewer-background-primary), var(--color)),
      0 0 9px
        color-mix(in srgb, var(--viewer-background-primary), var(--color));
  }
</style>
