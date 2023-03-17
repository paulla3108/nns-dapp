/**
 * @jest-environment jsdom
 */

import { AppPath } from "$lib/constants/routes.constants";
import { pageStore } from "$lib/derived/page.derived";
import ProjectDetail from "$lib/pages/ProjectDetail.svelte";
import { watchSnsMetrics } from "$lib/services/sns-swap-metrics.services";
import {
  loadSnsSwapCommitment,
  watchSnsTotalCommitment,
} from "$lib/services/sns.services";
import { authStore } from "$lib/stores/auth.store";
import { snsTicketsStore } from "$lib/stores/sns-tickets.store";
import { snsQueryStore, snsSwapCommitmentsStore } from "$lib/stores/sns.store";
import { page } from "$mocks/$app/stores";
import {
  mockAuthStoreSubscribe,
  mockPrincipal,
} from "$tests/mocks/auth.store.mock";
import { snsResponsesForLifecycle } from "$tests/mocks/sns-response.mock";
import { snsTicketMock } from "$tests/mocks/sns.mock";
import { Principal } from "@dfinity/principal";
import { SnsSwapLifecycle } from "@dfinity/sns";
import { render, waitFor } from "@testing-library/svelte";
import { get } from "svelte/store";

const mockUnwatchCommitmentsCall = jest.fn();
jest.mock("$lib/services/sns.services", () => {
  return {
    loadSnsSwapCommitment: jest.fn().mockResolvedValue(Promise.resolve()),
    loadSnsTotalCommitment: jest.fn().mockResolvedValue(Promise.resolve()),
    watchSnsTotalCommitment: jest
      .fn()
      .mockImplementation(() => mockUnwatchCommitmentsCall),
  };
});

const mockUnwatchMetricsCall = jest.fn();
jest.mock("$lib/services/sns-swap-metrics.services", () => {
  return {
    loadSnsSwapMetrics: jest.fn().mockResolvedValue(Promise.resolve()),
    watchSnsMetrics: jest.fn().mockImplementation(() => mockUnwatchMetricsCall),
  };
});

jest.mock("$lib/services/sns-sale.services", () => ({
  restoreSnsSaleParticipation: jest.fn().mockResolvedValue(undefined),
  hidePollingToast: jest.fn().mockResolvedValue(undefined),
  cancelPollGetOpenTicket: jest.fn().mockResolvedValue(undefined),
}));

describe("ProjectDetail", () => {
  describe("not logged in user", () => {
    page.mock({ data: { universe: null } });

    beforeEach(() => {
      jest.clearAllMocks();
      snsQueryStore.reset();
      snsSwapCommitmentsStore.reset();
    });

    describe("Open project", () => {
      const responses = snsResponsesForLifecycle({
        lifecycles: [SnsSwapLifecycle.Open],
        certified: true,
      });
      const rootCanisterId = responses[0][0].rootCanisterId;
      const props = {
        rootCanisterId,
      };
      beforeEach(() => {
        snsQueryStore.setData(responses);
      });

      it("should start watching derived state", async () => {
        render(ProjectDetail, props);

        await waitFor(() => expect(watchSnsTotalCommitment).toBeCalled());
      });

      it("should clear watch commitments on unmount", async () => {
        const { unmount } = render(ProjectDetail, props);

        expect(mockUnwatchCommitmentsCall).not.toBeCalled();

        unmount();

        await waitFor(() =>
          expect(mockUnwatchCommitmentsCall).toBeCalledTimes(1)
        );
      });

      it("should start watching metrics", async () => {
        render(ProjectDetail, props);

        await waitFor(() => expect(watchSnsMetrics).toBeCalled());
      });

      it("should clear watch metrics on unmount", async () => {
        const { unmount } = render(ProjectDetail, props);

        expect(mockUnwatchMetricsCall).not.toBeCalled();

        unmount();

        await waitFor(() => expect(mockUnwatchMetricsCall).toBeCalledTimes(1));
      });

      it("should clear watch commitments on unmount", async () => {
        const { unmount } = render(ProjectDetail, props);

        expect(mockUnwatchCommitmentsCall).not.toBeCalled();

        unmount();

        await waitFor(() =>
          expect(mockUnwatchCommitmentsCall).toBeCalledTimes(1)
        );
      });

      it("should not load user's commitnemtn", async () => {
        render(ProjectDetail, props);

        await waitFor(() => expect(loadSnsSwapCommitment).not.toBeCalled());
      });

      it("should render info section", async () => {
        const { queryByTestId } = render(ProjectDetail, props);

        expect(queryByTestId("sns-project-detail-info")).toBeInTheDocument();
      });

      it("should render status section", async () => {
        const { queryByTestId } = render(ProjectDetail, props);

        expect(queryByTestId("sns-project-detail-status")).toBeInTheDocument();
      });
    });

    describe("Committed project project", () => {
      const responses = snsResponsesForLifecycle({
        lifecycles: [SnsSwapLifecycle.Committed],
        certified: true,
      });
      const rootCanisterId = responses[0][0].rootCanisterId;
      const props = {
        rootCanisterId,
      };
      beforeEach(() => {
        snsQueryStore.setData(responses);
      });

      it("should not start watching derived state", async () => {
        const { queryByTestId } = render(ProjectDetail, props);

        expect(queryByTestId("sns-project-detail-status")).toBeInTheDocument();
        expect(watchSnsTotalCommitment).not.toBeCalled();
      });

      it("should not start watching metrics", async () => {
        const { queryByTestId } = render(ProjectDetail, props);

        expect(queryByTestId("sns-project-detail-status")).toBeInTheDocument();
        expect(watchSnsMetrics).not.toBeCalled();
      });
    });
  });

  describe("logged in user", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      snsQueryStore.reset();
      snsSwapCommitmentsStore.reset();
      jest
        .spyOn(authStore, "subscribe")
        .mockImplementation(mockAuthStoreSubscribe);
    });

    describe("Open project", () => {
      const responses = snsResponsesForLifecycle({
        lifecycles: [SnsSwapLifecycle.Open],
        certified: true,
      });
      const rootCanisterId = responses[0][0].rootCanisterId;
      const props = {
        rootCanisterId,
      };
      beforeEach(() => {
        snsQueryStore.setData(responses);
      });

      it("should start watching derived state", async () => {
        render(ProjectDetail, props);

        await waitFor(() => expect(watchSnsTotalCommitment).toBeCalled());
      });

      it("should clear watch on unmount", async () => {
        const { unmount } = render(ProjectDetail, props);

        expect(mockUnwatchCommitmentsCall).not.toBeCalled();

        unmount();

        await waitFor(() =>
          expect(mockUnwatchCommitmentsCall).toBeCalledTimes(1)
        );
      });

      it("should start watching metrics", async () => {
        render(ProjectDetail, props);

        await waitFor(() => expect(watchSnsMetrics).toBeCalled());
      });

      it("should clear watch metrics on unmount", async () => {
        const { unmount } = render(ProjectDetail, props);

        expect(mockUnwatchMetricsCall).not.toBeCalled();

        unmount();

        await waitFor(() => expect(mockUnwatchMetricsCall).toBeCalledTimes(1));
      });

      it("should load user's commitment", async () => {
        render(ProjectDetail, props);

        await waitFor(() => expect(loadSnsSwapCommitment).toBeCalled());
      });

      it.only("should show progress modal if open ticket is found", async () => {
        const { ticket: testTicket } = snsTicketMock({
          rootCanisterId: Principal.fromText(rootCanisterId),
          owner: mockPrincipal,
        });
        snsTicketsStore.setTicket({
          rootCanisterId: Principal.fromText(rootCanisterId),
          ticket: testTicket,
        });

        const { getByTestId } = render(ProjectDetail, {
          props: {
            rootCanisterId: "invalid-project",
          },
        });

        await waitFor(() =>
          expect(getByTestId("sale-in-progress-modal")).not.toBeNull()
        );
      });
    });

    describe("Committed project", () => {
      const responses = snsResponsesForLifecycle({
        lifecycles: [SnsSwapLifecycle.Committed],
        certified: true,
      });
      const rootCanisterId = responses[0][0].rootCanisterId;
      const props = {
        rootCanisterId,
      };
      beforeEach(() => {
        snsQueryStore.setData(responses);
      });

      it("should not start watching derived state", async () => {
        const { queryByTestId } = render(ProjectDetail, props);

        expect(queryByTestId("sns-project-detail-status")).toBeInTheDocument();
        expect(watchSnsTotalCommitment).not.toBeCalled();
      });

      it("should not start watching metrics", async () => {
        const { queryByTestId } = render(ProjectDetail, props);

        expect(queryByTestId("sns-project-detail-status")).toBeInTheDocument();
        expect(watchSnsMetrics).not.toBeCalled();
      });

      it("should load user's commitment", async () => {
        render(ProjectDetail, props);

        await waitFor(() => expect(loadSnsSwapCommitment).toBeCalled());
      });
    });
  });

  describe("invalid root canister id", () => {
    beforeEach(() => {
      page.mock({ data: { universe: null } });
    });

    it("should redirect to launchpad", () => {
      render(ProjectDetail, {
        props: {
          rootCanisterId: "invalid-project",
        },
      });

      waitFor(() => {
        const { path } = get(pageStore);
        expect(path).toEqual(AppPath.Launchpad);
      });
    });
  });

  describe("not found canister id", () => {
    beforeEach(() => {
      page.mock({ data: { universe: null } });
    });

    it("should redirect to launchpad", () => {
      render(ProjectDetail, {
        props: {
          rootCanisterId: "aaaaa-aa",
        },
      });

      waitFor(() => {
        const { path } = get(pageStore);
        expect(path).toEqual(AppPath.Launchpad);
      });
    });
  });
});
