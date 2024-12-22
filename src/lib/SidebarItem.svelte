<script>
  let { icon, title = "", isSelected, onclick } = $props();
</script>

<li class="bx--side-nav__item">
  <button
    {onclick}
    class="sidebar-nav-element {isSelected && 'sidebar-nav-element__current'}"
  >
    <div class="sidebar-nav-element__icon bx--side-nav__icon--small">
      {#if !!icon}
        {@render icon({size: 16})}
      {/if}
    </div>
    <span> {title} </span>
  </button>
</li>

<style>
  .sidebar-nav-element {
    border: none;
    position: relative;
    display: flex;
    min-height: 3rem;
    width: 100%;
    /* min-width: 5rem; */
    padding: 0 0.4rem 0 0.6rem;
    cursor: pointer;
    /* color: #525252; */
    /* background: #fff; */
    background-color: var(--cds-ui-background, #fff);
    color: var(--cds-text-01, #525252);


    display: flex;
    flex-flow: column;
    justify-content: center;
    align-items: center;
  }

  .sidebar-nav-element__current {
    background-color: var(--cds-ui-01, #f4f4f4);
    /* color: var(--cds-text-01, #fff); */
  }

  .sidebar-nav-element__icon {
    display: flex;
    flex: 0 0 1rem;
    align-items: center;
    justify-content: center;
  }

  .sidebar-nav-element__current::before {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 4px;
    background-color: #0f62fe;
    content: "";
  }
</style>
