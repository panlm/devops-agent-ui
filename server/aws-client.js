const { DevOpsAgentClient } = require('@aws-sdk/client-devops-agent');
const { fromIni } = require('@aws-sdk/credential-providers');

let cachedClient = null;

async function createAwsClient() {
  if (cachedClient) return cachedClient;

  const config = {
    region: process.env.DEVOPS_AGENT_REGION || 'us-east-1',
  };

  if (process.env.AWS_PROFILE) {
    config.credentials = fromIni({ profile: process.env.AWS_PROFILE });
  }

  cachedClient = new DevOpsAgentClient(config);
  return cachedClient;
}

module.exports = { createAwsClient };
