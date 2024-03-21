import SnsProposalsList from "$lib/components/sns-proposals/SnsProposalsList.svelte";
import { actionableProposalsSegmentStore } from "$lib/stores/actionable-proposals-segment.store";
import { waitForMilliseconds } from "$lib/utils/utils";
import { resetIdentity, setNoIdentity } from "$tests/mocks/auth.store.mock";
import {
  createSnsProposal,
  mockSnsProposal,
} from "$tests/mocks/sns-proposals.mock";
import { SnsProposalListPo } from "$tests/page-objects/SnsProposalList.page-object";
import { JestPageObjectElement } from "$tests/page-objects/jest.page-object";
import { allowLoggingInOneTestForDebugging } from "$tests/utils/console.test-utils";
import { runResolvedPromises } from "$tests/utils/timers.test-utils";
import type { SnsProposalData } from "@dfinity/sns";
import { SnsProposalDecisionStatus } from "@dfinity/sns";
import { render, cleanup } from "@testing-library/svelte";
import { tick } from "svelte";

describe("SnsProposalsList", () => {
  let prevContainer;

  const renderComponent = async (props) => {
    cleanup();
    const { container } = render(SnsProposalsList, { props });
    if (container === prevContainer) {
      console.log('dskloetx container === prevContainer');
    } else {
      console.log('dskloetx container !== prevContainer');
    }
    console.log('dskloetx container.innerHTML', container.innerHTML);
    prevContainer = container;
    await runResolvedPromises();
    return SnsProposalListPo.under(new JestPageObjectElement(container));
  };
  const proposal1: SnsProposalData = {
    ...mockSnsProposal,
    id: [{ id: 1n }],
  };
  const proposal2: SnsProposalData = {
    ...mockSnsProposal,
    id: [{ id: 2n }],
  };
  const proposal3: SnsProposalData = {
    ...mockSnsProposal,
    id: [{ id: 3n }],
  };
  const proposals = [proposal1, proposal2, proposal3];

  beforeEach(() => {
    allowLoggingInOneTestForDebugging();
    actionableProposalsSegmentStore.resetForTesting();
  });

  it("should render a proposal card per proposal", () => {
    const { queryAllByTestId } = render(SnsProposalsList, {
      props: {
        proposals,
        includeBallots: false,
        snsName: undefined,
        actionableSelected: false,
        nsFunctions: [],
      },
    });

    expect(queryAllByTestId("proposal-card").length).toBe(proposals.length);
  });

  it("should render a spinner when loading next page", () => {
    const { queryByTestId } = render(SnsProposalsList, {
      props: {
        proposals,
        includeBallots: false,
        snsName: undefined,
        actionableSelected: false,
        nsFunctions: [],
        loadingNextPage: true,
      },
    });

    expect(
      queryByTestId("next-page-sns-proposals-spinner")
    ).toBeInTheDocument();
  });

  it("should render a card skeletons if proposals are loading", () => {
    const { queryByTestId } = render(SnsProposalsList, {
      props: {
        proposals: undefined,
        includeBallots: false,
        snsName: undefined,
        actionableSelected: false,
        nsFunctions: [],
      },
    });

    expect(queryByTestId("proposals-loading")).toBeInTheDocument();
  });

  it("should render no proposals found message if proposals is empty", () => {
    const { queryByTestId } = render(SnsProposalsList, {
      props: {
        proposals: [],
        includeBallots: false,
        snsName: undefined,
        actionableSelected: false,
        nsFunctions: [],
      },
    });

    expect(queryByTestId("no-proposals-msg")).toBeInTheDocument();
  });

  describe("actionable proposals", () => {
    const actionableProposal = createSnsProposal({
      proposalId: 123n,
      status: SnsProposalDecisionStatus.PROPOSAL_DECISION_STATUS_OPEN,
    });
    beforeEach(() => {
      resetIdentity();
    });

    it("should render skeletons while proposals are loading", async () => {
      const po = await renderComponent({
        proposals: undefined,
        includeBallots: true,
        snsName: "sns-name",
        actionableSelected: true,
        nsFunctions: [],
      });

      expect(await po.getSkeletonCardPo().isPresent()).toBe(true);
    });

    it('should display "Not signIn" banner', async () => {
      setNoIdentity();
      const po = await renderComponent({
        proposals: undefined,
        includeBallots: false,
        snsName: "sns-name",
        actionableSelected: true,
        nsFunctions: [],
      });
      expect(await po.getActionableSignInBanner().isPresent()).toBe(true);

      resetIdentity();
      const po2 = await renderComponent({
        proposals: undefined,
        includeBallots: false,
        snsName: "sns-name",
        actionableSelected: true,
        nsFunctions: [],
      });
      expect(await po2.getActionableSignInBanner().isPresent()).toBe(false);
    });

    it('should display "No actionable proposals" banner', async () => {
      const po = await renderComponent({
        proposals: [],
        includeBallots: true,
        snsName: "sns-name",
        actionableSelected: true,
        nsFunctions: [],
      });
      expect(await po.getActionableEmptyBanner().isPresent()).toBe(true);

      const po2 = await renderComponent({
        proposals: [actionableProposal],
        includeBallots: true,
        snsName: "sns-name",
        actionableSelected: true,
        nsFunctions: [],
      });

      console.log(await po2.root.innerHtmlForDebugging());

      expect(await po2.getActionableEmptyBanner().isPresent()).toBe(false);
    });

    it.only('should display "Actionable not supported" banner', async () => {
      console.log('dskloetx test 1');
      const po = await renderComponent({
        proposals: [],
        includeBallots: false,
        snsName: "sns-name",
        actionableSelected: true,
        nsFunctions: [],
      });
    //});

    //it.only('should display "Actionable not supported" banner', async () => {
    /*
      console.log('dskloetx test 2');
      expect(await po.getActionableNotSupportedBanner().isPresent()).toBe(true);
      expect(await po.getActionableNotSupportedBanner().getTitleText()).toBe(
        "sns-name doesn't yet support actionable proposals."
      );
      console.log('dskloetx test 3');
      */

      await tick();
      await tick();
      await tick();
      await tick();
      await waitForMilliseconds(1000);
      console.log('dskloetx test 4');

      actionableProposalsSegmentStore.resetForTesting();
      resetIdentity();

      console.log('dskloetx test 5');

      const poTwo = await renderComponent({
        proposals: [],
        includeBallots: true,
        snsName: "sns-name",
        actionableSelected: true,
        nsFunctions: [],
      });

      console.log('dskloetx test 6');

      await waitForMilliseconds(1000);

      console.log('dskloetx test 7');

      console.log(await poTwo.root.innerHtmlForDebugging());

      expect(await poTwo.getActionableNotSupportedBanner().isPresent()).toBe(
        false
      );

      console.log('dskloetx test 8');
    });

    it("should display actionable proposals", async () => {
      const po = await renderComponent({
        proposals: [actionableProposal],
        includeBallots: true,
        snsName: "sns-name",
        actionableSelected: true,
        nsFunctions: [],
      });
      expect((await po.getProposalCardPos()).length).toEqual(1);
      expect(await (await po.getProposalCardPos())[0].getProposalId()).toEqual(
        "ID: 123"
      );
    });
  });
});
