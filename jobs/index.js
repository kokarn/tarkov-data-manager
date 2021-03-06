const schedule = require('node-schedule');

const runJob = function(name, cronSchedule) {
    const jobModule = require(`./${name}`);
    console.log(`Setting up ${name} job to run ${cronSchedule}`);

    schedule.scheduleJob(cronSchedule, () => {
        console.log(`Running ${name} job`);
        jobModule();
    });
}

module.exports = () => {
    // Only run in production
    if(process.env.NODE_ENV !== 'production'){
        return true;
    }

    runJob('check-scans', '20 * * * *');
    runJob('clear-checkouts', '5 4 */6 * *');
    runJob('update-barters', '5 14 * * *');
    runJob('update-cache', '* * * * *');
    runJob('update-crafts', '25 * * * *');
    //runJob('update-game-data', '45 3 * * *');
    runJob('update-quests', '45 * * * *');
    // runJob('update-trader-prices', '45 * * * *');
    // runJob('update-translations', '45 * * * *');
};
