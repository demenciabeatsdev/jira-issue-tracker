const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');
const path = require('path');

dotenv.config();

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

const jiraApi = axios.create({
    baseURL: process.env.JIRA_BASE_URL,
    auth: {
        username: process.env.JIRA_EMAIL,
        password: process.env.JIRA_API_TOKEN,
    },
});

app.get('/', (req, res) => {
    res.render('index', { issueDataList: [], error: null });
});

// Función para formatear las fechas a DD-MM-AAAA y manejar NULL
function formatDate(dateString) {
    if (!dateString) return 'Fecha NO ingresada en JIRA';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Los meses en JS son 0 indexados
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

app.post('/issue', async (req, res) => {
    const issueKeys = req.body.issueKey.split(',');

    const issueDataList = [];
    for (const issueKey of issueKeys) {
        try {
            const response = await jiraApi.get(`/rest/api/3/issue/${issueKey.trim()}`, {
                params: {
                    fields: 'summary,status,customfield_10032,created,duedate,reporter,labels,customfield_10237,customfield_10047,customfield_10226,customfield_10008,customfield_10054,customfield_10085,customfield_10055,customfield_10009,customfield_10089',
                },
            });

            const issueData = {
                key: response.data.key,
                summary: response.data.fields.summary,
                status: response.data.fields.status.name,
                storyPoints: response.data.fields.customfield_10032 || 'N/A',
                startDate: formatDate(response.data.fields.created),
                dueDate: formatDate(response.data.fields.duedate),
                reporter: response.data.fields.reporter.displayName,
                labels: response.data.fields.labels.join(', ') || 'No labels',
                estimatedDevEndDate: formatDate(response.data.fields.customfield_10237),
                backToFix: response.data.fields.customfield_10047 === 0.0 ? '0' : response.data.fields.customfield_10047 || 'N/A',
                analysisEndDate: formatDate(response.data.fields.customfield_10226),
                actualStart: formatDate(response.data.fields.customfield_10008),
                devEndDate: formatDate(response.data.fields.customfield_10054),
                lastDevEndDate: formatDate(response.data.fields.customfield_10085),
                qaStartDate: formatDate(response.data.fields.customfield_10055),
                actualEnd: formatDate(response.data.fields.customfield_10009),
                prodStartDate: formatDate(response.data.fields.customfield_10089),
            };

            issueDataList.push(issueData);
        } catch (error) {
            console.error(`Error fetching issue ${issueKey.trim()}: ${error.message}`);
            res.render('index', { issueDataList: [], error: 'One or more issues not found or API error' });
            return;
        }
    }

    res.render('index', { issueDataList, error: null });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
