<script>
  import Select from '../misc/Select.component.svelte';

  export let pointAttributes = [];
  export let feature = {};

  let availableAttributes = pointAttributes
    .filter(x => x.type.includes('int'))
    .map(x => x.name);
  let values = feature.attributes.map(x => availableAttributes.indexOf(x));

  function onAttributeChange(index, attribute) {
    values[index] = Number.parseInt(attribute);
  }
</script>

<div class="Viewer-RGBPanel">
  <div class="Viewer-RGBPanel__section">
    <div class="Viewer-RGBPanel__section-header">Coloring mode - RGB</div>
    <Select
      label={'Red channel'}
      options={availableAttributes}
      value={values[0]}
      onchange={e => onAttributeChange(0, e.target.value)}
    />
    <Select
      label={'Green channel'}
      options={availableAttributes}
      value={values[1]}
      onchange={e => onAttributeChange(1, e.target.value)}
    />
    <Select
      label={'Blue channel'}
      options={availableAttributes}
      value={values[2]}
      onchange={e => onAttributeChange(2, e.target.value)}
    />
  </div>
</div>

<style lang="scss">
  .Viewer-RGBPanel {
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
  }
</style>
