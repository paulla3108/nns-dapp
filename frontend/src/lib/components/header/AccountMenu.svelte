<script lang="ts">
  import TestIdWrapper from "$lib/components/common/TestIdWrapper.svelte";
  import ManageInternetIdentityButton from "$lib/components/header/ManageInternetIdentityButton.svelte";
  import SettingsButton from "$lib/components/header/SettingsButton.svelte";
  import { authSignedInStore } from "$lib/derived/auth.derived";
  import { i18n } from "$lib/stores/i18n";
  import AccountDetails from "./AccountDetails.svelte";
  import LinkToCanisters from "./LinkToCanisters.svelte";
  import LoginIconOnly from "./LoginIconOnly.svelte";
  import Logout from "./Logout.svelte";
  import { IconUser, Popover } from "@dfinity/gix-components";

  let visible = false;
  let button: HTMLButtonElement | undefined;

  const toggle = () => (visible = !visible);
  const closeMenu = () => (visible = false);
</script>

<TestIdWrapper testId="account-menu-component">
  {#if $authSignedInStore}
    <button
      data-tid="account-menu"
      class="icon-only toggle"
      bind:this={button}
      on:click={toggle}
      aria-label={$i18n.header.account_menu}
    >
      <IconUser />
    </button>

    <Popover bind:visible anchor={button} direction="rtl">
      <div class="info">
        <AccountDetails />

        <ManageInternetIdentityButton />

        <SettingsButton on:nnsLink={closeMenu} />

        <LinkToCanisters on:nnsLink={closeMenu} />

        <Logout on:nnsLogoutTriggered={toggle} />
      </div>
    </Popover>
  {:else}
    <LoginIconOnly />
  {/if}
</TestIdWrapper>

<style lang="scss">
  @use "@dfinity/gix-components/dist/styles/mixins/header";

  .info {
    width: 100%;

    display: flex;
    flex-direction: column;
    gap: var(--padding-3x);
  }

  .toggle {
    @include header.button(--primary-tint);
  }
</style>
