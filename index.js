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
};

const lhConfig = { extends: 'lighthouse:default', settings: { onlyCategories: ['performance'] } };

function file(isLockerEnabled, isThrottlingEnabled, iteration, name) {
    return `${resultsDir}/${isLockerEnabled ? 'locker' : 'nolocker'}_${
        isThrottlingEnabled ? 'throttling' : 'nothrottling'
    }_${iteration}_${name}`;
}

async function run(port, isThrottlingEnabled, isLockerEnabled, records) {
    for (let i = 0; i <= iterationCount; i++) {
        const runnerResult = await lighthouse(
            `${url}?lwr.mode=dev&lwr.locale=en-US&lwr.locker=${isLockerEnabled}`,
            { ...lhFlags, throttlingMethod: isThrottlingEnabled ? 'simulate' : 'provided', port },
            lhConfig
        );

        if (i > 0) {
            const profileStr = JSON.stringify(runnerResult.artifacts.traces.defaultPass.traceEvents);
            fs.writeFileSync(file(isLockerEnabled, isThrottlingEnabled, i, `profile.json`), profileStr);

            fs.writeFileSync(file(isLockerEnabled, isThrottlingEnabled, i, `lhreport.json`), runnerResult.report);

            const result = {
                iteration: i,
                isLockerEnabled,
                isThrottlingEnabled,
                ...metrics.reduce((acc, metric) => {
                    return {
                        ...acc,
                        [metric]: runnerResult.lhr.audits[metric].numericValue,
                    };
                }, {}),
            };

            console.log(result);
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
            { id: 'iteration', title: 'Iteration' },
            { id: 'isThrottlingEnabled', title: 'Is Throttling Enabled' },
            { id: 'isLockerEnabled', title: 'Is Locker Enabled' },
            ...metrics.map((m) => ({ id: m, title: m })),
        ],
    });

    const chrome = await chromeLauncher.launch({ chromeFlags });

    try {
        await run(chrome.port, false, false, records);
        await run(chrome.port, false, true, records);
        await run(chrome.port, true, false, records);
        await run(chrome.port, true, true, records);
    } finally {
        await chrome.kill();
    }

    await csvWriter.writeRecords(records);
})();
