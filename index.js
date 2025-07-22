const { ArgumentParser } = require('argparse');
const engine = require('./engine');
const path = require('path');

console.log('CloudSploit Refactored for Google Cloud');

const parser = new ArgumentParser({
    description: 'CloudSploit Refactored for GCP'git 
});

parser.add_argument('--config', {
    help: 'Path to the config.js file containing GCP credentials. Defaults to ./config.js',
    default: path.join(__dirname, 'config.js')
});

parser.add_argument('--plugin', {
    help: 'The specific plugin(s) to run. Use "category/pluginName" for a single plugin (e.g., "compute/instanceLevelSSHOnly") or "category" to run all plugins in that category (e.g., "compute").',
    default: 'compute/shieldedVmEnabled'
});

async function main() {
    const args = parser.parse_args();
    let cloudConfig;

    try {
        console.log(`INFO: Using config file: ${args.config}`);
        const config = require(args.config);
        if (!config.google || !config.google.project_id) {
             throw new Error('GCP configuration or project_id not found in config file.');
        }
        cloudConfig = config.google;
    } catch (e) {
        console.error(`ERROR: Could not load config file at ${args.config}. Please create it from config_example.js.`);
        console.error(e.message);
        process.exit(1);
    }

    try {
        const results = await engine(cloudConfig, args);
        // Output the final results as a single JSON object.
        console.log(JSON.stringify(results, null, 2));
    } catch (e) {
        console.error(`FATAL: An unexpected error occurred: ${e.message}`);
        console.error(e.stack);
        process.exit(1);
    }
}

main();
