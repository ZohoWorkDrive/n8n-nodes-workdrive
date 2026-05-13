// Self-hosted / enterprise n8n: use config without n8n Cloud import restrictions
// (e.g. local file path upload uses Node fs/path). For n8n Cloud publishing, switch to `config` and `n8n.strict: true`.
import { configWithoutCloudSupport } from '@n8n/node-cli/eslint';

export default configWithoutCloudSupport;
