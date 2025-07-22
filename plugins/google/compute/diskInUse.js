const helpers = require('../../../helpers/google');

module.exports = {
    title: 'Disk In Use',
    category: 'Compute',
    domain: 'Compute',
    severity: 'Medium',
    description: 'Ensure that there are no unused Compute disks.',
    more_info: 'Unused Compute disks should be deleted to prevent accidental exposure of data and to avoid unnecessary billing.',
    link: 'https://cloud.google.com/compute/docs/disks',
    recommended_action: 'Delete unused Compute disks.',
    apis: ['disks:aggregatedList'],
    realtime_triggers: ['compute.disks.insert', 'compute.disks.delete'],

    async run(collection, settings) {
        const results = [];
        const regions = helpers.regions();

                // --- DEBUGGING START ---
                console.log('--- Disk In Use Plugin Debugging ---');
                console.log('Received collection object structure:');
                // Only log relevant parts if collection is very large, or filter sensitive info
                console.log('collection.projects?.get?.global:', JSON.stringify(collection.projects?.get?.global, null, 2));
                console.log('collection.disks?.aggregatedList?.global:', JSON.stringify(collection.disks?.aggregatedList?.global, null, 2));
                console.log('--- End Debugging ---');
                // --- DEBUGGING END ---
        
        


        const projects = collection.projects?.get?.global;

        if (!projects || projects.err || !projects.data?.length) {
            helpers.addResult(results, 3,
                'Unable to query for projects: ' + helpers.addError(projects), 'global', null, null, projects?.err);
            return results;
        }

        const project = projects.data[0].name;

        const disks = collection.disks?.aggregatedList?.global;

        if (!disks) {
            helpers.addResult(results, 3, 'Unable to query compute disks', 'global');
            return results;
        }

        if (disks.err || !disks.data) {
            helpers.addResult(results, 3, 'Unable to query compute disks', 'global', null, null, disks.err);
            return results;
        }

        const allDisksByScope = disks.data[0];

        if (!allDisksByScope || Object.keys(allDisksByScope).length === 0) {
            helpers.addResult(results, 0, 'No compute disks found', 'global');
            return results;
        }

        for (const region of regions.all_regions) {
            const zonesInRegion = regions.zones[region] || [];
            let anyDisksFoundInRegion = false;
            const collectedDisksForRegion = [];

            // Get regional disks
            const regionalDisksData = allDisksByScope[`regions/${region}`];
            if (regionalDisksData?.disks?.length) {
                anyDisksFoundInRegion = true;
                const regionalDisks = regionalDisksData.disks.map(disk => ({ ...disk, locationType: 'region', location: region }));
                collectedDisksForRegion.push(...regionalDisks);
            }

            // Get zonal disks
            for (const zone of zonesInRegion) {
                const zonalDisksData = allDisksByScope[`zones/${zone}`];
                if (zonalDisksData?.disks?.length) {
                    anyDisksFoundInRegion = true;
                    const zonalDisks = zonalDisksData.disks.map(disk => ({ ...disk, locationType: 'zone', location: zone }));
                    collectedDisksForRegion.push(...zonalDisks);
                }
            }

            if (!anyDisksFoundInRegion) {
                helpers.addResult(results, 0, `No compute disks found in region ${region}`, region);
                continue;
            }

            for (const disk of collectedDisksForRegion) {
                if (!disk.id || !disk.creationTimestamp) continue;

                const resource = helpers.createResourceName('disks', disk.name, project, disk.locationType, disk.location);

                if (disk.users && disk.users.length) {
                    helpers.addResult(results, 0, 'Disk is in use', region, resource);
                } else {
                    helpers.addResult(results, 2, 'Disk is not in use', region, resource);
                }
            }
        }

        return results;
    }
};