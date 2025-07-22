const helpers = require('../../../helpers/google');

// This local function makes the plugin self-contained.
const getRegionFromZone = (zone) => {
    if (!zone) return null;
    const parts = zone.split('-');
    if (parts.length < 2) return zone;
    return parts.slice(0, -1).join('-');
};

module.exports = {
    title: 'Disk In Use',
    category: 'compute', // Set to match the 'compute' folder
    domain: 'Compute',
    severity: 'Medium',
    description: 'Ensure that there are no unused Compute disks.',
    more_info: 'Unused Compute disks should be deleted to prevent accidental exposure of data and to avoid unnecessary billing.',
    link: 'https://cloud.google.com/compute/docs/disks',
    recommended_action: 'Delete unused Compute disks.',
    apis: ['disks:aggregatedList', 'projects:get'],
    realtime_triggers: ['compute.disks.insert', 'compute.disks.delete'],

    async run(collection, settings) {
        const results = [];
        const projects = collection.projects?.get?.global;

        if (!projects || projects.err || !projects.data?.length) {
            helpers.addResult(results, 3, 'Unable to query for projects: ' + helpers.addError(projects), 'global', null, projects?.err);
            return results;
        }

        const project = projects.data[0].name;
        const disksResponse = collection.disks?.aggregatedList?.global;

        if (!disksResponse || disksResponse.err || !disksResponse.data) {
            helpers.addResult(results, 3, 'Unable to query compute disks: ' + helpers.addError(disksResponse), 'global', null, disksResponse?.err);
            return results;
        }
        
        const allDisksByScope = disksResponse.data[0];

        if (!allDisksByScope || Object.keys(allDisksByScope).length === 0) {
            helpers.addResult(results, 0, 'No compute disks found', 'global');
            return results;
        }
        
        for (const scope of Object.keys(allDisksByScope)) {
            const diskData = allDisksByScope[scope];

            if (diskData.warning || !diskData.disks || !diskData.disks.length) {
                continue;
            }
            
            const [locationType, location] = scope.split('/');
            const region = locationType === 'regions' ? location : getRegionFromZone(location);

            for (const disk of diskData.disks) {
                if (!disk.id || !disk.creationTimestamp) continue;
                
                const resource = helpers.createResourceName('disks', disk.name, project, locationType.slice(0, -1), location);

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