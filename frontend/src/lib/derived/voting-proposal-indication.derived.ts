import { OWN_CANISTER_ID } from "$lib/constants/canister-ids.constants";
import { AppPath } from "$lib/constants/routes.constants";
import { authSignedInStore } from "$lib/derived/auth.derived";
import { pageStore } from "$lib/derived/page.derived";
import { actionableNnsProposalsStore } from "$lib/stores/actionable-nns-proposals.store";
import { actionableSnsProposalsStore } from "$lib/stores/actionable-sns-proposals.store";
import { isSelectedPath } from "$lib/utils/navigation.utils";
import { isNullish } from "@dfinity/utils";
import { derived, type Readable } from "svelte/store";

export interface VotingProposalCountData {
  // We use the root canister id as the key to identify the proposals for a specific project.
  [rootCanisterId: string]: number | undefined;
}

/** Returns true when the indication needs to be shown */
export const votingProposalIndicationEnabledStore: Readable<boolean> = derived(
  [pageStore, authSignedInStore],
  ([{ path: currentPath }, isSignedInd]) =>
    isNullish(currentPath)
      ? false
      : isSignedInd &&
        isSelectedPath({
          currentPath,
          paths: [AppPath.Proposals],
        })
);

/** A store that contains the count of proposals that can be voted on by the user mapped by canister id (nns + snses) */
export const votingProposalCountStore: Readable<VotingProposalCountData> =
  derived(
    [actionableNnsProposalsStore, actionableSnsProposalsStore],
    ([{ proposals: nnsProposals }, votingSnsProposals]) => {
      const snsProposalCounts = Object.entries(votingSnsProposals).reduce(
        (acc, [canisterId, proposals]) => ({
          ...acc,
          [canisterId]: proposals.length,
        }),
        {}
      );

      return {
        [OWN_CANISTER_ID.toText()]: nnsProposals?.length,
        ...snsProposalCounts,
      };
    }
  );
