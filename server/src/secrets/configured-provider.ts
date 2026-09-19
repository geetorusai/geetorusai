import { SECRET_PROVIDERS, type SecretProvider } from "@geetorusai/shared";

export function getConfiguredSecretProvider(): SecretProvider {
  const configuredProvider = process.env.GEETORUS_SECRETS_PROVIDER;
  return configuredProvider && SECRET_PROVIDERS.includes(configuredProvider as SecretProvider)
    ? configuredProvider as SecretProvider
    : "local_encrypted";
}
