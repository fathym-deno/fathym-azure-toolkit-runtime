import {
  buildEaCTestIoC,
  EaCRuntimePlugin,
  EverythingAsCode,
  EverythingAsCodeSynaptic,
} from './tests.deps.ts';
import FathymAzureToolkitRuntimePlugin from '../src/plugins/FathymAzureToolkitRuntimePlugin.ts';

export const AI_LOOKUP = 'core';

const testEaC = {} as EverythingAsCodeSynaptic;

export async function buildTestIoC(
  eac: EverythingAsCode,
  plugins: EaCRuntimePlugin[] = [new FathymAzureToolkitRuntimePlugin()],
  useDefault = true,
  useDefaultPlugins = false,
) {
  return await buildEaCTestIoC(
    useDefault ? testEaC : {},
    eac,
    plugins,
    useDefaultPlugins,
  );
}
