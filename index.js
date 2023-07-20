const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');
const fs = require('fs');
const artifact = require('@actions/artifact');

// Function to fetch the overall workflow status using the GitHub API
async function getWorkflowStatus(runId, PAT) {
  const response = await axios.get(`https://api.github.com/repos/pratikkamle/http-client-custom-action/actions/runs/${runId}`, {
    headers: {
      Authorization: `Bearer ${PAT}`,
      Accept: 'application/vnd.github.v3+json'
    }
  });

  return response.data.conclusion;
}

async function fetchRepositoryVariables(token, variableName) {
  const url = `https://api.github.com/repos/pratikkamle/http-client-custom-action/actions/variables/${variableName}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    return response.data.value;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

async function fetchRepositorySecrets(token, secretName) {
  const url = `https://api.github.com/repos/pratikkamle/http-client-custom-action/actions/secrets/${secretName}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    return response.data.value;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
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
    const PAToken = core.getInput('TOKEN_GITHUB');
    // const WorkflowStatus = core.getInput('WorkflowStatus');
    const method = "post";

    // const headers = core.getInput('headers');

    // Parse the headers input as JSON
    // const parsedHeaders = JSON.parse(headers);
    const clientIDRepoVariablesData = await fetchRepositoryVariables(PAToken, "CLIENT_ID");
    console.log('Repository Variables value for CLIENT_ID:', clientIDRepoVariablesData);
      // .then((repoVariablesData) => {
      //   console.log('Repository Variables:', repoVariablesData);
      // })
      // .catch((error) => {
      //   console.error('Error:', error.message);
      // });

    // Fetch values from environment variables if inputs are not provided
    const ClientId = clientId || await fetchRepositoryVariables(PAToken, "CLIENT_ID"); //repoVariablesData.CLIENT_ID;
    const ClientSecret = clientSecret || await fetchRepositoryVariables(PAToken, "CLIENT_SECRET"); //repoVariablesData.CLIENT_SECRET;
    const TenantId = tenantId || await fetchRepositoryVariables(PAToken, "TENANT_ID"); //repoVariablesData.TENANT_ID;
    const CertificateBase64 = certificateBase64 || await fetchRepositoryVariables(PAToken, "CERTIFICATE_BASE_64"); //repoVariablesData.CERTIFICATE_BASE_64;
    console.log('ClientId:', ClientId);
    console.log('ClientSecret:', ClientSecret);
    console.log('TenantId:', TenantId);
    console.log('CertificateBase64:', CertificateBase64);
    // Get the current job status
    const jobStatus = process.env.GITHUB_JOB;
    console.log('Current Job Status:', jobStatus);

    // Get the current workflow run ID
    const runId = process.env.GITHUB_RUN_ID;
    console.log('Current Workflow Run ID:', runId);

    // Fetch the overall workflow status using the GitHub API
    const workflowStatus = await getWorkflowStatus(runId, PAToken);

    // Use the workflow status in your script logic
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
  // const repository = github.repository
  console.log(`The event payload: ${payload}`);
  // console.log(`The Repository: ${repository}`);
  console.log(`The GitHub context: ${JSON.stringify(github, undefined, 2)}`);
  // Get the workflow context
  const context = github.context;

  // Get the workflow run ID and owner/repo information
  const runId = context.runId;
  // const repoOwner2 = context.repo.owner;
  const repoOwner = context.repository.owner.name;
  // const repoName2 = context.repo.repo;
  const repoName = context.repository.name;

  console.log('Workflow Run ID:', runId);
  console.log('Repository Owner:', repoOwner);
  // console.log('Repository Owner 2:', repoOwner2);
  console.log('Repository Name:', repoName);
  // console.log('Repository Name 2:', repoName2);

  // Access details about jobs and steps
  for (const job of context.payload.workflow.jobs) {
    console.log('Job Name:', job.name);
    console.log('Job Status:', job.status);

    for (const step of job.steps) {
      console.log('Step Name:', step.name);
      console.log('Step Status:', step.status);
    }
  }
  // calling the function
  run();
} catch (error) {
  core.setFailed(error.message);
}