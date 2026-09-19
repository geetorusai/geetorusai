/**
 * @deprecated Geetorus ID is identity-only. Import the Geetorus Cloud
 * connector names from `geetorus-cloud-connector.ts` for new code.
 *
 * These aliases keep source compatibility while deployments and persisted app
 * definitions move from the former Geetorus ID broker prototype.
 */
export {
  GMAIL_CONNECTOR_SCOPES,
  GMAIL_MCP_URL,
  GOOGLE_WORKSPACE_CONNECTOR_PROFILES,
  GeetorusCloudConnectorError as GeetorusIdConnectorError,
  createGeetorusCloudConnector as createGeetorusIdGmailConnector,
  geetorusCloudConnectorCapabilitiesFromEnv as geetorusIdGoogleConnectorCapabilitiesFromEnv,
  geetorusCloudConnectorConfigFromEnv as geetorusIdGmailConnectorConfigFromEnv,
} from "./geetorus-cloud-connector.js";

export type {
  GeetorusCloudConnector as GeetorusIdGmailConnector,
  GeetorusCloudConnector as GeetorusIdGoogleWorkspaceConnector,
  GeetorusCloudConnectorConfig as GeetorusIdGmailConnectorConfig,
  GeetorusCloudConnectorEnvironment as GeetorusIdConnectorEnvironment,
  GeetorusCloudConnectorOperation as GeetorusIdConnectorOperation,
  SealedGmailCredentials,
  SealedGoogleWorkspaceCredentials,
} from "./geetorus-cloud-connector.js";
