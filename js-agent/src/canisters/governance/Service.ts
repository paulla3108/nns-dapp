import BigNumber from "bignumber.js";
import { Option } from "../option";
import RawService from "./rawService";
import ServiceInterface, {
    ClaimNeuronRequest,
    ClaimNeuronResponse,
    ManageNeuron,
    ManageNeuronResponse,
    NeuronInfo,
    ProposalInfo
} from "./model";
import RequestConverters from "./RequestConverters";
import ResponseConverters from "./ResponseConverters";
import { bigIntToBigNumber, bigNumberToBigInt } from "../converters";

export default class Service implements ServiceInterface {
    private readonly service: RawService;
    private readonly requestConverters: RequestConverters;
    private readonly responseConverters: ResponseConverters;

    public constructor(service: RawService) {
        this.service = service;
        this.requestConverters = new RequestConverters();
        this.responseConverters = new ResponseConverters();
    }

    public claimNeuron = async (request: ClaimNeuronRequest) : Promise<ClaimNeuronResponse> => {
        const [principal, nonce, dissolveDelay] = this.requestConverters.fromClaimNeuronRequest(request);
        const rawResponse = await this.service.claim_neuron(principal, nonce, dissolveDelay);
        return this.responseConverters.toClaimNeuronResponse(rawResponse);        
    }

    public getNeurons = async () : Promise<Array<NeuronInfo>> => {
        const neuronIds = await this.service.get_neuron_ids();
        if (!neuronIds.length) {
            return [];
        }

        const promises: Promise<NeuronInfo>[] = neuronIds.map(async (id: BigNumber) : Promise<NeuronInfo> => {
            const neuronInfoPromise = this.service.get_neuron_info(id);
            const fullNeuronPromise = this.service.get_full_neuron(id);
            const rawResponses = await Promise.all([neuronInfoPromise, fullNeuronPromise]);
            const neuronInfoResponse = this.responseConverters.toNeuronInfoResponse(id, rawResponses[0], rawResponses[1]);
            if ("Ok" in neuronInfoResponse) {
                return neuronInfoResponse.Ok;
            }
            throw new Error("Failed to retrieve neuron info. NeuronId: " + bigNumberToBigInt(id));
        });

        return await Promise.all(promises);
    }

    public getFinalizedProposals = async () : Promise<Array<ProposalInfo>> => {
        const rawResponse = await this.service.get_finalized_proposals();
        return rawResponse.map(this.responseConverters.toProposalInfo);
    }

    public getPendingProposals = async () : Promise<Array<ProposalInfo>> => {
        const rawResponse = await this.service.get_pending_proposals();
        return rawResponse.map(this.responseConverters.toProposalInfo);
    }

    public getProposalInfo = async (proposalId: bigint) : Promise<Option<ProposalInfo>> => {
        const rawResponse = await this.service.get_proposal_info(bigIntToBigNumber(proposalId));
        return rawResponse.length ? this.responseConverters.toProposalInfo(rawResponse[0]) : null;
    }

    public manageNeuron = async (request: ManageNeuron) : Promise<ManageNeuronResponse> => {
        const rawRequest = this.requestConverters.fromManageNeuron(request);
        const rawResponse = await this.service.manage_neuron(rawRequest);
        return this.responseConverters.toManageNeuronResponse(rawResponse);
    }
}
