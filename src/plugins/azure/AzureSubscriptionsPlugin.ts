import { EaCRuntimeConfig, EaCRuntimePlugin, EaCRuntimePluginConfig } from '@fathym/eac/runtime';
import {
  EaCDynamicToolDetails,
  EaCLinearCircuitDetails,
  EaCToolNeuron,
} from '@fathym/synaptic';
import { EverythingAsCodeSynaptic } from '@fathym/synaptic';
import { loadEaCAzureSvc, loadEaCSvc } from '@fathym/eac/api';
import z from 'npm:zod';
import { AzureInputSchema } from './AzureInputSchema.ts';

export const FathymAzureBillingAccountsInputSchema = AzureInputSchema.pick({
  AzureAccessTokenSecret: true,
  EnterpriseLookup: true,
  Username: true,
});

export type FathymAzureBillingAccountsInputSchema = z.infer<
  typeof FathymAzureBillingAccountsInputSchema
>;

export const FathymAzureSubscriptionsInputSchema = AzureInputSchema.pick({
  AzureAccessTokenSecret: true,
  EnterpriseLookup: true,
  Username: true,
});

export type FathymAzureSubscriptionsInputSchema = z.infer<
  typeof FathymAzureSubscriptionsInputSchema
>;

export const FathymAzureTenantsInputSchema = AzureInputSchema.pick({
  AzureAccessTokenSecret: true,
  EnterpriseLookup: true,
  Username: true,
});

export type FathymAzureTenantsInputSchema = z.infer<
  typeof FathymAzureTenantsInputSchema
>;

export default class AzureSubscriptionsPlugin implements EaCRuntimePlugin {
  constructor() {}

  public Setup(_config: EaCRuntimeConfig) {
    const pluginConfig: EaCRuntimePluginConfig = {
      Name: AzureSubscriptionsPlugin.name,
      Plugins: [],
      EaC: {
        AIs: {
          [AzureSubscriptionsPlugin.name]: {
            Tools: {
              'billing-accounts': {
                Details: {
                  Type: 'Dynamic',
                  Name: 'fathym-azure-billing-accounts',
                  Description:
                    "Use this tool to retrieve the user's current Azure billing accounts.",
                  Schema: FathymAzureBillingAccountsInputSchema,
                  Action: async (
                    input: FathymAzureBillingAccountsInputSchema,
                  ) => {
                    const parentEaCSvc = await loadEaCSvc();

                    const jwt = await parentEaCSvc.JWT(
                      input.EnterpriseLookup,
                      input.Username,
                    );

                    const eacAzureSvc = await loadEaCAzureSvc(jwt.Token);

                    try {
                      const billingAccounts = await eacAzureSvc.BillingAccounts(
                        input.EnterpriseLookup,
                        input.AzureAccessTokenSecret,
                      );

                      const billingAcctDetails = billingAccounts.reduce(
                        (acc, billingAccount) => {
                          const [id, displayName] = [
                            billingAccount.id!,
                            billingAccount.displayName,
                          ];

                          switch (billingAccount.agreementType!) {
                            case 'MicrosoftOnlineServicesProgram': {
                              acc[id] = `MOSP - ${displayName}`;
                              break;
                            }

                            case 'MicrosoftCustomerAgreement': {
                              const billingProfiles = billingAccount.billingProfiles?.value || [];

                              billingProfiles.forEach((billingProfile) => {
                                const invoiceSections = billingProfile.invoiceSections?.value || [];

                                invoiceSections.forEach((invoiceSection) => {
                                  acc[
                                    invoiceSection.id!
                                  ] =
                                    `MCA - ${displayName} - Profile - ${billingProfile.displayName} - Invoice - ${invoiceSection.displayName}`;
                                });
                              });
                              break;
                            }

                            case 'MicrosoftPartnerAgreement': {
                              // TODO(mcgear): Add support for Partner Agreement Flows
                              // https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/programmatically-create-subscription-microsoft-partner-agreement?tabs=rest#find-customers-that-have-azure-plans
                              // acc[id] = displayName;
                              break;
                            }

                            case 'EnterpriseAgreement': {
                              const enrollmentAccounts = billingAccount.enrollmentAccounts || [];

                              enrollmentAccounts.forEach((account) => {
                                acc[
                                  account.id!
                                ] = `EA - ${displayName} - Enrollment - ${account.accountName}`;
                              });
                              break;
                            }
                          }

                          return acc;
                        },
                        {} as Record<string, string>,
                      );

                      return JSON.stringify(billingAcctDetails);
                    } catch (ex) {
                      return JSON.stringify(ex);
                    }
                  },
                } as EaCDynamicToolDetails,
              },
              subscriptions: {
                Details: {
                  Type: 'Dynamic',
                  Name: 'fathym-azure-subscriptions',
                  Description: "Use this tool to retrieve the user's current Azure subscriptions.",
                  Schema: FathymAzureSubscriptionsInputSchema,
                  Action: async (
                    input: FathymAzureSubscriptionsInputSchema,
                  ) => {
                    const parentEaCSvc = await loadEaCSvc();

                    const jwt = await parentEaCSvc.JWT(
                      input.EnterpriseLookup,
                      input.Username,
                    );

                    const eacAzureSvc = await loadEaCAzureSvc(jwt.Token);

                    try {
                      const subs = await eacAzureSvc.Subscriptions(
                        input.EnterpriseLookup,
                        input.AzureAccessTokenSecret,
                      );

                      const subDetails = subs.reduce((acc, sub) => {
                        acc[sub.subscriptionId!] = sub.displayName!;

                        return acc;
                      }, {} as Record<string, string>);

                      return JSON.stringify(subDetails);
                    } catch (ex) {
                      return JSON.stringify(ex);
                    }
                  },
                } as EaCDynamicToolDetails,
              },
              tenants: {
                Details: {
                  Type: 'Dynamic',
                  Name: 'fathym-azure-tenants',
                  Description: "Use this tool to retrieve the user's current Azure tenants.",
                  Schema: FathymAzureTenantsInputSchema,
                  Action: async (input: FathymAzureTenantsInputSchema) => {
                    const parentEaCSvc = await loadEaCSvc();

                    const jwt = await parentEaCSvc.JWT(
                      input.EnterpriseLookup,
                      input.Username,
                    );

                    const eacAzureSvc = await loadEaCAzureSvc(jwt.Token);

                    try {
                      const tenants = await eacAzureSvc.Tenants(
                        input.EnterpriseLookup,
                        input.AzureAccessTokenSecret,
                      );

                      const tenantDetails = tenants.reduce((acc, tenant) => {
                        acc[tenant.tenantId!] = tenant.displayName!;

                        return acc;
                      }, {} as Record<string, string>);

                      return JSON.stringify(tenantDetails);
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
            [`${AzureSubscriptionsPlugin.name}|billing-accounts`]: {
              Type: 'Tool',
              ToolLookup: `${AzureSubscriptionsPlugin.name}|billing-accounts`,
            } as EaCToolNeuron,
            [`${AzureSubscriptionsPlugin.name}|subscriptions`]: {
              Type: 'Tool',
              ToolLookup: `${AzureSubscriptionsPlugin.name}|subscriptions`,
            } as EaCToolNeuron,
            [`${AzureSubscriptionsPlugin.name}|tenants`]: {
              Type: 'Tool',
              ToolLookup: `${AzureSubscriptionsPlugin.name}|tenants`,
            } as EaCToolNeuron,
          },
          [`${AzureSubscriptionsPlugin.name}|billing-accounts`]: {
            Details: {
              Type: 'Linear',
              Name: 'fathym-azure-billing-accounts',
              Description: "Use this tool to retrieve the user's current Azure billing accounts.",
              InputSchema: FathymAzureBillingAccountsInputSchema,
              Neurons: {
                '': `${AzureSubscriptionsPlugin.name}|billing-accounts`,
              },
            } as EaCLinearCircuitDetails,
          },
          [`${AzureSubscriptionsPlugin.name}|subscriptions`]: {
            Details: {
              Type: 'Linear',
              Name: 'fathym-azure-subscriptions',
              Description: "Use this tool to retrieve the user's current Azure subscriptions.",
              InputSchema: FathymAzureSubscriptionsInputSchema,
              Neurons: {
                '': `${AzureSubscriptionsPlugin.name}|subscriptions`,
              },
            } as EaCLinearCircuitDetails,
          },
          [`${AzureSubscriptionsPlugin.name}|tenants`]: {
            Details: {
              Type: 'Linear',
              Name: 'fathym-azure-tenants',
              Description: "Use this tool to retrieve the user's current Azure tenants.",
              InputSchema: FathymAzureTenantsInputSchema,
              Neurons: {
                '': `${AzureSubscriptionsPlugin.name}|tenants`,
              },
            } as EaCLinearCircuitDetails,
          },
        },
      } as EverythingAsCodeSynaptic,
    };

    return Promise.resolve(pluginConfig);
  }
}
