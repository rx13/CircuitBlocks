// ES module version for Node.js 22 compatibility
import { createHash } from 'crypto';

export default function createEnvironmentHash(env) {
  const hash = createHash('md5');
  hash.update(JSON.stringify(env));
  return hash.digest('hex');
}
