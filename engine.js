const collector = require('./collectors/google/collector.js');
const fs = require('fs');
const path = require('path');

/**
 * The main async engine for running scans.
 * @param {object} cloudConfig - The GCP credentials from the config file.
 * @param {object} settings - Command-line arguments and other settings.
 * @returns {Promise<object>} A promise that resolves to the JSON results.
 */
async function engine(cloudConfig, settings) {
    // Step 1: Load the plugins that need to be run.
    let pluginsToRun = {};
    const pluginIdentifier = settings.plugin;

    try {
        if (pluginIdentifier.includes('/')) {
            // Case 1: Load a single plugin (e.g., "compute/instanceLevelSSHOnly")
            const [category, pluginName] = pluginIdentifier.split('/');
            if (!category || !pluginName) {
                throw new Error('Invalid plugin format. Use "category/pluginName".');
            }
            const pluginPath = `./plugins/google/${category}/${pluginName}.js`;
            pluginsToRun[pluginIdentifier] = require(pluginPath);
            console.log(`INFO: Testing plugin: ${pluginsToRun[pluginIdentifier].title}`);
        } else {
            // Case 2: Load all plugins in a category (e.g., "compute")
            const category = pluginIdentifier;
            const pluginsDir = path.join(__dirname, 'plugins', 'google', category);
            
            // DEBUGGING: Print the exact path being used by the script.
            console.log(`DEBUG: Attempting to read directory: ${pluginsDir}`);
            
            console.log(`INFO: Loading all plugins from category: "${category}"...`);

            const files = fs.readdirSync(pluginsDir);
            for (const file of files) {
                // FIX: Ignore test files (.spec.js) to prevent require() errors.
                if (file.endsWith('.spec.js')) continue;
                console.log(file)
                if (file.endsWith('.js')) {
                    const pluginName = path.basename(file, '.js');
                    const pluginId = `${category}/${pluginName}`;
                    const pluginPath = path.join(pluginsDir, file);
                    const plugin = require(pluginPath);

                    pluginsToRun[pluginId] = plugin;
                    console.log(`  - Loaded: ${plugin.title}`);
                }
            }
            if (Object.keys(pluginsToRun).length === 0) {
                throw new Error(`No plugins found in category "${category}".`);
            }
        }
    } catch (e) {
        if (e.code === 'MODULE_NOT_FOUND' || e.code === 'ENOENT') {
            throw new Error(`Failed to load plugin(s) "${pluginIdentifier}". Please ensure the file or directory exists.`);
        }
        throw e; // Re-throw other errors
    }


    // Step 2: Determine the unique set of API calls required by all plugins.
    const apiCalls = new Set();
    Object.values(pluginsToRun).forEach(plugin => {
        plugin.apis.forEach(api => apiCalls.add(api));
    });

    if (apiCalls.size === 0) {
        console.log('INFO: No API calls to make for the selected plugin(s).');
        return {};
    }

    console.log(`INFO: Found ${apiCalls.size} unique API calls to make for plugins.`);

    // Step 3: Collect all data from GCP APIs.
    console.log('INFO: Collecting metadata from Google Cloud. This may take a moment...');
    const collection = await collector.collect(cloudConfig, { api_calls: [...apiCalls] });
    console.log('INFO: Metadata collection complete. Analyzing...');
    
    // Step 4: Execute the plugins against the collected data.
    const allResults = {};
    for (const [pluginId, plugin] of Object.entries(pluginsToRun)) {
        try {
            const results = await plugin.run(collection, settings);
            allResults[pluginId] = {
                title: plugin.title,
                description: plugin.description,
                severity: plugin.severity,
                category: plugin.category,
                results: results || []
            };
        } catch (err) {
            console.error(`ERROR: Plugin ${pluginId} failed during execution: ${err.message}`);
            allResults[pluginId] = { error: `Plugin failed: ${err.message}`, stack: err.stack };
        }
    }

    // Step 5: Return the final JSON result object.
    console.log('INFO: Analysis complete.');
    return allResults;
}

module.exports = engine;