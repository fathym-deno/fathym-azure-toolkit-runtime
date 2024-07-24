import { EaCRuntimeConfig, EaCRuntimePlugin, EaCRuntimePluginConfig } from '@fathym/eac/runtime';
import { EaCESMDistributedFileSystem } from '@fathym/eac';
import { EaCDynamicToolDetails, EaCLinearCircuitDetails, EaCToolNeuron } from '@fathym/synaptic';
import { z } from 'npm:zod';

export default class FathymAzureToolkitSynapticPlugin implements EaCRuntimePlugin {
  constructor() {}

  public Setup(_config: EaCRuntimeConfig) {
    const pluginConfig: EaCRuntimePluginConfig = {
      Name: FathymAzureToolkitSynapticPlugin.name,
      Plugins: [],
      EaC: {
        DFS: {
          'fathym-synaptic-resolvers': {
            Type: 'ESM',
            Root: '@fathym/synaptic/',
            EntryPoints: ['resolvers.ts'],
            IncludeDependencies: false,
            WorkerPath: import.meta.resolve(
              '@fathym/eac/runtime/src/runtime/dfs/workers/EaCESMDistributedFileSystemWorker.ts',
            ),
          } as EaCESMDistributedFileSystem,
        },
        AIs: {
          core: {
            Tools: {
              simple: {
                Details: {
                  Type: 'Dynamic',
                  Name: 'simple',
                  Description: 'Use this tool as a simple example.',
                  Schema: z.object({ Value: z.string() }),
                  Action: ({ Value }: { Value: string }) => {
                    return Promise.resolve(`Tool Processed: ${Value}`);
                  },
                } as EaCDynamicToolDetails,
              },
            },
          },
        },
        Circuits: {
          $handlers: ['fathym-synaptic-resolvers'],
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
                  ToolLookup: 'core|simple',
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
      },
    };

    return Promise.resolve(pluginConfig);
  }
}
