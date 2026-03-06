const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('@expo/config-plugins');

const CONFIG_FILE = 'ProjectContext.config.json';

function withProjectContextConfigAsset(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const src = path.join(projectRoot, 'assets', CONFIG_FILE);
      const destDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets');
      const dest = path.join(destDir, CONFIG_FILE);
      if (!fs.existsSync(src)) {
        throw new Error(`Missing bundled config asset: ${src}`);
      }
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, dest);
      return config;
    },
  ]);
}

module.exports = withProjectContextConfigAsset;
