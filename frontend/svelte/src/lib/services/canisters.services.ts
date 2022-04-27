import { queryCanisters } from "../api/canisters.api";
import type { CanisterDetails } from "../canisters/nns-dapp/nns-dapp.types";
import { canistersStore } from "../stores/canisters.store";
import { toastsStore } from "../stores/toasts.store";
import { queryAndUpdate } from "./utils.services";

export const listCanisters = async ({
  clearBeforeQuery,
}: {
  clearBeforeQuery?: boolean;
}) => {
  if (clearBeforeQuery === true) {
    canistersStore.setCanisters([]);
  }

  return queryAndUpdate<CanisterDetails[], unknown>({
    request: (options) => queryCanisters(options),
    onLoad: ({ response: canisters }) => canistersStore.setCanisters(canisters),
    onError: ({ error: err, certified }) => {
      console.error(err);

      if (certified !== true) {
        return;
      }

      // Explicitly handle only UPDATE errors
      canistersStore.setCanisters([]);

      toastsStore.error({
        labelKey: "error.list_canisters",
        err,
      });
    },
    logMessage: "Syncing Canisters",
  });
};
