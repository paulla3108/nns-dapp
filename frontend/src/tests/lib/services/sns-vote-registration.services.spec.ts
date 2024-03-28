import * as api from "$lib/api/sns-governance.api";
import * as snsGovernanceApi from "$lib/api/sns-governance.api";
import { registerSnsVotes } from "$lib/services/sns-vote-registration.services";
import { actionableSnsProposalsStore } from "$lib/stores/actionable-sns-proposals.store";
import { snsFunctionsStore } from "$lib/stores/sns-functions.store";
import { snsProposalsStore } from "$lib/stores/sns-proposals.store";
import * as toastsStore from "$lib/stores/toasts.store";
import { enumValues } from "$lib/utils/enum.utils";
import { getSnsNeuronIdAsHexString } from "$lib/utils/sns-neuron.utils";
import {
  mockIdentity,
  mockPrincipal,
  resetIdentity,
} from "$tests/mocks/auth.store.mock";
import { nervousSystemFunctionMock } from "$tests/mocks/sns-functions.mock";
import { createMockSnsNeuron } from "$tests/mocks/sns-neurons.mock";
import { principal } from "$tests/mocks/sns-projects.mock";
import { mockSnsProposal } from "$tests/mocks/sns-proposals.mock";
import { runResolvedPromises } from "$tests/utils/timers.test-utils";
import { NeuronState } from "@dfinity/nns";
import type { Principal } from "@dfinity/principal";
import type { SnsProposalData } from "@dfinity/sns";
import {
  SnsNeuronPermissionType,
  SnsProposalRewardStatus,
  SnsVote,
} from "@dfinity/sns";
import { fromDefinedNullable } from "@dfinity/utils";
import { waitFor } from "@testing-library/svelte";
import { get } from "svelte/store";

describe("sns-vote-registration-services", () => {
  const rootCanisterId = mockPrincipal;
  const allPermissions = [
    {
      principal: [mockIdentity.getPrincipal()] as [Principal],
      permission_type: Int32Array.from(enumValues(SnsNeuronPermissionType)),
    },
  ];
  const neurons = [
    createMockSnsNeuron({
      id: [1],
      stake: 1n,
      state: NeuronState.Locked,
      permissions: allPermissions,
      createdTimestampSeconds: 0n,
    }),
    createMockSnsNeuron({
      id: [2],
      stake: 2n,
      state: NeuronState.Locked,
      permissions: allPermissions,
      createdTimestampSeconds: 0n,
    }),
    createMockSnsNeuron({
      id: [3],
      stake: 3n,
      state: NeuronState.Locked,
      permissions: allPermissions,
      createdTimestampSeconds: 0n,
    }),
  ];
  const spyOnToastsUpdate = vi.spyOn(toastsStore, "toastsUpdate");
  const spyOnToastsShow = vi.spyOn(toastsStore, "toastsShow");
  const spyOnToastsError = vi.spyOn(toastsStore, "toastsError");
  const proposal: SnsProposalData = {
    ...mockSnsProposal,
    id: [{ id: 123n }],
    // map to the function id
    action: nervousSystemFunctionMock.id,
    // enable voting in ballots
    ballots: neurons.map((neuron) => [
      getSnsNeuronIdAsHexString(neuron),
      {
        vote: SnsVote.Unspecified,
        cast_timestamp_seconds: 456n,
        voting_power: 98441n,
      },
    ]),
  };
  const spyQuerySnsProposals = vi
    .spyOn(api, "queryProposals")
    .mockResolvedValue({
      proposals: [proposal],
      include_ballots_by_caller: [true],
    });
  const spyQuerySnsNeurons = vi
    .spyOn(api, "querySnsNeurons")
    .mockResolvedValue([...neurons]);
  const callRegisterVote = async ({
    vote,
    reloadProposalCallback,
  }: {
    vote: SnsVote;
    reloadProposalCallback: (proposal: SnsProposalData) => void;
  }) =>
    await registerSnsVotes({
      universeCanisterId: rootCanisterId,
      neurons,
      proposal,
      vote,
      updateProposalCallback: reloadProposalCallback,
    });

  beforeEach(() => {
    resetIdentity();
    vi.clearAllMocks();
    spyQuerySnsNeurons.mockClear();
    spyQuerySnsProposals.mockClear();

    snsFunctionsStore.setProjectsFunctions([
      {
        rootCanisterId,
        nsFunctions: [nervousSystemFunctionMock],
        certified: true,
      },
    ]);
    snsProposalsStore.setProposals({
      rootCanisterId,
      certified: true,
      completed: true,
      proposals: [proposal],
    });

    spyOnToastsUpdate.mockClear();
    spyOnToastsError.mockClear();
    spyOnToastsShow.mockClear();
  });

  describe("registerSnsVotes", () => {
    it("should make an sns registerVote api call per neuron", async () => {
      const spyRegisterVoteApi = vi
        .spyOn(snsGovernanceApi, "registerVote")
        .mockResolvedValue();
      await callRegisterVote({
        vote: SnsVote.Yes,
        reloadProposalCallback: vi.fn(),
      });

      const votableNeuronCount = neurons.length;
      expect(spyRegisterVoteApi).toBeCalledTimes(votableNeuronCount);

      for (const neuron of neurons) {
        expect(spyRegisterVoteApi).toBeCalledWith(
          expect.objectContaining({
            neuronId: fromDefinedNullable(neuron.id),
            rootCanisterId,
            proposalId: { id: 123n },
            vote: SnsVote.Yes,
          })
        );
      }
    });

    it("should call updateProposalContext after single neuron voting", async () => {
      const spyRegisterVoteApi = vi
        .spyOn(snsGovernanceApi, "registerVote")
        .mockResolvedValue();
      const spyReloadProposalCallback = vi.fn();

      callRegisterVote({
        vote: SnsVote.Yes,
        reloadProposalCallback: spyReloadProposalCallback,
      });

      expect(spyReloadProposalCallback).toBeCalledTimes(0);

      const votableNeuronCount = neurons.length;
      await waitFor(() =>
        expect(spyRegisterVoteApi).toBeCalledTimes(votableNeuronCount)
      );

      expect(spyReloadProposalCallback).toBeCalledTimes(votableNeuronCount);
    });

    it("should call updateProposalContext with optimistically updated proposal", async () => {
      const spyRegisterVoteApi = vi
        .spyOn(snsGovernanceApi, "registerVote")
        .mockResolvedValue();
      const spyReloadProposalCallback = vi.fn();

      await callRegisterVote({
        vote: SnsVote.Yes,
        reloadProposalCallback: spyReloadProposalCallback,
      });

      const votableNeuronCount = neurons.length;
      await waitFor(() =>
        expect(spyRegisterVoteApi).toBeCalledTimes(votableNeuronCount)
      );

      expect(spyReloadProposalCallback).toBeCalledWith(
        expect.objectContaining({
          ballots: neurons.map((neuron) => [
            getSnsNeuronIdAsHexString(neuron),
            expect.objectContaining({
              vote: SnsVote.Yes,
            }),
          ]),
        })
      );
    });

    it("should reset and reload actionable sns proposals after voting", async () => {
      vi.spyOn(snsGovernanceApi, "registerVote").mockResolvedValue();
      const rootCanisterId2 = principal(13);
      actionableSnsProposalsStore.set({
        rootCanisterId,
        proposals: [proposal],
        includeBallotsByCaller: true,
      });
      actionableSnsProposalsStore.set({
        rootCanisterId: rootCanisterId2,
        proposals: [proposal],
        includeBallotsByCaller: true,
      });

      expect(get(actionableSnsProposalsStore)).toEqual({
        [rootCanisterId.toText()]: {
          proposals: [proposal],
          includeBallotsByCaller: true,
        },
        [rootCanisterId2.toText()]: {
          proposals: [proposal],
          includeBallotsByCaller: true,
        },
      });
      expect(spyQuerySnsProposals).toBeCalledTimes(0);
      expect(spyQuerySnsNeurons).toBeCalledTimes(0);

      await callRegisterVote({
        vote: SnsVote.Yes,
        reloadProposalCallback: () => {
          // do nothing
        },
      });

      expect(spyQuerySnsProposals).toBeCalledTimes(1);
      expect(spyQuerySnsProposals).toBeCalledWith({
        certified: false,
        identity: mockIdentity,
        params: {
          beforeProposal: undefined,
          includeRewardStatus: [
            SnsProposalRewardStatus.PROPOSAL_REWARD_STATUS_ACCEPT_VOTES,
          ],
          limit: 20,
        },
        rootCanisterId,
      });
      expect(spyQuerySnsNeurons).toBeCalledTimes(0);

      expect(get(actionableSnsProposalsStore)).toEqual({
        [rootCanisterId2.toText()]: {
          proposals: [proposal],
          includeBallotsByCaller: true,
        },
      });

      // wait for actionable sns proposals loading
      await runResolvedPromises();

      expect(get(actionableSnsProposalsStore)).toEqual({
        [rootCanisterId.toText()]: {
          proposals: [proposal],
          includeBallotsByCaller: true,
        },
        [rootCanisterId2.toText()]: {
          proposals: [proposal],
          includeBallotsByCaller: true,
        },
      });
    });

    it("should display a correct error details", async () => {
      const spyRegisterVoteApi = vi
        .spyOn(snsGovernanceApi, "registerVote")
        .mockRejectedValue(new Error("test error"));
      const spyReloadProposalCallback = vi.fn();

      await callRegisterVote({
        vote: SnsVote.Yes,
        reloadProposalCallback: spyReloadProposalCallback,
      });

      const votableNeuronCount = neurons.length;
      await waitFor(() =>
        expect(spyRegisterVoteApi).toBeCalledTimes(votableNeuronCount)
      );

      expect(spyOnToastsShow).toBeCalledWith({
        detail: "01: test error, 02: test error, 03: test error",
        labelKey: "error.register_vote",
        level: "error",
        substitutions: {
          $proposalId: "123",
          $proposalType: "Governance",
        },
      });
    });
  });
});
