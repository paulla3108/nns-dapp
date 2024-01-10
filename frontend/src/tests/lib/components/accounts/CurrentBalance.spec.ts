import CurrentBalance from "$lib/components/accounts/CurrentBalance.svelte";
import { formatTokenE8s } from "$lib/utils/token.utils";
import en from "$tests/mocks/i18n.mock";
import { mockMainAccount } from "$tests/mocks/icp-accounts.store.mock";
import { ICPToken, TokenAmount } from "@dfinity/utils";
import { render } from "@testing-library/svelte";

describe("CurrentBalance", () => {
  const props = {
    balance: TokenAmount.fromE8s({
      amount: mockMainAccount.balanceUlps,
      token: ICPToken,
    }),
  };

  it("should render a title", () => {
    const { getByText } = render(CurrentBalance, { props });

    expect(
      getByText(en.accounts.current_balance, { exact: false })
    ).toBeTruthy();
  });

  it("should render a balance in ICP", () => {
    const { getByText, queryByTestId } = render(CurrentBalance, { props });

    const icp: HTMLSpanElement | null = queryByTestId("token-value");

    expect(icp?.innerHTML).toEqual(
      `${formatTokenE8s({ value: mockMainAccount.balanceUlps })}`
    );
    expect(getByText(`ICP`)).toBeTruthy();
  });
});
