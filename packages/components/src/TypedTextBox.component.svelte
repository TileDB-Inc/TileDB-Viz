<svelte:options customElement="typed-textbox" />

<script>  
  export let attribute = {};
  export let value = '';
</script>

<div class="Viewer-TypedInput">
  <div class="Viewer-TypedInput__title">
    {attribute.name}
  </div>
  <div class='Viewer-TypedInput__input'>
    <input type="text" value="{value}" placeholder="Empty" readonly={true}>
    <div class='Viewer-TypedInput__pill' title={attribute.type}>{attribute.type}</div>
  </div>
</div>

<style lang="scss">
  .Viewer-TypedInput {
    display: flex;
    align-items: center;
    margin: 6px 0px;
    font-family: Inter, Arial, 'sans-serif';
    justify-content: space-between;
    font-size: 14px;

    &__title {
      margin: 0;
      padding-left: 8px;
      width: 100px;
      text-overflow: ellipsis;
    }

    &__input {
      position: relative;

      input {
        font-family: Inter, Arial, 'sans-serif';
        border: 1px solid var(--viewer-border);
        border-radius: 6px;
        padding: 6px 74px 6px 6px;
        margin: 0;
        font-style: normal;
        font-weight: 400;
        font-size: 14px;
        color: rgba(0, 0, 0, 0.87);
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        width: 150px;
      }
    }

    &__pill {
      position: absolute;
      top: 0;
      bottom: 0;
      right: 0;
      margin: 6px;
      padding: 0px 4px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      border-radius: 100px;
      background-color: #0070f09f;
      color: hsla(0deg, 0%, 100%, 1);
      width: 60px;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      text-align: center;
      letter-spacing: 1px;
      line-height: 20px;
    }
  } 
</style>
