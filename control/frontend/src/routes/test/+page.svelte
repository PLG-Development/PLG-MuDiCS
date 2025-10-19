<script lang="ts">
  let isHoveringChild = false;

  function handleClickParent() {
    if (!isHoveringChild) {
      console.log('Parent clicked');
    }
  }

  function handleClickChild(event: MouseEvent) {
    console.log('Child clicked');
    // Verhindert, dass das Event nach oben propagiert
    event.stopPropagation();
  }
</script>

<div
  class={`relative rounded-lg p-6 transition-colors duration-200 
    ${isHoveringChild ? 'bg-gray-200' : 'bg-gray-300 hover:bg-gray-400 active:bg-gray-500'}
  `}
  on:click={handleClickParent}
>
  <p>Ich bin das Haupt-Div</p>

  <div
    class="no-display-selectable mt-4 p-4 bg-white border rounded shadow cursor-pointer"
    on:mouseenter={() => (isHoveringChild = true)}
    on:mouseleave={() => (isHoveringChild = false)}
    on:click={handleClickChild}
  >
    Ich bin das Kind-Div (no-display-selectable)
  </div>

  <p class="mt-4">Noch mehr Inhalt...</p>
</div>
