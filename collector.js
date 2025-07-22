const { google } = require('googleapis');
const apiConfig = require('./api_config.js');
const helpers = require('../../helpers/google.js');

/**
 * The main collection function. It is a generic engine that processes
 * API calls based on the instructions in api_config.js.
 * @param {object} cloudConfig - GCP credentials, including project_id.
 * @param {object} settings - Contains the list of required `api_calls`.
 * @returns {Promise<object>} A promise that resolves to the collection object.
 */
async function collect(cloudConfig, settings) {
    const collection = {};

    // Authenticate with Google Cloud
    const auth = new google.auth.GoogleAuth({
        credentials: cloudConfig,
        scopes: ['https://www.googleapis.com/auth/cloud-platform.read-only']
    });
    const authClient = await auth.getClient();
    const regions = helpers.regions();

    const promises = settings.api_calls.map(callKey => {
        const config = apiConfig[callKey];
        if (!config) {
            console.warn(`WARN: No API config found for call: "${callKey}". Skipping.`);
            return Promise.resolve();
        }
        return executeApiCall(collection, callKey, config, cloudConfig, authClient, regions);
    });

    await Promise.all(promises);
    return collection;
}

/**
 * Executes a single API call based on its configuration.
 */
async function executeApiCall(collection, callKey, config, cloudConfig, authClient, regions) {
    const [serviceName, methodName] = callKey.split(':');

    if (!collection[serviceName]) collection[serviceName] = {};
    if (!collection[serviceName][methodName]) collection[serviceName][methodName] = {};

    try {
        const serviceClient = google[config.service]({ version: config.version, auth: authClient });
        const resource = serviceClient[config.resource];

        if (config.scope === 'global') {
            await callGlobal(collection, { ...arguments, resource });
        } else if (config.scope === 'regional') {
            await callRegional(collection, { ...arguments, resource, regions });
        } else if (config.scope === 'zonal') {
            await callZonal(collection, { ...arguments, resource, regions });
        }
    } catch (err) {
        console.error(`ERROR: Failed to initialize service for ${callKey}: ${err.message}`);
    }
}

function buildParams(configParams, cloudConfig, location) {
    const params = {};
    for (const [key, value] of Object.entries(configParams)) {
        params[key] = (value === 'project_id') ? cloudConfig.project_id : value;
    }
    if (location) {
        // Zonal and regional calls have 'zone' or 'region' properties
        if (configParams.zone) params.zone = location;
        if (configParams.region) params.region = location;
    }
    return params;
}

async function callGlobal(collection, args) {
    const { callKey, config, cloudConfig, resource } = args;
    const [serviceName, methodName] = callKey.split(':');
    const locationKey = config.key || 'global';
    
    try {
        const params = buildParams(config.params, cloudConfig);
        const response = await resource[config.method]({ ...params, requestBody: {} });
        collection[serviceName][methodName][locationKey] = { data: response.data };
    } catch (err) {
        collection[serviceName][methodName][locationKey] = { err: err };
    }
}

async function callZonal(collection, args) {
    const { callKey, config, cloudConfig, resource, regions } = args;
    const [serviceName, methodName] = callKey.split(':');
    const allZones = Object.values(regions.zones).flat();

    const zonePromises = allZones.map(async (zone) => {
        try {
            const params = buildParams(config.params, cloudConfig, zone);
            const response = await resource[config.method]({ ...params, zone: zone });
            const items = response.data.items || [];
            if (items.length) {
                collection[serviceName][methodName][zone] = { data: items };
            }
        } catch (err) {
            if (err.code !== 404) { // Ignore "not found" errors for zones
                if (!collection[serviceName][methodName][zone]) collection[serviceName][methodName][zone] = {};
                collection[serviceName][methodName][zone].err = err;
            }
        }
    });
    await Promise.all(zonePromises);
}

// Note: callRegional can be implemented here if needed, following the callZonal pattern.

module.exports = { collect };
