const helpers = require('../../../helpers/google');

module.exports = {
    title: 'Instance Automatic Restart Enabled',
    category: 'Compute',
    domain: 'Compute',
    severity: 'Medium',
    description: 'Ensure that Virtual Machine instances have automatic restart feature enabled.',
    more_info: 'Automatic Restart sets the virtual machine restart behavior when an instance is crashed or stopped by the system. If it is enabled, Google Cloud Compute Engine restarts the instance if it crashes or is stopped.',
    link: 'https://cloud.google.com/compute/docs/instances/setting-instance-scheduling-options#autorestart',
    recommended_action: 'Ensure automatic restart is enabled for all virtual machine instances.',
    apis: ['compute:list', 'projects:get'],
    remediation_min_version: '202202080432',
    remediation_description: 'Automatic Restart will be enabled for all virtual machine instances.',
    apis_remediate: ['compute:list', 'projects:get'],
    actions: {remediate:['compute.instances.setScheduling'], rollback:['compute.instances.setScheduling']},
    permissions: {remediate: ['compute.instances.setScheduling'], rollback: ['compute.instances.setScheduling']},

    /**
     * The refactored run function, now async.
     * @param {object} collection - The data collected from GCP.
     * @param {object} settings - General settings.
     * @returns {Promise<Array>} A promise that resolves to an array of result objects.
     */
    async run(collection, settings) {
        const results = [];

        //safely access collection
        const projects = helpers.addSource(collection, ['projects', 'get', 'global']);
        
        //early error check
        if (!projects || projects.err || !projects.data || !projects.data.length) {
            helpers.addResult(results, 3, 'Unable to query for projects: ' + helpers.addError(projects));
            return results; // Return early with error result
        }

        const project = projects.data[0].name;
        const regions = helpers.regions();

        //region
         for (const region of regions.compute) {
            const zonesInRegion = regions.zones[region];
            if (!zonesInRegion || !zonesInRegion.length) continue;

            let anyInstancesFoundInRegion = false;

            //zone
            for (const zone of zonesInRegion) {
                const instances = helpers.addSource(collection, ['compute','list', zone]);

                if (!instances) continue;

                if (instances.err) {
                    helpers.addResult(results, 3, 'Unable to query compute instances', region, null, null, instances.err);
                    continue;
                }

                if (!instances.data || !instances.data.length) {
                    continue; // No instances in this zone, just skip.
                }

                anyInstancesFoundInRegion = true;

                for (const instance of instances.data) {
                    if (!instance.name) continue;

                    let autoRestartEnabled = instance.scheduling && instance.scheduling.automaticRestart;

                    const resource = helpers.createResourceName('instances', instance.name, project, 'zone', zone);

                    // **** MIGHT CHANGE to only one if statement so that we only add to result IF IT IS A VULNERABILITY. ****
                    if (autoRestartEnabled) {
                        helpers.addResult(results, 0,
                            'Automatic Restart is enabled for the instance', region, resource);
                    } else {
                        helpers.addResult(results, 2,
                            'Automatic Restart is disabled for the instance', region, resource); //the vulnerability
                    }
                }
            }

            /* // removed empty space
            if (!anyInstancesFoundInRegion) {
                            helpers.addResult(results, 0, `No instances found in any zones for region: ${region}`, region);
                        }
            */
        }

        return results;
    },

    /**
     * The refactored remediation function, now async.
     * This function is called by the engine to fix a non-compliant resource.
     * @param {object} config - The cloud provider configuration.
     * @param {object} settings - General settings, including the remediation file for logging.
     * @param {string} resource - The full resource name of the instance to remediate.
     * @returns {Promise<object>} A promise that resolves to the remediation action object.
     * @throws {Error} If the remediation API call fails.
     */
    async remediate(config, settings, resource) {
        const remediation_file = settings.remediation_file;

        // inputs specific to the plugin
        const pluginName = 'automaticRestartEnabled';
        const baseUrl = 'https://compute.googleapis.com/compute/v1/{resource}/setScheduling';
        const method = 'POST';
        const putCall = this.actions.remediate;

        // create the params necessary for the remediation
        const body = {
            automaticRestart: true
        };
        // logging
        remediation_file['pre_remediate']['actions'][pluginName][resource] = {
            'automaticRestart': 'Disabled'
        };

        return new Promise((resolve, reject) => {
            helpers.remediatePlugin(config, method, body, baseUrl, resource, remediation_file, putCall, pluginName, function(err, action) {
                // Instead of calling an outer callback with an error, we REJECT the promise.
                if (err) {
                    return reject(err);
                }

                // The original success logic remains the same.
                if (action) action.action = putCall;

                remediation_file['post_remediate']['actions'][pluginName][resource] = action;
                remediation_file['remediate']['actions'][pluginName][resource] = {
                    'Action': 'Enabled'
                };

                // Instead of calling an outer callback with (null, result), we RESOLVE the promise.
                resolve(action);
            });
        });
    }
};