import {
  assert,
  assertStringIncludes,
  buildTestIoC,
  EverythingAsCodeSynaptic,
  Runnable,
} from '../tests.deps.ts';
import FathymAzureToolkitRuntimePlugin from '../../src/plugins/FathymAzureToolkitRuntimePlugin.ts';

Deno.test('Simple Tool Tests', async (t) => {
  const eac = {} as EverythingAsCodeSynaptic;

  const { ioc } = await buildTestIoC(eac, [new FathymAzureToolkitRuntimePlugin()]);

  await t.step('Invoke', async () => {
    const circuit = await ioc.Resolve<Runnable>(
      ioc.Symbol('Circuit'),
      'simple-tool',
    );

    const response = await circuit.invoke({
      Input: 'What is the weather in Erie, CO?',
    });

    assert(response?.Result);
    assertStringIncludes(response.Result, 'Tool Processed: ');
    assert(response.Result.startsWith('Tool Processed: '));

    console.log(response.Result);
  });
});
