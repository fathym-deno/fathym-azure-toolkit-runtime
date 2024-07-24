import { DefaultEaCConfig, defineEaCConfig, EaCRuntime } from '@fathym/eac/runtime';
import FathymAzureToolkitRuntimePlugin from '../src/plugins/FathymAzureToolkitRuntimePlugin.ts';

export const config = defineEaCConfig({
  Server: {
    port: 6151,
  },
  Plugins: [...(DefaultEaCConfig.Plugins || []), new FathymAzureToolkitRuntimePlugin()],
});

export function configure(_rt: EaCRuntime): Promise<void> {
  return Promise.resolve();
}
