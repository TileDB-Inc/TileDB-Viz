<script lang="ts">
  import { GUIVectorPropertyState } from "../types";

  export let callback = (value: [number, number, number], dataset: string, property: string) => {};
  export let dataset: string = '';
  export let state: GUIVectorPropertyState;
</script>


<div class="Viewer-VectorInput">
  <label for="vectorX">{state.property.name}</label>
  <div class="Viewer-VectorInput__input-container">
    <input type="number" name="vectorX" title="X axis" bind:value={state.value[0]}/>
    <input type="number" name="vectorY" title="Y axis" bind:value={state.value[1]}/>
    <input type="number" name="vectorZ" title="Z axis" bind:value={state.value[2]}/>
  </div>
</div>

<style lang="scss">
	.Viewer-VectorInput {
		font-size: 14px;
    display: flex;
    gap: 6px;
		color: var(--viewer-text-primary);

    &__input-container {
      max-width: 240px;
      display: flex;
      gap: 6px;
    }
	}

	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
	  -webkit-appearance: none;
	  margin: 0;
	}
	
	/* Firefox */
	input[type=number] {
	  -moz-appearance: textfield;
    appearance: textfield;
		min-width: 0;
		background: var(--viewer-background-primary);
		color: var(--viewer-text-primary);
		border: 1px solid Var(--viewer-border);
		border-radius: 4px;
		font-size: 14px;
	}

	label {
		min-width: 140px;
		line-height: 25px;
		vertical-align: middle;
		color: var(--viewer-text-primary);
	}
</style>