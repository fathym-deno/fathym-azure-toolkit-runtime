import {
  EaCRuntimeConfig,
  EaCRuntimePlugin,
  EaCRuntimePluginConfig,
} from '@fathym/eac/runtime';
import {
  EaCLinearCircuitDetails,
  EaCToolNeuron,
  EverythingAsCodeSynaptic,
} from '@fathym/synaptic';
import { z } from 'npm:zod';
import AzureConnectPlugin from './azure/AzureConnectPlugin.ts';

export default class FathymAzureToolkitSynapticPlugin
  implements EaCRuntimePlugin
{
  constructor() {}

  public Setup(_config: EaCRuntimeConfig) {
    const pluginConfig: EaCRuntimePluginConfig = {
      Name: FathymAzureToolkitSynapticPlugin.name,
      Plugins: [new AzureConnectPlugin()],
      EaC: {
        AIs: {
          [FathymAzureToolkitSynapticPlugin.name]: {
            Personalities: {
              [`Thinky`]: {
                Details: {
                  SystemMessages: [
                    `You are Thinky, the user's Fathym assistant. `
                  ],
                },
              },
            },
          },
        },
        Circuits: {
          'simple-tool': {
            Details: {
              Type: 'Linear',
              Name: 'Core Test Circuit',
              Description: 'A simple test circuit',
              InputSchema: z.object({
                Input: z
                  .string()
                  .describe('The input value from a user, for the circuit.'),
              }),
              Neurons: {
                '': {
                  Type: 'Tool',
                  ToolLookup: `${FathymAzureToolkitSynapticPlugin.name}|simple`,
                  BootstrapInput: ({ Input }: { Input: string }) => {
                    return { Value: Input };
                  },
                  BootstrapOutput: (output: string) => {
                    return { Result: output };
                  },
                } as EaCToolNeuron,
              },
            } as EaCLinearCircuitDetails,
          },
        },
      } as EverythingAsCodeSynaptic,
    };

    return Promise.resolve(pluginConfig);
  }
}
