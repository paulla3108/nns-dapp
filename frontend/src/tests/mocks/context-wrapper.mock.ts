import type { Account } from "$lib/types/account";
import {
  SELECTED_SNS_NEURON_CONTEXT_KEY,
  type SelectedSnsNeuronContext,
  type SelectedSnsNeuronStore,
} from "$lib/types/sns-neuron-detail.context";
import {
  WALLET_CONTEXT_KEY,
  type WalletStore,
} from "$lib/types/wallet.context";
import { getSnsNeuronIdAsHexString } from "$lib/utils/sns-neuron.utils";
import ContextWrapperTest from "$vitests/lib/components/ContextWrapperTest.svelte";
import type { SnsNeuron } from "@dfinity/sns";
import type { RenderResult } from "@testing-library/svelte";
import { render } from "@testing-library/svelte";
import type { SvelteComponent } from "svelte";
import { writable } from "svelte/store";
import { rootCanisterIdMock } from "./sns.api.mock";

export const renderContextWrapper = <T>({
  Component,
  contextKey,
  contextValue,
  props,
}: {
  Component: typeof SvelteComponent;
  contextKey: symbol;
  contextValue: T;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: any;
}): RenderResult<SvelteComponent> =>
  render(ContextWrapperTest, {
    props: {
      contextKey,
      contextValue,
      Component,
      props,
    },
  });

export const renderSelectedAccountContext = ({
  Component,
  account,
}: {
  Component: typeof SvelteComponent;
  account: Account | undefined;
}): RenderResult<SvelteComponent> =>
  renderContextWrapper({
    contextKey: WALLET_CONTEXT_KEY,
    contextValue: {
      store: writable<WalletStore>({
        account,
        neurons: [],
      }),
    },
    Component,
  });

export const renderSelectedSnsNeuronContext = ({
  Component,
  neuron,
  reload,
  props,
}: {
  Component: typeof SvelteComponent;
  neuron: SnsNeuron;
  reload: () => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: any;
}) =>
  renderContextWrapper({
    Component,
    contextKey: SELECTED_SNS_NEURON_CONTEXT_KEY,
    contextValue: {
      store: writable<SelectedSnsNeuronStore>({
        selected: {
          neuronIdHex: getSnsNeuronIdAsHexString(neuron),
          rootCanisterId: rootCanisterIdMock,
        },
        neuron,
      }),
      reload,
    } as SelectedSnsNeuronContext,
    props,
  });
