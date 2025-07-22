const helpers = require('../../../helpers/google');

console.log("Enable Usage Export.")

module.exports = {
    //metadata which tells the main engine the contents of the plugin 
    title: 'Enable Usage Export',
    category: 'Compute',
    domain: 'Compute',
    severity: 'Medium',
    description: 'Ensure that setting is configured to export Compute instances usage to Cloud Storage bucket.',
    link: 'https://cloud.google.com/compute/docs/logging/usage-export',
    more_info: 'Compute Engine lets you export detailed reports that provide information about the lifetime and usage of your Compute Engine resources to a Google Cloud Storage bucket using the usage export feature.',
    recommended_action: 'Ensure that Enable Usage Export setting is configured for your GCP project.',
    apis: ['projects:get'],
    realtime_triggers: ['compute.projects.insert', 'compute.projects.delete'],

    async run(collection, settings) {
        const results = [];

        const projects = collection.projects && collection.projects.get && collection.projects.get['global'] ?
            collection.projects.get['global'] : {};

        if (!projects.data || projects.err || !projects.data.length) {
            helpers.addResult(results, 3,
                'Unable to query for projects: ' + helpers.addError(projects), 
                'global', null, null, (projects) ? projects.err : null);
            return results;
        }

        const project = projects.data[0];

        let resource = helpers.createResourceName('projects', project.name);

        if (project.usageExportLocation && project.usageExportLocation.bucketName) {
            helpers.addResult(results, 0, 'Enable Usage Export is configured for project', 'global', resource);
        } else {
            helpers.addResult(results, 2, 'Enable Usage Export is not configured for project', 'global', resource);
        }

        return results;
    }
};

//Code is designed to check for a configuration weakness within code
//checks to make sure detailed Compute Engine usage logs are being kept into a storage bucket 
//allows you to keep a detailed cost oversight on what usages are being run and which are the most costly + risks of financial abuse
//kept a record of the resources that were created, run, or destroyed allows you to trace your steps
    //^ especially important if there were to be a security breach, through the logs can understand the data being accessed