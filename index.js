const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const datasetHandlers = require('./handlers/datasetHandlers.js');
const GH_API_Handlers = require('./handlers/GH_API_Handlers.js');

const DS_RAW = process.env.DS_RAW;
const DS_RESULT = process.env.DS_RESULT;
const DATE_FROM = new Date(process.env.DATE_FROM);

const resultHeaders = [
    {id: 'author', title: 'contributor'},
    {id: 'repo', title: 'repo_with_contributor_PR'},
    {id: 'PR', title: 'contributor_PR'},
    {id: 'type', title: 'reason_for_inclusion_of_the_contributor_in_the_list'},
    {id: 'comment', title: 'comment_to_the_reason'},
];


const readMalwareList = async (csv_path) => {
    let results = [];
    const authors = new Set();

    const readStream = fs.createReadStream(csv_path);
    const csvWriter = createCsvWriter({
        path: path.join('datasets', DS_RESULT),
        header: resultHeaders,
    });

    readStream
    .pipe(csv({headers: ['date', 'type', 'product', 'link', 'comment'], separator: ',', escape: '"'}))
    .on('data', async (data) => {
            if (datasetHandlers.isGitLink(data.link)) {
                const author = await datasetHandlers.getAuthor(data.link);
    
                const PRs = !authors.has(author) && await GH_API_Handlers.getPR(author, DATE_FROM);
                
                authors.add(author);
    
                if (PRs) {
                    for (let pr of PRs) {
                        // TODO: add results global 
                        results.push({author: author, repo: `https://github.com/${pr.repo}`, PR: pr.PR, type: data.type, comment: data.comment});
                        await csvWriter.writeRecords([{type: data.type, author: author, repo: `https://github.com/${pr.repo}`, PR: pr.PR, comment: data.comment}]);   
                    }
                }
            }    
    })
    .on('error', (error) => console.log('Read file error:', error.message))
    .on('end', async () => {    
        // FIXME: results is empty because of async operations with data
        process.stdout.write('\nEND OF WRITTING:\n' + results.toString() + '\n');
    })
    
}

readMalwareList(path.join('datasets',  DS_RAW), DATE_FROM);