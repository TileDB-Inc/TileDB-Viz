<svelte:options customElement={{
  tag: 'pointcloud-panel',
  props: {
    features: { type: 'Array' },
    pointAttributes: { type: 'Array' },
    categories: { type: 'Object' }
  }
}} />

<script>
  import RGBPanel from './pointcloud/RGBPanel.component.svelte';
  import CategoricalPanel from './pointcloud/CategoricalPanel.component.svelte';
  import Select from './misc/Select.component.svelte';
  import Slider from './misc/InlineSlider.component.svelte';
  import Section from './Section.component.svelte';

  // Dummy data - Remove In Production
  export let features = [{name: "Color", type: "RGB", attributes: ["Red", "Green", "Blue"]}, 
                         {name: "Gene Type", type: "CATEGORICAL", attributes: ["Gene"], categories: [{name: "Gene A", group: 0, color: "#1304ff"}, {name: "Genotype C", group: 1, color: "#1a9aff"}]},
                         {name: "Elevation", type: "COLORMAP", attributes: ["Z"]}];
  export let pointAttributes = [{name: "Red", type: "uint8"},
                           {name: "Green", type: "uint8"}, 
                           {name: "Blue", type: "uint8"}, 
                           {name: "Gene", type: "string-utf8"}, 
                           {name: "X", type: "float64"}, 
                           {name: "Y", type: "float64"}, 
                           {name: "Z", type: "float64"}, 
                           {name: "Classification", type: "string-utf8"}];
  export let categories = {Gene : ["Gene A", "Gene B", "Genotype C", "Uncategorized"], Classification: ["Building"]};

  let selectedFeature = 0;
</script>

<Section id={'pointcloud-panel'} class="Viewer-PointCloud">
  <div slot="header" class="Viewer-PointCloud__title">
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.73518 20.1672H19.5261C20.3101 20.1672 20.9184 19.9422 21.3511 19.4921C21.7837 19.0421 22 18.367 22 17.4669V8.29442C22 7.40012 21.7721 6.72793 21.3162 6.27787C20.8603 5.82781 20.1765 5.60279 19.2648 5.60279H10.7892C10.493 5.60279 10.2448 5.56359 10.0444 5.48519C9.84408 5.40679 9.63357 5.27468 9.41289 5.08885L8.88153 4.6446C8.6899 4.482 8.50407 4.35424 8.32404 4.26132C8.14402 4.16841 7.94948 4.10163 7.74042 4.06098C7.53136 4.02033 7.28455 4 7 4H4.40418C3.63763 4 3.0453 4.21777 2.62718 4.65331C2.20906 5.08885 2 5.74797 2 6.63066V17.4669C2 18.367 2.22793 19.0421 2.6838 19.4922C3.13966 19.9422 3.82346 20.1673 4.73519 20.1673L4.73518 20.1672ZM4.7526 18.7648C4.31706 18.7648 3.98314 18.6501 3.75086 18.4207C3.51857 18.1913 3.40242 17.8502 3.40242 17.3972V6.70034C3.40242 6.27061 3.51276 5.94685 3.73343 5.72908C3.95411 5.51131 4.2735 5.40243 4.69162 5.40243H6.63413C6.92449 5.40243 7.1713 5.44163 7.37455 5.52002C7.5778 5.59842 7.78977 5.73344 8.01044 5.92508L8.5418 6.36062C8.72763 6.51741 8.91056 6.64227 9.09058 6.73518C9.27061 6.8281 9.4666 6.89633 9.67857 6.93988C9.89053 6.98344 10.1417 7.00522 10.4321 7.00522H19.2474C19.6771 7.00522 20.0096 7.11991 20.2448 7.34929C20.48 7.57868 20.5976 7.91985 20.5976 8.37281V17.4059C20.5976 17.8531 20.48 18.1913 20.2448 18.4207C20.0096 18.6501 19.6771 18.7648 19.2474 18.7648L4.7526 18.7648ZM2.85364 10.2108H21.1463V8.89544H2.85364V10.2108Z"
        fill="var(--viewer-text-disabled)"
      />
    </svg>
    Point Cloud
  </div>
  <div class="Viewer-PointCloud_main" slot="content">
    <Slider label={'Point size'} />
    <Select label={'Point shape'} options={['Circle', 'Square']} />
    <Select label={'Rendering algorithm'} options={['Default', 'HQ Splats']} />
    <Select
      label={'Display feature'}
      options={features.map(x => x.name)}
      onchange={e => (selectedFeature = Number.parseInt(e.target.value))}
    />
    <div class="Viewer-PointCloud_">
      {#if features[selectedFeature].type === 'RGB'}
        <RGBPanel
          pointAttributes={pointAttributes}
          feature={features[selectedFeature]}
        />
      {:else if features[selectedFeature].type === 'CATEGORICAL'}
        <CategoricalPanel
          pointAttributes={pointAttributes}
          categories={categories}
          feature={features[selectedFeature]}
        />
      {/if}
  </div>
</Section>

<style lang="scss">
  .Viewer-PointCloud {
    width: 320px;
    height: 600px;
    background-color: var(--viewer-background-primary);
    font-size: 14px;
    color: var(--viewer-text-primary);
    font-family: Inter, Arial, 'sans-serif';

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

    &_main {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
  }
</style>
