<script lang="ts">
  import Checkbox from './Checkbox.component.svelte';
  import Numeric from './NumericInput.component.svelte';
  import { GUIEvent, ButtonProps, colorScheme, SelectProps } from '../types';
  import { Events, Commands } from '../constants/events';
  import { hexToRgb } from '../utils/helpers';

  export let target = '';
  export let state: Record<string, { group: number, selected: boolean }> = {};
  export let color_groups: string[] = [];

  let searchText = '';

  function onColorGroupChange(name, group) {
    state[name].group = group;

    window.dispatchEvent(
      new CustomEvent<GUIEvent<ButtonProps>>(Events.BUTTON_CLICK, {
        bubbles: true,
        detail: {
          target: `${target}_feature`,
          props: {
            command: Commands.GROUP,
            data: {
              category: categories.indexOf(name),
              group: state[name].selected ? state[name].group : 0xffffffff
            }
          }
        }
      })
    );
  }

  function onColorChange(name: string) {
    window.dispatchEvent(
      new CustomEvent<GUIEvent<ButtonProps>>(Events.COLOR_CHANGE, {
        bubbles: true,
        detail: {
          target: `${target}_${state[name].group}`,
          props: {
            command: Commands.COLOR,
            data: {
              ...hexToRgb(color_groups[state[name].group]),
              a: state[name].selected ? 1 : 0
            }
          }
        }
      })
    );
  }

  function onCategorySelect(name: string, selected: boolean) {
    state[name].selected = selected;

    window.dispatchEvent(
      new CustomEvent<GUIEvent<ButtonProps>>(Events.BUTTON_CLICK, {
        bubbles: true,
        detail: {
          target: `${target}_feature`,
          props: {
            command: Commands.GROUP,
            data: {
              category: categories.indexOf(name),
              group: state[name].selected ? state[name].group : 0xffffffff
            }
          }
        }
      })
    );
  }

  $: categories = Object.keys(state);
</script>

<div class="Viewer-CategoricalPanel">
  <div class="Viewer-CategoricalPanel__section">
    <div class="Viewer-CategoricalPanel__section-header">
      Coloring mode - Categorical
    </div>
    <input
      class="Viewer-CategoricalPanel__searchbar"
      placeholder="Category"
      type="text"
      bind:value={searchText}
    />
    <ul class="Viewer-CategoricalPanel__list">
      {#if categories.length === 0}
        No Available Categories
      {/if}
      {#each categories.filter(x => searchText === '' || x.includes(searchText)) as name, index}
        <li class="Viewer-CategoricalPanel__item">
          <Checkbox
            id={name}
            value={state[name].selected}
            callback={value => onCategorySelect(name, value)}
          />
          {name}
          <fragment class="Viewer-CategoricalPanel__color-group">
            <div class="Viewer-CategoricalPanel__color-group_expandable">
              <Numeric
                min={0}
                max={63}
                value={state[name].group}
                callback={group => onColorGroupChange(name, group)}
              />
            </div>
            <input
              type="color"
              bind:value={color_groups[state[name].group]}
              on:input={e => onColorChange(name)}
            />
          </fragment>
        </li>
      {/each}
    </ul>
  </div>
</div>

<style lang="scss">
  .Viewer-CategoricalPanel {
    color: var(--viewer-text-primary);
    font-size: 14px;
    border-top: 1px solid var(--viewer-border);
    border-bottom: 1px solid var(--viewer-border);
    margin-top: 10px;
    padding: 8px 0px;
    font-family: Inter, Arial, 'sans-serif';

    &__section-header {
      font-weight: 600;
      padding: 4px 0px;
    }

    &__section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    &__searchbar {
      background: var(--viewer-surface-primary);
      border: 1px solid var(--viewer-border);
      border-radius: 8px;
      padding: 4px;
      color: var(--viewer-text-primary);
    }

    &__list {
      list-style: none;
      padding: 8px;
      border: 1px solid var(--viewer-border);
      border-radius: 8px;
      max-height: 120px;
      overflow-y: auto;
      overflow-x: hidden;
      margin: 0;
    }

    &__item {
      display: flex;
      padding: 2px 3px;
      line-height: 18px;
      align-items: center;
      gap: 8px;
    }

    &__item:hover {
      background: var(--viewer-accent-05);
    }

    &__item input[type='color'] {
      cursor: pointer;
      -webkit-appearance: none;
      padding: 0;
      border: 1px solid var(--viewer-border);
      border-radius: 4px;
      width: 16px;
      height: 16px;
      margin: auto 0px auto 8px;
    }

    &__item input[type='color']::-webkit-color-swatch {
      border: none;
      border-radius: 4px;
      padding: 0;
    }

    &__item input[type='color']::-webkit-color-swatch-wrapper {
      border: none;
      border-radius: 4px;
      padding: 0;
    }

    &__color-group {
      margin: 0px 0px 0px auto;
      display: flex;
    }

    &__color-group_expandable {
      overflow: hidden;
      max-width: 0px;
      transition: max-width 0.5s ease-in-out;
    }

    &__color-group:hover &__color-group_expandable {
      max-width: 100px;
    }
  }
</style>
