require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createAwsClient } = require('./aws-client');
const apiRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Inject AWS client into request
app.use(async (req, res, next) => {
  try {
    req.awsClient = await createAwsClient();
    req.agentSpaceId = process.env.AGENT_SPACE_ID;
    next();
  } catch (err) {
    res.status(500).json({
      error: 'AWS 凭证错误',
      message: '无法加载 AWS 凭证，请检查 ~/.aws/credentials 或环境变量配置',
      detail: err.message,
    });
  }
});

app.use('/api', apiRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);

  const statusMap = {
    AccessDeniedException: 403,
    ResourceNotFoundException: 404,
    ThrottlingException: 429,
    ValidationException: 400,
    ServiceQuotaExceededException: 429,
  };

  const messageMap = {
    AccessDeniedException: '访问被拒绝，请检查 AWS 权限配置',
    ResourceNotFoundException: '资源未找到',
    ThrottlingException: 'API 请求过于频繁，请稍后再试',
    ValidationException: '请求参数无效',
    ServiceQuotaExceededException: '已超出服务配额限制',
  };

  const errorName = err.name || err.__type || '';
  const status = statusMap[errorName] || 500;
  const message = messageMap[errorName] || '服务器内部错误，请稍后再试';

  res.status(status).json({
    error: message,
    detail: err.message,
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`DevOps Agent UI 后端已启动: http://127.0.0.1:${PORT}`);
  console.log(`Agent Space ID: ${process.env.AGENT_SPACE_ID}`);
  console.log(`AWS Profile: ${process.env.AWS_PROFILE || 'default'}`);
});
