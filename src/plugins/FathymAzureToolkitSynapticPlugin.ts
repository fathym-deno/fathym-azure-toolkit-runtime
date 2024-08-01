import {
  EaCRuntimeConfig,
  EaCRuntimePlugin,
  EaCRuntimePluginConfig,
} from '@fathym/eac/runtime';
import {
  EaCAzureOpenAILLMDetails,
  EaCChatPromptNeuron,
  EaCCircuitNeuron,
  EaCLinearCircuitDetails,
  EaCLLMNeuron,
  EaCPassthroughNeuron,
  EverythingAsCodeSynaptic,
} from '@fathym/synaptic';
import AzureConnectPlugin from './azure/AzureConnectPlugin.ts';
import AzureSubscriptionsPlugin from './azure/AzureSubscriptionsPlugin.ts';
import { MessagesPlaceholder } from 'npm:@langchain/core/prompts';
import { HumanMessage } from 'npm:@langchain/core/messages';

export default class FathymAzureToolkitSynapticPlugin
  implements EaCRuntimePlugin
{
  constructor() {}

  public Setup(_config: EaCRuntimeConfig) {
    const pluginConfig: EaCRuntimePluginConfig = {
      Name: FathymAzureToolkitSynapticPlugin.name,
      Plugins: [new AzureSubscriptionsPlugin(), new AzureConnectPlugin()],
      EaC: {
        AIs: {
          [FathymAzureToolkitSynapticPlugin.name]: {
            LLMs: {
              'azure-openai': {
                Details: {
                  Type: 'AzureOpenAI',
                  Name: 'Azure OpenAI LLM',
                  Description: 'The LLM for interacting with Azure OpenAI.',
                  APIKey: Deno.env.get('AZURE_OPENAI_KEY')!,
                  Endpoint: Deno.env.get('AZURE_OPENAI_ENDPOINT')!,
                  DeploymentName: 'gpt-4o',
                  ModelName: 'gpt-4o',
                  Streaming: true,
                  Verbose: false,
                } as EaCAzureOpenAILLMDetails,
              },
            },
            Personalities: {
              [`Thinky`]: {
                Details: {
                  SystemMessages: [
                    `You are Thinky, the user's Fathym assistant. `,
                  ],
                },
              },
            },
          },
        },
        Circuits: {
          $remotes: {
            'thinky|eac|utils': 'http://localhost:6152/circuits/',
          },
          $neurons: {
            $pass: {
              Type: 'Passthrough',
            } as EaCPassthroughNeuron,
            [`${FathymAzureToolkitSynapticPlugin.name}|llm`]: {
              Type: 'LLM',
              LLMLookup: `${FathymAzureToolkitSynapticPlugin.name}|azure-openai`,
            } as EaCLLMNeuron,
            [`${FathymAzureToolkitSynapticPlugin.name}|wait-for-status`]: {
              Type: 'Circuit',
              CircuitLookup:
                'thinky|eac|utils|FathymEaCStatusPlugin|wait-for-status',
              BootstrapInput(s, _, cfg) {
                cfg!.configurable.RuntimeContext = JSON.stringify(
                  cfg!.configurable.RuntimeContext
                );

                return s;
              },
              BootstrapOutput(s, _, cfg) {
                cfg!.configurable.RuntimeContext = JSON.parse(
                  cfg!.configurable.RuntimeContext
                );

                return s;
              },
            } as EaCCircuitNeuron,
          },
          test: {
            Details: {
              Type: 'Linear',
              BootstrapInput({ Input }: { Input: string }) {
                return {
                  Messages: [new HumanMessage(Input)],
                };
              },
              Neurons: {
                '': {
                  Type: 'ChatPrompt',
                  SystemMessage: `You are a helpful pirate assistant`,
                  NewMessages: [new MessagesPlaceholder('Messages')],
                  Neurons: {
                    '': `${FathymAzureToolkitSynapticPlugin.name}|llm`,
                  },
                } as EaCChatPromptNeuron,
              },
            } as EaCLinearCircuitDetails,
          },
          'test-sub': {
            Details: {
              Type: 'Linear',
              Neurons: {
                '': {
                  Type: 'Circuit',
                  CircuitLookup: 'thinky|eac|utils|test',
                  BootstrapInput(s, _, cfg) {
                    cfg!.configurable.RuntimeContext = JSON.stringify(
                      cfg!.configurable.RuntimeContext
                    );

                    return s;
                  },
                } as EaCCircuitNeuron,
              },
            } as EaCLinearCircuitDetails,
          },
        },
      } as EverythingAsCodeSynaptic,
    };

    return Promise.resolve(pluginConfig);
  }
}
