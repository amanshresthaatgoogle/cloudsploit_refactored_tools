const helpers = require('../../../helpers/google');
//no reliance on callbacks
//replacing all the callback sections, make everything else the same


module.exports = {
    title: 'Instance Level SSH Only',
    category: 'Compute',
    domain: 'Compute',
    severity: 'Medium',
    description: 'Ensures that instances are not configured to allow project-wide SSH keys.',
    more_info: 'To support the principle of least privilege and prevent potential privilege escalation, it is recommended that instances do not have access to project-wide SSH keys through instance metadata. Instead, SSH keys should be managed at the instance level.',
    link: 'https://cloud.google.com/compute/docs/instances/adding-removing-ssh-keys',
    recommended_action: 'Ensure "Block project-wide SSH keys" is enabled for all instances.',
    apis: ['compute:list', 'projects:get'],

    /**
     * The refactored run function, now async.
     * @param {object} collection - The data collected from GCP.
     * @param {object} settings - General settings.
     * @returns {Promise<Array>} A promise that resolves to an array of result objects.
     */
    async run(collection, settings) {
        const results = [];

        // This helper simulates the original `addSource` by safely accessing the collection.
        const projects = helpers.addSource(collection, ['projects', 'get', 'global']);

        if (!projects || projects.err || !projects.data || !projects.data.length) {
            helpers.addResult(results, 3, 'Unable to query for projects: ' + helpers.addError(projects));
            return results; // Return early with error result
        }

        const project = projects.data[0].name;
        const regions = helpers.regions();

        // Iterate through each region and its zones. Standard loops replace `async.each`.
        for (const region of regions.compute) {
            const zonesInRegion = regions.zones[region];
            if (!zonesInRegion || !zonesInRegion.length) continue;

            let anyInstancesFoundInRegion = false;

            for (const zone of zonesInRegion) {
                const instances = helpers.addSource(collection, ['compute', 'list', zone]);

                if (!instances) continue;

                if (instances.err) {
                    helpers.addResult(results, 3, `Unable to query compute instances in zone ${zone}`, region, null, instances.err);
                    continue;
                }

                if (!instances.data || !instances.data.length) {
                    continue; // No instances in this zone, just skip.
                }

                anyInstancesFoundInRegion = true;

                for (const instance of instances.data) {
                    if (!instance.name) continue;

                    let blocksProjectKeys = false;
                    if (instance.metadata && instance.metadata.items) {
                        blocksProjectKeys = instance.metadata.items.some(
                            //checks metadata of the particylar instance and whether theer is a vulnerability of not
                            metaItem => metaItem.key === 'block-project-ssh-keys' &&
                                        String(metaItem.value).toUpperCase() === 'TRUE'
                        );
                        //^ adds it to the helper
                    }

                    const resource = helpers.createResourceName('instances', instance.name, project, 'zone', zone);
                    
                    if (blocksProjectKeys) {
                        helpers.addResult(results, 0, 'Instance is configured to block project-wide SSH keys.', region, resource);
                    } else {
                        helpers.addResult(results, 2, 'Instance is not configured to block project-wide SSH keys.', region, resource);
                    }
                }
            }

            if (!anyInstancesFoundInRegion) {
                helpers.addResult(results, 0, `No instances found in any zones for region: ${region}`, region);
            }
        }

        return results;
    }
};