const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const datasetHandlers = require('./handlers/datasetHandlers.js');
const GH_API_Handlers = require('./handlers/GH_API_Handlers.js');

const DS_RAW = 'raw_test.csv';
const DS_RESULT = 'res_test.csv';
// const DS_RAW = process.env.DS_RAW;
// const DS_RESULT = process.env.DS_RESULT;
const DATE_FROM = new Date(process.env.DATE_FROM);

const resultHeaders = [
    {id: 'type', title: 'type'},
    {id: 'author', title: 'author'},
    {id: 'repo', title: 'repo'},
    {id: 'PR', title: 'PR'},
    {id: 'comment', title: 'comment'},
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
                        results.push({type: data.type, author: author, repo: pr.repo, PR: pr.PR, comment: data.comment});
                        await csvWriter.writeRecords([{type: data.type, author: author, repo: pr.repo, PR: pr.PR, comment: data.comment}]);   
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


// const parse_shit = async (malware_csv, date_from) => {
//   ... The same as readMalwareList() function
// } 

readMalwareList(path.join('datasets',  DS_RAW), DATE_FROM);