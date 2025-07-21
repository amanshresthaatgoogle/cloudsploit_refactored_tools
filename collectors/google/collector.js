const { google } = require('googleapis');
const helpers = require('../../helpers/google');

/**
 * Authenticates with GCP and returns an authenticated client.
 * @param {object} config - GCP credentials object.
 * @returns {Promise<object>} A promise resolving to an authenticated Google Auth client.
 */
async function authenticate(config) {
    const auth = new google.auth.GoogleAuth({
        credentials: config,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    return await auth.getClient();
}

/**
 * Collects data from Google Cloud APIs based on the requirements of the plugins.
 * @param {object} cloudConfig - The GCP credentials.
 * @param {object} settings - Contains settings, including the list of `api_calls`.
 * @returns {Promise<object>} A promise that resolves with the `collection` object containing all API data.
 */
async function collect(cloudConfig, settings) {
    const collection = {};
    const authClient = await authenticate(cloudConfig);
    google.options({ auth: authClient }); // Set the global auth client for all googleapis calls

    const project = cloudConfig.project_id;
    if (!project) {
        throw new Error('Google Cloud project_id is missing in the credential configuration.');
    }

    // The plugin needs project info. We'll add it to the collection manually.
    // This mirrors the original structure of `projects:get`.
    if (settings.api_calls.includes('projects:get')) {
        collection.projects = {
            get: {
                global: {
                    data: [{ name: project, kind: 'compute#project' }]
                }
            }
        };
    }
    
    // Collect compute instances if required by a plugin.
    if (settings.api_calls.includes('compute:list')) {
        const compute = google.compute('v1');
        collection.compute = { list: {} };

        const regions = helpers.regions();
        const allZones = Object.values(regions.zones).flat();

        console.log(`INFO: Querying for compute instances across ${allZones.length} zones...`);
        
        // Fire off all API requests concurrently for maximum efficiency.
        const promises = allZones.map(zone => 
            compute.instances.list({ project, zone })
                .then(res => {
                    // The plugin expects the data to be keyed by zone.
                    collection.compute.list[zone] = { data: res.data.items || [] };
                })
                .catch(err => {
                    // Store errors so plugins can report on them.
                    collection.compute.list[zone] = { err: err, data: [] };
                    console.warn(`WARN: Unable to query compute instances in zone ${zone}: ${err.message}`);
                })
        );
        
        // Wait for all the API calls to complete.
        await Promise.all(promises);
    }

    return collection;
}

module.exports = { collect };