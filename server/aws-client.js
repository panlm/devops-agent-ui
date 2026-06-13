const { DevOpsAgentClient } = require('@aws-sdk/client-devops-agent');
const { fromIni, fromTemporaryCredentials } = require('@aws-sdk/credential-providers');

let cachedClient = null;

/**
 * 构建 AWS 凭证。
 *
 * 关键背景：DevOps Agent 的会话(chat)按「服务解析出的调用身份」隔离。
 * 标准 Web UI 的 "Operator access" 入口用的是专属服务角色
 * (DevOpsAgentRole-WebappAdmin-*),并在 assume 时打上 AgentSpaceId
 * 这个 session tag —— 该角色的权限策略 Resource 限定为
 * agentspace/${aws:PrincipalTag/AgentSpaceId}，没有这个 tag 会 AccessDenied。
 *
 * 若直接用个人 IAM profile(如 panlm)调用，会话会进入「另一个身份桶」，
 * 标准 Web UI 登录后看不到。为了让自建 UI 与标准 Web UI 共享同一批会话，
 * 这里默认 assume 同一个 operator 角色并带上 AgentSpaceId tag。
 *
 * 通过 .env 的 DEVOPS_OPERATOR_ROLE_ARN 控制：
 *   - 设置了 → assume 该角色(带 AgentSpaceId tag)，与标准 Web UI 同桶(推荐)
 *   - 未设置 → 退回直接使用 AWS_PROFILE / 默认凭证链(旧行为)
 */
function buildCredentials() {
  const operatorRoleArn = process.env.DEVOPS_OPERATOR_ROLE_ARN;
  const profile = process.env.AWS_PROFILE;
  const agentSpaceId = process.env.AGENT_SPACE_ID;

  // 主凭证：有 profile 用 profile，否则走默认凭证链(env / SSO / 实例角色等)
  const masterCredentials = profile ? fromIni({ profile }) : undefined;

  if (operatorRoleArn) {
    if (!agentSpaceId) {
      throw new Error(
        '配置了 DEVOPS_OPERATOR_ROLE_ARN 但缺少 AGENT_SPACE_ID，' +
          '无法为 operator 角色注入 AgentSpaceId session tag'
      );
    }
    return fromTemporaryCredentials({
      // masterCredentials 省略时，SDK 自动用默认凭证链
      ...(masterCredentials ? { masterCredentials } : {}),
      params: {
        RoleArn: operatorRoleArn,
        // ⭐ 关键：ListChats 按 role-session-name 过滤会话！
        // 标准 Web UI(Operator access)的 session name 形如 <operatorRolePrincipalId>-<原身份session>，
        // 例如 AROA<role-principal-id>-<your-login-session>。要看到与标准 Web UI 完全相同的会话列表，
        // 这里必须用同款 session name(经由 .env 的 DEVOPS_OPERATOR_SESSION_NAME 配置)。
        // 若用别的名字(如 devops-agent-ui)，只能看到该 name 自己创建的会话。
        RoleSessionName: process.env.DEVOPS_OPERATOR_SESSION_NAME || 'devops-agent-ui',
        // 标准 Web UI 同款 session tag，operator 权限策略要求(Resource 限定到此 space)
        Tags: [{ Key: 'AgentSpaceId', Value: agentSpaceId }],
        DurationSeconds: Number(process.env.DEVOPS_OPERATOR_SESSION_DURATION || 3600),
      },
      clientConfig: { region: process.env.DEVOPS_AGENT_REGION || 'us-east-1' },
    });
  }

  // 旧行为：直接使用 profile / 默认凭证链
  return masterCredentials;
}

async function createAwsClient() {
  if (cachedClient) return cachedClient;

  const config = {
    region: process.env.DEVOPS_AGENT_REGION || 'us-east-1',
  };

  const credentials = buildCredentials();
  if (credentials) {
    config.credentials = credentials;
  }

  cachedClient = new DevOpsAgentClient(config);
  return cachedClient;
}

module.exports = { createAwsClient };
