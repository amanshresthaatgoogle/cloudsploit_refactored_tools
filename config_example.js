module.exports = {
    google: {
      // Paste the entire contents of your service account JSON key file here.
      // It should look something like this:
      /*
      "type": "service_account",
      "project_id": "your-gcp-project-id",
      "private_key_id": "...",
      "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
      "client_email": "...",
      "client_id": "...",
      "auth_uri": "...",
      "token_uri": "...",
      "auth_provider_x509_cert_url": "...",
      "client_x509_cert_url": "..."
      */
      // For simplicity, we'll just refer to project_id again.
      // The collector will use the project_id from the credential file.
      project: 'sprinternship-test-security'
    }
  };