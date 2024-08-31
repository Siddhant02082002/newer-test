import fs from 'fs';
import { Router } from 'express';
import axios from 'axios';
import path from 'path';
import unzipper from 'unzipper';
import 'dotenv/config';

const router = Router();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.OWNER;
const REPO = process.env.REPO;

async function getWorkflowRun(branch) {
    try {
        const response = await axios.get(
            `https://api.github.com/repos/${OWNER}/${REPO}/actions/runs`,
            {
                headers: {
                    Authorization: `token ${GITHUB_TOKEN}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            }
        );
        const runs = response.data.workflow_runs.filter(run => run.head_branch === branch);
        const latestRun = runs.find(run => run.status === 'completed');
        return latestRun;
    } catch (error) {
        console.error('Error fetching workflow run:', error.response ? error.response.data : error.message);
    }
}

async function downloadArtifacts(runId) {
    try {
        const response = await axios.get(
            `https://api.github.com/repos/${OWNER}/${REPO}/actions/runs/${runId}/artifacts`,
            {
                headers: {
                    Authorization: `token ${GITHUB_TOKEN}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            }
        );
        const artifacts = response.data.artifacts;
        for (const artifact of artifacts) {
            const downloadResponse = await axios.get(
                artifact.archive_download_url,
                {
                    headers: {
                        Authorization: `token ${GITHUB_TOKEN}`,
                        Accept: 'application/vnd.github.v3+json'
                    },
                    responseType: 'stream'
                }
            );
            const outputPath = path.join(__dirname, '..', "Result", `${artifact.name}.zip`);
            const writer = fs.createWriteStream(outputPath);
            downloadResponse.data.pipe(writer);

            writer.on('finish', async () => {
                console.log(`Downloaded ${artifact.name} to ${outputPath}`);
                // Extract the zip file into the extracted folder
                const extractPath = path.join(__dirname, '..', "extracted", artifact.name);
                await fs.promises.mkdir(extractPath, { recursive: true });
                fs.createReadStream(outputPath)
                    .pipe(unzipper.Extract({ path: extractPath }))
                    .on('close', () => {
                        console.log(`Extracted ${artifact.name} to ${extractPath}`);
                    });
            });
        }
    } catch (error) {
        console.error('Error downloading artifacts:', error.response ? error.response.data : error.message);
    }
}


router.post('/', async (req, res) => {
    try {
        // const { workflow_run } = req.body;

        // if (!workflow_run) {
        //     return res.status(400).json({ message: 'Invalid notification payload' });
        // }
        let run;
        run = await getWorkflowRun(branch);

        if (run.conclusion === 'success') {
            console.log('Workflow completed successfully. Downloading and extracting artifacts...');
            await downloadArtifacts(run.id);
            res.json({ message: 'Workflow completed successfully and artifacts downloaded.' });
        } else {
            res.json({ message: 'Workflow did not complete successfully.' });
        }
    } catch (error) {
        console.error('Error handling notification:', error.message);
        res.status(500).json({ message: 'Error processing notification', error: error.message });
    }
});

export default router;
