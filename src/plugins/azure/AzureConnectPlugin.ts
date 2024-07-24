import {
  EaCRuntimeConfig,
  EaCRuntimePlugin,
  EaCRuntimePluginConfig,
} from '@fathym/eac/runtime';
import {
  EaCChatPromptNeuron,
  EaCCircuitNeuron,
  EaCDynamicToolDetails,
  EaCGraphCircuitDetails,
  EaCLinearCircuitDetails,
  EaCLLMNeuron,
  EaCNeuron,
  EaCToolNeuron,
  InferSynapticState,
  lastAiNotHumanMessages,
  TypeToZod,
} from '@fathym/synaptic';
import { z } from 'npm:zod';
import {
  BaseMessage,
  FunctionMessage,
  HumanMessage,
} from 'npm:@langchain/core/messages';
import { EaCCloudAzureDetails, EverythingAsCodeClouds } from '@fathym/eac';
import { EaCStatus, loadEaCSvc } from '@fathym/eac/api';
import { EverythingAsCodeSynaptic } from '@fathym/synaptic';
import { BaseMessagePromptTemplateLike } from 'npm:@langchain/core/prompts';
import { MessagesPlaceholder } from 'npm:@langchain/core/prompts';
import { END, START } from 'npm:@langchain/langgraph';
import FathymAzureToolkitSynapticPlugin from '../FathymAzureToolkitSynapticPlugin.ts';

export const AzureConnectGraphState = {
  APIRoot: {
    value: (_x: string, y: string) => y,
    default: () => undefined,
  },
  AzureAccessTokenSecret: {
    value: (_x?: string, y?: string) => y,
    default: () => undefined,
  },
  BillingAccount: {
    value: (_x: string, y: string) => y,
    default: () => '',
  },
  CloudConnected: {
    value: (_x: boolean, y: boolean) => y,
    default: () => false,
  },
  Messages: {
    value: (x?: BaseMessage[], y?: BaseMessage[]) => x?.concat(y || []),
    default: () => [],
  },
  RedirectTo: {
    value: (_x: string, y: string) => y,
    default: () => '',
  },
  SubscriptionName: {
    value: (_x: string, y: string) => y,
    default: () => '',
  },
  SubscriptionID: {
    value: (_x: string, y: string) => y,
    default: () => '',
  },
  Verified: {
    value: (_x: boolean, y: boolean) => y,
    default: () => false,
  },
};

export type AzureConnectGraphState = InferSynapticState<
  typeof AzureConnectGraphState
>;

export const AzureConnectGraphStateSchema = z.object({
  APIRoot: z
    .string()
    .optional()
    .describe(
      `This is the root URL where API requests should be redirected to.`
    ),
  AzureAccessTokenSecret: z
    .string()
    .optional()
    .describe(
      `This is the user's access token for Azure, to be used for further calls into Azure.`
    ),
  BillingAccount: z
    .string()
    .optional()
    .describe(
      'This value should only be set when creating a new subscription, and should not be defined when using an existing `SubscriptionID`.'
    ),
  CloudConnected: z
    .boolean()
    .optional()
    .describe('Whether or not the system has a cloud connection.'),
  RedirectTo: z
    .string()
    .describe(
      'The root URL that the system will redirect requests to on success.'
    ),
  SubscriptionName: z
    .string()
    .optional()
    .describe(
      'This value should only be set when creating a new subscription, and should not be defined when using an existing `SubscriptionID`.'
    ),
  SubscriptionID: z
    .string()
    .optional()
    .describe(
      'This value should only be set when using an existing subscription, and should not be defined when creating with a new `SubscriptionName`.'
    ),
  Verified: z
    .boolean()
    .optional()
    .describe(
      'This value should be set to true, only once a user has explicitly confirmed their selections for (`SubscriptionName` and `BillingAccount`) or `SubscriptionID`.'
    ),
} as TypeToZod<Omit<AzureConnectGraphState, 'Messages'>>);

export const AzureConnectInputSchema = AzureConnectGraphStateSchema.pick({
  APIRoot: true,
  AzureAccessTokenSecret: true,
  RedirectTo: true,
}).extend({
  Input: z.string().optional().describe('The user input into the system.'),
});

export type AzureConnectInputSchema = z.infer<typeof AzureConnectInputSchema>;

export const AzureConnectToolSchema = AzureConnectGraphStateSchema.pick({
  BillingAccount: true,
  SubscriptionID: true,
  SubscriptionName: true,
  Verified: true,
});

export type AzureConnectToolSchema = z.infer<typeof AzureConnectToolSchema>;

export default class AzureConnectPlugin implements EaCRuntimePlugin {
  constructor() {}

  public Setup(_config: EaCRuntimeConfig) {
    const pluginConfig: EaCRuntimePluginConfig = {
      Name: AzureConnectPlugin.name,
      Plugins: [],
      EaC: {
        AIs: {
          [AzureConnectPlugin.name]: {
            Personalities: {
              [`...`]: {
                Details: {},
              },
            },
            Tools: {
              'cloud-azure-connect': {
                Details: {
                  Type: 'Dynamic',
                  Name: 'cloud-azure-connect',
                  Description:
                    "Use this tool to connect a user's Azure subscription when they confirm that they are ready to connect it.",
                  Schema: AzureConnectToolSchema,
                  Action: async (input: AzureConnectToolSchema, _, cfg) => {
                    if (!input.Verified) {
                      throw new Error('The tool is not verified');
                    }

                    const state = cfg!.configurable!.RuntimeContext.State;

                    const jwt = state.JWT as string;

                    const cloudLookup = crypto.randomUUID();

                    const commitEaC: EverythingAsCodeClouds = {
                      EnterpriseLookup: state.EnterpriseLookup,
                      Clouds: {
                        [cloudLookup]: {
                          // TODO(mcgear): Get stored Azure token
                          Token: state.GettingStarted.AzureAccessToken,
                          Details: {
                            Type: 'Azure',
                            Name: input.SubscriptionName,
                            SubscriptionID: input.SubscriptionID,
                            BillingScope: input.BillingAccount,
                          } as EaCCloudAzureDetails & { BillingScope: string },
                        },
                      },
                    };

                    try {
                      const eacSvc = await loadEaCSvc(jwt);

                      const commitResp = await eacSvc.Commit(commitEaC, 60);

                      const status = await eacSvc.Status(
                        commitResp.EnterpriseLookup,
                        commitResp.CommitID
                      );

                      return JSON.stringify(status);
                    } catch (ex) {
                      return JSON.stringify(ex);
                    }
                  },
                } as EaCDynamicToolDetails,
              },
            },
          },
        },
        Circuits: {
          $neurons: {
            [`${AzureConnectPlugin.name}|tools|cloud|azure-connect`]: {
              Type: 'Tool',
              ToolLookup: `${AzureConnectPlugin.name}|cloud-azure-connect`,
              BootstrapOutput(toolRes: string) {
                return { Status: JSON.parse(toolRes) };
              },
            } as EaCToolNeuron,
          },
          [`${AzureConnectPlugin.name}|cloud|azure-connect|subscriptions`]:
            this.buildCloudAzureConnectSubscriptionsCircuit(),
          [`cloud|azure-connect`]: this.buildCloudAzureConnectCircuit(),
        },
      } as EverythingAsCodeSynaptic,
    };

    return Promise.resolve(pluginConfig);
  }

  protected buildCloudAzureConnectCircuit() {
    return {
      Details: {
        Type: 'Graph',
        Priority: 100,
        InputSchema: AzureConnectInputSchema,
        State: AzureConnectGraphState,
        BootstrapInput(
          input: AzureConnectInputSchema
        ): Partial<AzureConnectGraphState> {
          return {
            APIRoot: input.APIRoot,
            AzureAccessTokenSecret: input.AzureAccessTokenSecret,
            RedirectTo: input.RedirectTo,
            Messages: input.Input ? [new HumanMessage(input.Input)] : [],
          };
        },
        Neurons: {
          'azure-login': {
            Type: 'ChatPrompt',
            PersonalityLookup: `${FathymAzureToolkitSynapticPlugin.name}|Thinky`,
            SystemMessage: `Right now, your only job is to get the user connected with Azure. You should be friendly, end inspire confidence in the user, so they click. We need to link the user to \`{APIRoot}/connect/azure/signin?success_url={RedirectTo}\`. It has to be that exact, absolute path, with no host/origin. Provide your response as Markdown, without any titles, just your responses as markdown. Markdwon example would be \`[...]('{APIRoot}/connect/azure/signin?success_url={RedirectTo}')\``,
            NewMessages: [
              new HumanMessage('Hi'),
            ] as BaseMessagePromptTemplateLike[],
            Neurons: {
              '': 'thinky-llm',
            },
            BootstrapOutput(msg: BaseMessage) {
              return {
                Messages: [msg],
              } as AzureConnectGraphState;
            },
          } as EaCChatPromptNeuron,
          'azure-sub': {
            Type: 'Circuit',
            CircuitLookup: `${AzureConnectPlugin.name}|cloud|azure-connect|subscriptions`,
            BootstrapOutput(state: AzureConnectGraphState) {
              return {
                ...state,
                Messages: state.Messages?.length
                  ? [state.Messages.slice(-1)[0]]
                  : [],
              } as AzureConnectGraphState;
            },
          } as EaCCircuitNeuron,
          'azure-sub-commit:message': {
            Type: 'ChatPrompt',
            PersonalityLookup: `${FathymAzureToolkitSynapticPlugin.name}|Thinky`,
            SystemMessage: `Let the user know that you are storing their azure connection information, and you'll be back with them shortly once complete.`,
            NewMessages: [
              new MessagesPlaceholder('Messages'),
            ] as BaseMessagePromptTemplateLike[],
            Neurons: {
              '': 'thinky-llm',
            },
            BootstrapOutput(msg: BaseMessage) {
              return {
                Messages: [msg],
              } as AzureConnectGraphState;
            },
          } as EaCChatPromptNeuron,
          'azure-sub-commit:tool': {
            Neurons: {
              '': `${AzureConnectPlugin.name}|tools|cloud|azure-connect`,
            },
            Synapses: {
              '': [ 
                'fathym:eac:wait-for-status',
                {
                  BootstrapInput({ Status }: { Status: EaCStatus }) {
                    return {
                      Status,
                      Operation: 'Connecting User to Azure',
                    };
                  },
                } as Partial<EaCNeuron>,
              ],
            },
            BootstrapInput(state: AzureConnectGraphState) {
              return {
                BillingAccount: state.BillingAccount ?? undefined,
                SubscriptionID: state.SubscriptionID ?? undefined,
                SubscriptionName: state.SubscriptionName ?? undefined,
                Verified: state.Verified || false,
              } as AzureConnectToolSchema;
            },
            BootstrapOutput({ Status }: { Status: EaCStatus }) {
              return {
                Messages: [
                  new FunctionMessage({
                    content: JSON.stringify(Status),
                    name: 'cloud-azure-connect',
                  }),
                ],
              };
            },
          } as Partial<EaCNeuron>,
          'azure-sub:complete': {
            Type: 'ChatPrompt',
            PersonalityLookup: `${FathymAzureToolkitSynapticPlugin.name}|Thinky`,
            SystemMessage: `Let the user know that you have completed storing their Azure connection information and that you are analyzing next steps, and will be back with them shortly.`,
            NewMessages: [
              new MessagesPlaceholder('Messages'),
            ] as BaseMessagePromptTemplateLike[],
            Neurons: {
              '': 'thinky-llm',
            },
            BootstrapOutput(msg: BaseMessage) {
              return {
                CloudConnected: true,
                Messages: [msg],
              } as AzureConnectGraphState;
            },
          } as EaCChatPromptNeuron,
        },
        Edges: {
          [START]: {
            Node: {
              login: 'azure-login',
              sub: 'azure-sub',
            },
            Condition: ({ AzureAccessTokenSecret }: AzureConnectGraphState) => {
              return AzureAccessTokenSecret ? 'sub' : 'login';
            },
          },
          'azure-login': END,
          'azure-sub': {
            Node: {
              message: 'azure-sub-commit:message',
              tool: 'azure-sub-commit:tool',
              [END]: END,
            },
            Condition: (state: AzureConnectGraphState) => {
              if (
                state.Verified &&
                (state.SubscriptionID ||
                  (state.SubscriptionName && state.BillingAccount))
              ) {
                return ['message', 'tool'];
              }
              return END;
            },
          },
          'azure-sub-commit:message': 'azure-sub:complete',
          'azure-sub-commit:tool': 'azure-sub:complete',
          'azure-sub:complete': END,
        },
        BootstrapOutput({ CloudConnected, Messages }: AzureConnectGraphState) {
          const lastAiMsgs = lastAiNotHumanMessages(Messages);

          return {
            HasConfiguredCloud: CloudConnected,
            Messages: lastAiMsgs,
          } as AzureConnectGraphStateSchema;
        },
      } as EaCGraphCircuitDetails,
    };
  }

  protected buildCloudAzureConnectSubscriptionsCircuit() {
    return {
      Details: {
        Type: 'Linear',
        Priority: 100,
        Neurons: {
          BillingAccounts: 'fathym:azure:billing-accounts',
          Subscriptions: 'fathym:azure:subscriptions',
          State: '$pass',
        },
        Synapses: {
          '': {
            Type: 'ChatPrompt',
            SystemMessage: `You are Thinky, the user's Fathym assistant. Let the user know that you are here to help them connect their Azure Subscription. They can select an existing subscription, or provide a name for a new subscription to continue. Once picking a new name, they will have to select a Billing Account. Favor showing the user the name of existing resources, and be short and concise in your responses. Start with subscription information, and only ask about/show billing account information if creating a new subscription. Do your best to talk the user through getting their subscription information, and make sure that you get the user to confirm their subscription information before calling the tool. Once the user has confirmed their subscription, you can call the tool.
  
Existing Subscriptions (JSON Format with key 'ID' and value 'Name'):
{Subscriptions}  

Existing Billing Accounts (JSON Format with key 'ID' and value 'Name'):
{BillingAccounts}        
`,
            NewMessages: [
              new MessagesPlaceholder('Messages'),
            ] as BaseMessagePromptTemplateLike[],
            Neurons: {
              '': [
                'thinky-llm',
                {
                  ToolsAsFunctions: true,
                  ToolLookups: [
                    'thinky|thinky-getting-started:cloud-azure-connect',
                  ],
                } as Partial<EaCLLMNeuron>,
              ],
            },
            BootstrapInput({
              Subscriptions,
              BillingAccounts,
              State,
            }: {
              Subscriptions: string;
              BillingAccounts: string;
              State: AzureConnectGraphState;
            }) {
              return {
                ...State,
                Subscriptions,
                BillingAccounts,
              };
            },
            BootstrapOutput(msg: BaseMessage) {
              if (msg.additional_kwargs.tool_calls?.length) {
                const tool = msg.additional_kwargs.tool_calls![0].function;

                const toolArgs = JSON.parse(
                  tool.arguments
                ) as AzureConnectToolSchema;

                return {
                  Messages: undefined,
                  BillingAccount: toolArgs.BillingAccount,
                  SubscriptionID: toolArgs.SubscriptionID,
                  SubscriptionName: toolArgs.SubscriptionName,
                  Verified: toolArgs.Verified,
                } as AzureConnectGraphState;
              } else if (msg.additional_kwargs.function_call) {
                const tool = msg.additional_kwargs.function_call;

                const toolArgs = JSON.parse(
                  tool.arguments
                ) as AzureConnectToolSchema;

                return {
                  Messages: undefined,
                  BillingAccount: toolArgs.BillingAccount,
                  SubscriptionID: toolArgs.SubscriptionID,
                  SubscriptionName: toolArgs.SubscriptionName,
                  Verified: toolArgs.Verified,
                } as AzureConnectGraphState;
              } else {
                return {
                  Messages: [msg],
                } as AzureConnectGraphState;
              }
            },
          } as EaCChatPromptNeuron,
        },
      } as EaCLinearCircuitDetails,
    };
  }
}
