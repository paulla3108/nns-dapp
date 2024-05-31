import { SECONDS_IN_DAY } from "$lib/constants/constants";
import {
  compareByDissolveDelay,
  compareById,
  compareByStake,
  sortNeurons,
  tableNeuronsFromNeuronInfos,
} from "$lib/utils/neurons-table.utils";
import { mockNeuron, mockTableNeuron } from "$tests/mocks/neurons.mock";
import { NeuronState } from "@dfinity/nns";
import { ICPToken, TokenAmountV2 } from "@dfinity/utils";

describe("neurons-table.utils", () => {
  const makeStake = (amount: bigint) =>
    TokenAmountV2.fromUlps({
      amount,
      token: ICPToken,
    });

  describe("tableNeuronsFromNeuronInfos", () => {
    it("should convert neuronInfos to tableNeurons", () => {
      const neuronId1 = 42n;
      const neuronId2 = 342n;
      const stake1 = 500_000_000n;
      const stake2 = 600_000_000n;
      const dissolveDelay1 = 15778800n;
      const dissolveDelay2 = 252460800n;
      const neuronInfo1 = {
        ...mockNeuron,
        neuronId: neuronId1,
        fullNeuron: {
          ...mockNeuron.fullNeuron,
          cachedNeuronStake: stake1,
        },
        dissolveDelaySeconds: dissolveDelay1,
      };
      const neuronInfo2 = {
        ...mockNeuron,
        neuronId: neuronId2,
        fullNeuron: {
          ...mockNeuron.fullNeuron,
          cachedNeuronStake: stake2,
        },
        dissolveDelaySeconds: dissolveDelay2,
      };
      const neuronInfos = [neuronInfo1, neuronInfo2];
      const tableNeurons = tableNeuronsFromNeuronInfos(neuronInfos);
      expect(tableNeurons).toEqual([
        {
          rowHref: "/neuron/?u=qhbym-qaaaa-aaaaa-aaafq-cai&neuron=42",
          domKey: "42",
          neuronId: "42",
          stake: makeStake(500_000_000n),
          dissolveDelaySeconds: dissolveDelay1,
        },
        {
          rowHref: "/neuron/?u=qhbym-qaaaa-aaaaa-aaafq-cai&neuron=342",
          domKey: "342",
          neuronId: "342",
          stake: makeStake(600_000_000n),
          dissolveDelaySeconds: dissolveDelay2,
        },
      ]);
    });

    it("should convert neuronInfo for spawning neuron without href", () => {
      const neuronId = 52n;
      const dissolveDelaySeconds = BigInt(5 * SECONDS_IN_DAY);
      const spawningNeuronInfo = {
        ...mockNeuron,
        neuronId: neuronId,
        state: NeuronState.Spawning,
        fullNeuron: {
          ...mockNeuron.fullNeuron,
          cachedNeuronStake: 0n,
          spawnAtTimesSeconds: 12_312_313n,
        },
        dissolveDelaySeconds,
      };
      const neuronInfos = [spawningNeuronInfo];
      const tableNeurons = tableNeuronsFromNeuronInfos(neuronInfos);
      expect(tableNeurons).toEqual([
        {
          domKey: "52",
          neuronId: "52",
          stake: makeStake(0n),
          dissolveDelaySeconds,
        },
      ]);
    });
  });

  describe("sortNeurons", () => {
    const neurons = [
      {
        ...mockTableNeuron,
        neuronId: "9",
        stake: makeStake(100_000_000n),
        dissolveDelaySeconds: 8640000n,
      },
      {
        ...mockTableNeuron,
        neuronId: "88",
        stake: makeStake(300_000_000n),
        dissolveDelaySeconds: 864000n,
      },
      {
        ...mockTableNeuron,
        neuronId: "10",
        stake: makeStake(200_000_000n),
        dissolveDelaySeconds: 86400000n,
      },
      {
        ...mockTableNeuron,
        neuronId: "777",
        stake: makeStake(100_000_000n),
        dissolveDelaySeconds: 86400000n,
      },
      {
        ...mockTableNeuron,
        neuronId: "200",
        stake: makeStake(300_000_000n),
        dissolveDelaySeconds: 864000n,
      },
      {
        ...mockTableNeuron,
        neuronId: "11111",
        stake: makeStake(200_000_000n),
        dissolveDelaySeconds: 8640000n,
      },
      {
        ...mockTableNeuron,
        neuronId: "3000",
        stake: makeStake(200_000_000n),
        dissolveDelaySeconds: 8640000n,
      },
    ];

    it("should sort neurons by decreasing stake", () => {
      expect(
        sortNeurons({ neurons, order: [compareByStake] }).map((neuron) =>
          neuron.stake.toUlps()
        )
      ).toEqual([
        300_000_000n,
        300_000_000n,
        200_000_000n,
        200_000_000n,
        200_000_000n,
        100_000_000n,
        100_000_000n,
      ]);
    });

    it("should sort neurons by decreasing dissolve delay", () => {
      expect(
        sortNeurons({ neurons, order: [compareByDissolveDelay] }).map(
          (neuron) => neuron.dissolveDelaySeconds
        )
      ).toEqual([
        86400000n,
        86400000n,
        8640000n,
        8640000n,
        8640000n,
        864000n,
        864000n,
      ]);
    });

    it("should sort neurons by increasing neuron ID", () => {
      expect(
        sortNeurons({ neurons, order: [compareById] }).map(
          (neuron) => neuron.neuronId
        )
      ).toEqual(["9", "10", "88", "200", "777", "3000", "11111"]);
    });

    it("should sort neurons by stake, then dissolve delay, then ID", () => {
      expect(
        sortNeurons({
          neurons,
          order: [compareByStake, compareByDissolveDelay, compareById],
        }).map((neuron) => [
          neuron.stake.toUlps(),
          neuron.dissolveDelaySeconds,
          neuron.neuronId,
        ])
      ).toEqual([
        [300_000_000n, 864000n, "88"],
        [300_000_000n, 864000n, "200"],
        [200_000_000n, 86400000n, "10"],
        [200_000_000n, 8640000n, "3000"],
        [200_000_000n, 8640000n, "11111"],
        [100_000_000n, 86400000n, "777"],
        [100_000_000n, 8640000n, "9"],
      ]);
    });
  });
});
