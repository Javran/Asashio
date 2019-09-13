exports.client = undefined;
exports.init = (client) => {
    this.client = client;

    this.sheduleNextMessages();
}

exports.sheduleNextMessages = () => {
    const nextTimeStamps = this.nextResetsTimestamp(Date.now() + 5000);
    const nextTimeStampsFull = this.nextResetsTimestamp(Date.now() + 5000, true);
    const nextTimeStamp = Math.min(...Object.values(nextTimeStamps));

    /*console.log(`Next timestamps:
${Object.entries(nextTimeStamps).map(entry => `${entry[0]} @ ${new Date(entry[1]).toISOString()}`).join("\n")}`)*/

    const type = Object.keys(nextTimeStamps).find(key => nextTimeStamps[key] == nextTimeStamp);

    console.log(`Next time: ${type} @ ${new Date(nextTimeStamp).toISOString()}`);

    let message = "?";
    if(type == "quest") {
        message = "Daily"
        if(nextTimeStamp == nextTimeStampsFull.weeklyQuest)
            message += "/Weekly"
        if(nextTimeStamp == nextTimeStampsFull.monthlyQuest)
            message += "/Monthly"
        if(nextTimeStamp == nextTimeStampsFull.quarterlyQuest)
            message += "/Quarterly"
        message += " quest reset"
    } else if (type == "pvp")
        message = "PvP reset"
    else if (type == "rank")
        message = "Ranking cutoff"
    else if (type == "monthlyExped")
        message = "Monthly expeditions reset"

    // console.log(nextTimeStamp - Date.now() - 30 * 60000)
    if(type !== "monthlyExped") {
        for (let k of [60, 30, 15, 5]) {
            let diff = nextTimeStamp - Date.now() - k * 60000;
            if (diff > 0)
                setTimeout(() => this.update(`${message} in ${k} minutes.`), diff);
        }
    }
    
    setTimeout(() => {
        this.update(`${message}.`);
        this.sheduleNextMessages();
    }, nextTimeStamp - Date.now());
}

Date.prototype.shiftDate = function(time) {
    this.setUTCDate(this.getUTCDate() + time)
}
Date.prototype.shiftMonth = function(time) {
    this.setUTCMonth(this.getUTCMonth() + time)
}
Date.prototype.shiftHour = function(time) {
    this.setUTCHours(this.getUTCHours() + time)
}

// https://github.com/KC3Kai/KC3Kai/blob/master/src/library/managers/CalculatorManager.js#L443 
exports.nextResetsTimestamp = (now = Date.now(), extraQuest = false) => {
    const timeStamps = {};

    // Next Quest reset time (UTC 2000 / JST 0500)
    const utc8pm = new Date(now),
        utc6am = new Date(now), utc6pm = new Date(now);
    utc8pm.setUTCHours(20, 0, 0, 0);
    if(utc8pm.getTime() < now) utc8pm.shiftDate(1);
    timeStamps.quest = utc8pm.getTime();

    if(extraQuest) {
        // Weekly
        const weeklyReset = new Date(utc8pm);
        while(weeklyReset.getUTCDay() !== 0)
            weeklyReset.shiftDate(1);
        timeStamps.weeklyQuest = weeklyReset.getTime()
        
        // Monthly
        const monthlyReset = new Date(utc8pm);
        while(monthlyReset.getUTCDate() !== 1)
            monthlyReset.shiftDate(1);
        monthlyReset.shiftDate(-1);
        timeStamps.monthlyQuest = monthlyReset.getTime()

        // Quarterly
        const quarterlyReset = new Date(monthlyReset);
        quarterlyReset.shiftDate(1);
        while(quarterlyReset.getUTCMonth() % 3 !== 2)
            quarterlyReset.shiftDate(1);
        quarterlyReset.shiftDate(-1);
        timeStamps.quarterlyQuest = quarterlyReset.getTime()
    }
    
    // Next PvP reset time (UTC 1800,0600 / JST 0300,1500)
    utc6am.setUTCHours(6, 0, 0, 0);
    utc6pm.setUTCHours(18, 0, 0, 0);
    if(utc6am.getTime() < now) utc6am.shiftDate(1);
    if(utc6pm.getTime() < now) utc6pm.shiftDate(1);
    const nextPvPstamp = Math.min(utc6am.getTime(), utc6pm.getTime());
    timeStamps.pvp = nextPvPstamp;

    // Next Rank points cut-off time (-1 hour from PvP reset time)
    //   extra cut-off monthly on JST 2200, the last day of every month,
    //   but points from quest Z cannon not counted after JST 1400.
    let nextPtCutoff = new Date(nextPvPstamp);
    nextPtCutoff.shiftHour(-1);
    if(nextPtCutoff.getTime() < now) nextPtCutoff.shiftHour(13);
    if(nextPtCutoff.getMonth() > new Date(now).getMonth()
        || nextPtCutoff.getFullYear() > new Date(now).getFullYear()) {
        nextPtCutoff.setUTCHours(13, 0, 0, 0);
        if(nextPtCutoff.getTime() < now) {
            nextPtCutoff = new Date(utc6pm.getTime());
            nextPtCutoff.shiftHour(-1);
        }
    }
    timeStamps.rank = nextPtCutoff.getTime();

    // Next monthly expedition reset time (15th JST 1200)
    const utc3am15th = new Date(now);
    utc3am15th.setUTCHours(3, 0, 0, 0);
    utc3am15th.setUTCDate(15);
    if(utc3am15th.getTime() < now) utc3am15th.shiftMonth(1);
    timeStamps.monthlyExped = utc3am15th.getTime();

    return timeStamps;
};

exports.toDeleteMessages = [];

exports.update = async (newMessage) => {    
    let deletion = this.toDeleteMessages.map(td => {try {
        return td.delete()
    } catch (error) {}}).filter(k => k);

    this.toDeleteMessages = [];
    if(!newMessage) return Promise.all(deletion);

    for(let channel of this.client.config.timerChannels) 
        this.toDeleteMessages.push(this.client.channels.get(channel).send(newMessage));
    
    this.toDeleteMessages = await Promise.all(this.toDeleteMessages);
    console.log(`Send ${newMessage}`)

    return Promise.all(deletion);
}