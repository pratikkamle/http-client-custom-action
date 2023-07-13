const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');
const fs = require('fs');
const artifact = require('@actions/artifact');

// Function to fetch the overall workflow status using the GitHub API
async function getWorkflowStatus(runId) {
  const response = await axios.get(`https://api.github.com/repos/pratikkamle/http-client-custom-action/actions/runs/${runId}`, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json'
    }
  });

  return response.data.conclusion;
}

async function run() {
  try {
    // Get inputs using the GitHub Core library
    const Output = core.getInput('Output');
    const LeapDNABaseUrl = core.getInput('LeapDNABaseUrl');
    const clientId = core.getInput('ClientId');
    const clientSecret = core.getInput('ClientSecret');
    const tenantId = core.getInput('TenantId');
    const certificateBase64 = core.getInput('CertificateBase64');
    // const WorkflowStatus = core.getInput('WorkflowStatus');
    const method = "post";

    // const headers = core.getInput('headers');

    // Parse the headers input as JSON
    // const parsedHeaders = JSON.parse(headers);

    // Fetch values from environment variables if inputs are not provided
    const ClientId = clientId || process.env.CLIENT_ID;
    const ClientSecret = clientSecret || process.env.CLIENT_SECRET;
    const TenantId = tenantId || process.env.TENANT_ID;
    const CertificateBase64 = certificateBase64 || process.env.CERTIFICATE_BASE_64;
    console.log('ClientId:', ClientId);
    console.log('ClientSecret:', ClientSecret);
    console.log('TenantId:', TenantId);
    console.log('CertificateBase64:', CertificateBase64);
    // Get the current job status
    const jobStatus = process.env.GITHUB_JOB;

    // Get the current workflow run ID
    const runId = process.env.GITHUB_RUN_ID;

    // Fetch the overall workflow status using the GitHub API
    const workflowStatus = await getWorkflowStatus(runId);

    // Use the workflow status in your script logic
    console.log('Current Job Status:', jobStatus);
    console.log('Current Workflow Run ID:', runId);
    console.log('Current Workflow Status:', workflowStatus);

    const parsedHeaders = {
      "Content-Type": "application/json"
    };

    // Create the request body
    const parsedOutput = JSON.parse(Output);
    // const requestBody = {
    //   Output: Output
    // };

    // Set up the axios request configuration
    const axiosConfig = {
      method: method.toUpperCase(),
      url: LeapDNABaseUrl,
      headers: parsedHeaders,
      data: parsedOutput
    };

    // Send the HTTP request
    const response = await axios(axiosConfig);

    // Log the response
    console.log('Response:', response.data);
    
    // Set the output using GitHub library to be accessed by the workflows
    core.setOutput('response', response.data);
    core.setOutput('headers', response.headers);

    // Write the JSON output to a file
    const outputFile = 'output.json';
    fs.writeFileSync(outputFile, JSON.stringify(parsedOutput));

    // Publish the output file as an artifact
    const artifactClient = artifact.create();
    const artifactName = 'my-artifact';
    const files = [outputFile];
    const rootDirectory = '.';
    await artifactClient.uploadArtifact(artifactName, files, rootDirectory);
  } catch (error) {
    // Handle any errors that occur during the execution
    console.error('Error:', error.message);
    process.exit(1);
  }
}

try {
  const time = (new Date()).toTimeString();
  core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log(`The event payload: ${payload}`);
  // calling the function
  run();
} catch (error) {
  core.setFailed(error.message);
}
