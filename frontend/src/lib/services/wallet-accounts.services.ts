import { FORCE_CALL_STRATEGY } from "$lib/constants/mockable.constants";
import { queryAndUpdate } from "$lib/services/utils.services";
import { getAccounts } from "$lib/services/wallet-loader.services";
import { loadToken } from "$lib/services/wallet-tokens.services";
import { icrcAccountsStore } from "$lib/stores/icrc-accounts.store";
import { icrcTransactionsStore } from "$lib/stores/icrc-transactions.store";
import { toastsError } from "$lib/stores/toasts.store";
import type { Account } from "$lib/types/account";
import { notForceCallStrategy } from "$lib/utils/env.utils";
import { toToastError } from "$lib/utils/error.utils";
import type { Principal } from "@dfinity/principal";

/**
 * TODO: once sns are migrated to store this module can probably be reused and renamed to icrc-accounts.services
 */

export const loadAccounts = async ({
  handleError,
  ledgerCanisterId,
}: {
  handleError?: () => void;
  ledgerCanisterId: Principal;
}): Promise<void> => {
  return queryAndUpdate<Account[], unknown>({
    strategy: FORCE_CALL_STRATEGY,
    request: ({ certified, identity }) =>
      getAccounts({ identity, certified, ledgerCanisterId }),
    onLoad: ({ response: accounts, certified }) =>
      icrcAccountsStore.set({
        ledgerCanisterId,
        accounts: {
          accounts,
          certified,
        },
      }),
    onError: ({ error: err, certified }) => {
      console.error(err);

      if (!certified && notForceCallStrategy()) {
        return;
      }

      // hide unproven data
      icrcAccountsStore.reset();
      icrcTransactionsStore.resetUniverse(ledgerCanisterId);

      toastsError(
        toToastError({
          err,
          fallbackErrorLabelKey: "error.accounts_load",
        })
      );

      handleError?.();
    },
    logMessage: "Syncing Accounts",
  });
};

export const syncAccounts = async (params: {
  handleError?: () => void;
  ledgerCanisterId: Principal;
}) => await Promise.all([loadAccounts(params), loadToken(params)]);
