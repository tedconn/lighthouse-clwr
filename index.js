const fs = require('fs');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const mkdirp = require('mkdirp');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const resultsDir = `results/${Date.now()}`;
const metrics = ['largest-contentful-paint', 'interactive', 'first-meaningful-paint'];
const iterationCount = 20;
const url = 'http://localhost:3000/record/Product__c/home';
const chromeFlags = ['--headless'];

const lhFlags = {
    output: 'json',
    emulatedFormFactor: 'none',
    disableStorageReset: true,
    throttlingMethod: 'provided',
};

const lhConfig = { extends: 'lighthouse:default', settings: { onlyCategories: ['performance'] } };

function file(isLockerEnabled, iteration, name) {
    return `${resultsDir}/${isLockerEnabled ? 'locker' : 'nolocker'}_${iteration}_${name}`;
}

function sumMeasure(lhReport, measure) {
    return lhReport.audits['user-timings'].details.items
        .filter((item) => item.name === measure)
        .filter((item) => item.timingType === 'Measure')
        .reduce((acc, value) => acc + value.duration, 0);
}

async function run(port, isLockerEnabled, records) {
    for (let i = 0; i <= iterationCount; i++) {
        const runnerResult = await lighthouse(
            `${url}?lwr.mode=dev&lwr.locale=en-US&lwr.locker=${isLockerEnabled}`,
            { ...lhFlags, port },
            lhConfig
        );

        const profileStr = JSON.stringify(runnerResult.artifacts.traces.defaultPass.traceEvents);
        fs.writeFileSync(file(isLockerEnabled, i, `profile.json`), profileStr);

        fs.writeFileSync(file(isLockerEnabled, i, `lhreport.json`), runnerResult.report);

        const lhReport = JSON.parse(runnerResult.report);

        const result = {
            isLockerEnabled,
            iteration: i,
            ...metrics.reduce((acc, metric) => {
                return {
                    ...acc,
                    [metric]: runnerResult.lhr.audits[metric].numericValue,
                };
            }, {}),
            'lwc-rehydrate': sumMeasure(lhReport, 'lwc-rehydrate'),
            evaluateInSandbox: sumMeasure(lhReport, 'locker'),
        };

        console.log(result);

        if (i > 0) {
            records.push(result);
        }
    }
}

(async () => {
    console.log('Starting...');
    mkdirp.sync(resultsDir);
    const records = [];

    const csvWriter = createCsvWriter({
        path: `${resultsDir}/results.csv`,
        header: [
            { id: 'isLockerEnabled', title: 'Is Locker Enabled' },
            { id: 'iteration', title: 'Iteration' },
            ...metrics.map((m) => ({ id: m, title: m })),
            { id: 'lwc-rehydrate', title: 'lwc-rehydrate' },
            { id: 'evaluateInSandbox', title: 'evaluateInSandbox' },
        ],
    });

    const chrome = await chromeLauncher.launch({ chromeFlags });

    try {
        await run(chrome.port, false, records);
        await run(chrome.port, true, records);
    } finally {
        await chrome.kill();
    }

    await csvWriter.writeRecords(records);
})();
