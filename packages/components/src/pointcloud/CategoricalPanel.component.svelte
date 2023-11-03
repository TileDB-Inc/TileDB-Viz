<script>
  import Select from '../misc/Select.component.svelte';
  import Checkbox from '../misc/Checkbox.component.svelte';
  import Numeric from '../misc/NumericInput.component.svelte';

  const color_groups = new Array(64).fill('#000000');

  export let pointAttributes = [];
  export let feature = {};
  export let categories = {};

  let searchText = '';

  let availableAttributes = pointAttributes
    .filter(x => x.type.includes('string'))
    .map(x => x.name);
  let selectedAttribute = availableAttributes.indexOf(feature.attributes[0]);
  let state = Object.fromEntries(
    categories[availableAttributes[selectedAttribute]].map(x => [
      x,
      { group: 0, selected: false }
    ])
  );

  loadFeature();

  function onColorGroupChange(name, group) {
    state[name].group = group;
  }

  function onAttributeChange(index) {
    selectedAttribute = Number.parseInt(index);
    loadFeature();
  }

  function loadFeature() {
    color_groups.forEach(
      (x, index) =>
        (color_groups[index] =
          '#' +
          Math.floor(Math.random() * 2 ** 24)
            .toString(16)
            .padStart(6, '0'))
    );
    state = Object.fromEntries(
      categories[availableAttributes[selectedAttribute]].map(x => [
        x,
        { group: 0, selected: false }
      ])
    );

    if (
      availableAttributes.indexOf(feature.attributes[0]) === selectedAttribute
    ) {
      for (const category of feature.categories) {
        state[category.name].group = category.group;
        state[category.name].selected = true;
        color_groups[category.group] = category.color;
      }
    }
  }
</script>

<div class="Viewer-CategoricalPanel">
  <div class="Viewer-CategoricalPanel__section">
    <div class="Viewer-CategoricalPanel__section-header">
      Coloring mode - Categorical
    </div>
    <Select
      label={'Source'}
      value={selectedAttribute}
      options={availableAttributes}
      onchange={e => onAttributeChange(e.target.value)}
    />
    <input
      class="Viewer-CategoricalPanel__searchbar"
      placeholder="Category"
      type="text"
      bind:value={searchText}
    />
    <ul class="Viewer-CategoricalPanel__list">
      {#if categories[availableAttributes[selectedAttribute]].length === 0}
        No Available Categories
      {/if}
      {#each categories[availableAttributes[selectedAttribute]].filter(x => searchText === '' || x.includes(searchText)) as name, index}
        <li class="Viewer-CategoricalPanel__item">
          <Checkbox id={name} value={state[name].selected} />
          {name}
          <fragment class="Viewer-CategoricalPanel__color-group">
            <div class="Viewer-CategoricalPanel__color-group_expandable">
              <Numeric
                min={0}
                max={63}
                value={state[name].group}
                onchange={val => onColorGroupChange(name, val)}
              />
            </div>
            <input type="color" bind:value={color_groups[state[name].group]} />
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
