const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');
const fs = require('fs');
const artifact = require('@actions/artifact');

// Function to fetch the overall workflow status using the GitHub API
async function getWorkflowStatus(owner, repo, runId, PAT) {
  const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}`, {
    headers: {
      Authorization: `Bearer ${PAT}`,
      Accept: 'application/vnd.github.v3+json'
    }
  });

  return response.data.conclusion;
}

async function fetchRepositoryVariables(owner, repo, token, variableName) {
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/variables/${variableName}`;

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

async function fetchRepositorySecrets(owner, repo, token, secretName) {
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/secrets/${secretName}`;

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

async function getJobsAndSteps(owner, repo, runId, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/jobs`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    return response.data.jobs;
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
    // Get the workflow context
    const context = github.context;

    // Get the workflow run ID and owner/repo information
    const runId = context.runId;

    // Get repository owner and name from the environment variables GITHUB_REPOSITORY
    const [repoOwner, repoName] = process.env.GITHUB_REPOSITORY.split('/');

    console.log('Workflow Run ID:', runId);
    console.log('Repository Owner:', repoOwner);
    console.log('Repository Name:', repoName);

    // const Input1 = process.env.INPUT_Input1;
    // const Input2 = process.env.INPUT_Input2;
    const Input1 = core.getInput('Input1');
    const Input2 = core.getInput('Input2');
    console.log('Input1 from worklow:', Input1);
    console.log('Input2 from workflow:', Input2);

    // Fetch details of jobs and steps from the specific workflow run
    const jobs = await getJobsAndSteps(repoOwner, repoName, runId, PAToken);

    // Log details of jobs and their respective steps
    jobs.forEach((job) => {
      console.log('Job Name:', job.name);
      console.log('Job Status:', job.status);
      console.log('Job conclusion:', job.conclusion);

      job.steps.forEach((step) => {
        console.log('Step Name:', step.name);
        console.log('Step Status:', step.status);
        console.log('Step conclusion:', step.conclusion);
      });
    });

    // Fetch values from environment variables if inputs are not provided
    const ClientId = clientId || await fetchRepositoryVariables(repoOwner, repoName, PAToken, "CLIENT_ID"); //repoVariablesData.CLIENT_ID;
    const ClientSecret = clientSecret || await fetchRepositoryVariables(repoOwner, repoName, PAToken, "CLIENT_SECRET"); //repoVariablesData.CLIENT_SECRET;
    const TenantId = tenantId || await fetchRepositoryVariables(repoOwner, repoName, PAToken, "TENANT_ID"); //repoVariablesData.TENANT_ID;
    const CertificateBase64 = certificateBase64 || await fetchRepositoryVariables(repoOwner, repoName, PAToken, "CERTIFICATE_BASE_64"); //repoVariablesData.CERTIFICATE_BASE_64;
    console.log('ClientId:', ClientId);
    console.log('ClientSecret:', ClientSecret);
    console.log('TenantId:', TenantId);
    console.log('CertificateBase64:', CertificateBase64);
    // Get the current job status
    const jobStatus = process.env.GITHUB_JOB;
    console.log('Current Job Status:', jobStatus);

    // // Get the current workflow run ID
    // const runId = process.env.GITHUB_RUN_ID;
    // console.log('Current Workflow Run ID:', runId);

    // // Fetch the overall workflow status using the GitHub API
    // const workflowStatus = await getWorkflowStatus(repoOwner, repoName, runId, PAToken);

    // Use the workflow status in your script logic
    // console.log('Current Workflow Status:', workflowStatus);

    const parsedHeaders = {
      "Content-Type": "application/json"
    };

    // Create the request body
    const parsedOutput = jobs; // JSON.parse(jobs);
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
  // console.log(`The event payload: ${payload}`);

  // console.log(`The Repository: ${repository}`);
  // console.log(`The GitHub context: ${JSON.stringify(github, undefined, 2)}`);

  // calling the function
  run();
} catch (error) {
  core.setFailed(error.message);
}