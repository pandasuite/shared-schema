const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');

// Get the appropriate certs directory following pkg best practices
function getCertsDirectory() {
  // Check if running as pkg executable
  if (process.pkg) {
    // For pkg executables, use standard config directory
    const configDir =
      process.platform === 'win32'
        ? path.join(os.homedir(), 'AppData', 'Local', 'shared-schema')
        : path.join(os.homedir(), '.config', 'shared-schema');
    return path.join(configDir, 'certs');
  }
  // For Node.js development, use project directory
  return path.join(__dirname, '..', 'certs');
}

// Helper function to make HTTPS requests
function httpsRequest(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'shared-schema-cert-downloader',
      },
    };

    https
      .get(url, options, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          // Follow redirect
          httpsRequest(res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve(data);
        });
      })
      .on('error', reject);
  });
}

// Download certificates from GitHub releases
async function downloadCertificates(certsDir = null) {
  const targetDir = certsDir || getCertsDirectory();

  console.log('🔐 Downloading latest SSL certificates...');
  console.log(`📁 Using certificates directory: ${targetDir}`);

  // Create certs directory if it doesn't exist
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  } catch (error) {
    throw new Error(`Cannot create certificates directory: ${error.message}`);
  }

  try {
    // Fetch releases from GitHub API
    const releasesData = await httpsRequest(
      'https://api.github.com/repos/pandasuite/shared-schema/releases',
    );
    const releases = JSON.parse(releasesData);

    // Find the latest release with certificate files
    let privkeyUrl;
    let fullchainUrl;

    for (const release of releases) {
      if (release.assets) {
        const privkeyAsset = release.assets.find((asset) =>
          asset.name.includes('privkey.pem'),
        );
        const fullchainAsset = release.assets.find((asset) =>
          asset.name.includes('fullchain.pem'),
        );

        if (privkeyAsset && fullchainAsset) {
          privkeyUrl = privkeyAsset.browser_download_url;
          fullchainUrl = fullchainAsset.browser_download_url;
          break;
        }
      }
    }

    if (!privkeyUrl || !fullchainUrl) {
      throw new Error('Certificate files not found in any release');
    }

    console.log('📥 Downloading from GitHub Releases...');

    // Download privkey.pem
    const privkeyData = await httpsRequest(privkeyUrl);
    try {
      fs.writeFileSync(path.join(targetDir, 'privkey.pem'), privkeyData);
      console.log('✅ Downloaded privkey.pem');
    } catch (error) {
      throw new Error(`Cannot write privkey.pem: ${error.message}`);
    }

    // Download fullchain.pem
    const fullchainData = await httpsRequest(fullchainUrl);
    try {
      fs.writeFileSync(path.join(targetDir, 'fullchain.pem'), fullchainData);
      console.log('✅ Downloaded fullchain.pem');
    } catch (error) {
      throw new Error(`Cannot write fullchain.pem: ${error.message}`);
    }

    console.log('🎉 Certificates updated successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to download certificates:', error.message);
    return false;
  }
}

module.exports = {
  downloadCertificates,
  getCertsDirectory,
};
