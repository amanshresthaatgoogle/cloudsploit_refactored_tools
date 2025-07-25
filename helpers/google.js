module.exports = {
    /**
     * Safely retrieves data from the collection object.
     * This prevents errors from trying to access properties of undefined.
     * @param {object} collection - The main data object.
     * @param {Array<string>} path - An array of keys representing the path to the data.
     * @returns {object|undefined} The data object found at the path, or undefined.
     */
    addSource: (collection, path) => {
        let current = collection;
        for (let i = 0; i < path.length; i++) {
            if (current[path[i]] === undefined) {
                return undefined;
            }
            current = current[path[i]];
        }
        return current;
    },

    /**
     * Formats an error object into a string.
     * @param {object} obj - The object which might contain an error.
     * @returns {string} A string representation of the error.
     */
    addError: (obj) => {
        if (obj && obj.err) {
            if (typeof obj.err === 'object') {
                return JSON.stringify(obj.err);
            }
            return obj.err;
        }
        return 'Unknown error';
    },

    /**
     * Creates a standardized result object and adds it to the results array.
     * @param {Array} results - The array to add the result to.
     * @param {number} status - The status code (0=OK, 1=WARN, 2=FAIL, 3=UNKNOWN).
     * @param {string} message - The result message.
     * @param {string} region - The region of the resource.
     * @param {string} [resource] - (Optional) The full identifier of the resource.
     * @param {object} [error] - (Optional) The error object if status is 3.
     */
    addResult: (results, status, message, region, resource, error) => {
        const result = {
            status: status,
            message: message,
            region: region || 'global'
        };
        if (resource) result.resource = resource;
        if (error) result.error = error;
        results.push(result);
    },

    /**
     * Creates a fully-qualified GCP resource name.
     * @param {string} service - e.g., 'instances'
     * @param {string} name - e.g., 'my-vm'
     * @param {string} project - e.g., 'my-project'
     * @param {string} locationType - e.g., 'zone' or 'region'
     * @param {string} location - e.g., 'us-central1-a'
     * @returns {string} The formatted resource name.
     */
    createResourceName: (service, name, project, locationType, location) => {
        return `//compute.googleapis.com/projects/${project}/${locationType}/${location}/${service}/${name}`;
    },

    /**
     * Provides a static list of GCP regions and zones.
     * In a real-world scenario, you might want to fetch this dynamically.
     * @returns {object} An object containing lists of regions and zones.
     */
    regions: () => {
        return {
            "compute": ["asia-east1", "asia-east2", "asia-northeast1", "asia-northeast2", "asia-northeast3", "asia-south1", "asia-southeast1", "australia-southeast1", "europe-central2", "europe-north1", "europe-west1", "europe-west2", "europe-west3", "europe-west4", "europe-west6", "northamerica-northeast1", "southamerica-east1", "us-central1", "us-east1", "us-east4", "us-west1", "us-west2", "us-west3", "us-west4"],
            "zones": {
                "asia-east1": ["asia-east1-a", "asia-east1-b", "asia-east1-c"],
                "asia-east2": ["asia-east2-a", "asia-east2-b", "asia-east2-c"],
                "asia-northeast1": ["asia-northeast1-a", "asia-northeast1-b", "asia-northeast1-c"],
                "asia-northeast2": ["asia-northeast2-a", "asia-northeast2-b", "asia-northeast2-c"],
                "asia-northeast3": ["asia-northeast3-a", "asia-northeast3-b", "asia-northeast3-c"],
                "asia-south1": ["asia-south1-a", "asia-south1-b", "asia-south1-c"],
                "asia-southeast1": ["asia-southeast1-a", "asia-southeast1-b", "asia-southeast1-c"],
                "australia-southeast1": ["australia-southeast1-a", "australia-southeast1-b", "australia-southeast1-c"],
                "europe-central2": ["europe-central2-a", "europe-central2-b", "europe-central2-c"],
                "europe-north1": ["europe-north1-a", "europe-north1-b", "europe-north1-c"],
                "europe-west1": ["europe-west1-b", "europe-west1-c", "europe-west1-d"],
                "europe-west2": ["europe-west2-a", "europe-west2-b", "europe-west2-c"],
                "europe-west3": ["europe-west3-a", "europe-west3-b", "europe-west3-c"],
                "europe-west4": ["europe-west4-a", "europe-west4-b", "europe-west4-c"],
                "europe-west6": ["europe-west6-a", "europe-west6-b", "europe-west6-c"],
                "northamerica-northeast1": ["northamerica-northeast1-a", "northamerica-northeast1-b", "northamerica-northeast1-c"],
                "southamerica-east1": ["southamerica-east1-a", "southamerica-east1-b", "southamerica-east1-c"],
                "us-central1": ["us-central1-a", "us-central1-b", "us-central1-c", "us-central1-f"],
                "us-east1": ["us-east1-b", "us-east1-c", "us-east1-d"],
                "us-east4": ["us-east4-a", "us-east4-b", "us-east4-c"],
                "us-west1": ["us-west1-a", "us-west1-b", "us-west1-c"],
                "us-west2": ["us-west2-a", "us-west2-b", "us-west2-c"],
                "us-west3": ["us-west3-a", "us-west3-b", "us-west3-c"],
                "us-west4": ["us-west4-a", "us-west4-b", "us-west4-c"]
            }
        };
    }
};