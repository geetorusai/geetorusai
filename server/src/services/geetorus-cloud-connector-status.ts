import {
  geetorusCloudConnectorEnrollmentStatus,
  type GeetorusCloudConnectorEnrollmentStatus,
} from "./geetorus-cloud-connector-enrollment.js";
import {
  createGeetorusCloudConnector,
  geetorusCloudConnectorConfigFromEnv,
} from "./geetorus-cloud-connector.js";

export async function reconcileGeetorusCloudConnectorEnrollmentStatus(
  env: NodeJS.ProcessEnv = process.env,
  request: typeof fetch = fetch,
): Promise<GeetorusCloudConnectorEnrollmentStatus> {
  const local = geetorusCloudConnectorEnrollmentStatus(env);
  if (!local.configured) return local;
  const config = geetorusCloudConnectorConfigFromEnv(env);
  if (!config) return { ...local, configured: false, status: "not_configured" };
  try {
    const status = await createGeetorusCloudConnector({ config, request }).getInstanceStatus();
    if (status === "active") return { ...local, configured: true, status: "active" };
    if (status === "suspended") return { ...local, configured: false, status: "suspended" };
    return { ...local, configured: false, status: "not_configured" };
  } catch {
    return { ...local, configured: false, status: "unverified" };
  }
}
