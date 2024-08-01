import z from 'npm:zod';

export const AzureInputSchema = z.object({
  AzureAccessTokenSecret: z
    .string()
    .describe('The secret key of the Azure Access Token to use.'),
  EnterpriseLookup: z
    .string()
    .describe('The EnterpriseLookup to use for the request.'),
  Username: z.string().describe('The Username to use for the request.'),
});
