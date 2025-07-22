const helpers = require('../../../helpers/google');

module.exports = {
    title: 'Shielded VM Enabled',
    category: 'Compute',
    domain: 'Compute',
    severity: 'Medium',
    description: 'Ensures that instances are configured with the shielded VM enabled',
    more_info: 'Shielded VM option should be configured to defend against the security attacks on the instances.',
    link: 'https://cloud.google.com/security/shielded-cloud/shielded-vm',
    recommended_action: 'Enable the shielded VM for all the instances for security reasons.',
    apis: ['compute:list', 'projects:get'],
    realtime_triggers: ['compute.instances.insert', 'compute.instances.delete', 'compute.instances.updateShieldedInstanceConfig'],

    async run(collection, settings) {
        const results = [];
        const regions = helpers.regions();
        const projects = helpers.addSource(collection, ['projects', 'get', 'global']);

        if (projects.err || !projects.data || !projects.data.length) {
            helpers.addResult(results, 3,
                'Unable to query for projects: ' + helpers.addError(projects), 'global', null, null, (projects) ? projects.err : null);
            return results;
        }

        const project = projects.data[0].name;

        for (const region of regions.compute) {
            const zonesInRegion = regions.zones[region];
            if (!zonesInRegion || !zonesInRegion.length) continue;

            let anyInstancesFoundInRegion = false;

            for (const zone of zonesInRegion) {
                const instances = helpers.addSource(collection, ['compute', 'list', zone]);

                if (instances.err) {
                    helpers.addResult(results, 3, `Unable to query compute instances in zone ${zone}`, region, null, instances.err);
                    continue;
                }

                if (!instances.data || !instances.data.length) {
                    continue;
                }

                anyInstancesFoundInRegion = true;

                for (const instance of instances.data) {
                    let resource = helpers.createResourceName('instances', instance.name, project, 'zone', zone);

                    if (instance.shieldedInstanceConfig &&
                        instance.shieldedInstanceConfig.enableVtpm &&
                        instance.shieldedInstanceConfig.enableIntegrityMonitoring) {
                        helpers.addResult(results, 0,
                            'Shielded VM security is enabled for the the instance', region, resource);
                    } else {
                        helpers.addResult(results, 2,
                            'Shielded VM security is not enabled for the the instance', region, resource);
                    }
                }
            }

            // == PRINT ALL INSTANCES, EVEN IF NO INSTANCES ==
            // if (!anyInstancesFoundInRegion) {
            //     helpers.addResult(results, 0, `No instances found in any zones for region: ${region}`, region);
            // }
        }

        return results;
    }
};