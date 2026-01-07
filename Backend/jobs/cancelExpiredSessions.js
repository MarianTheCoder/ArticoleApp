const cron = require('node-cron');

function scheduleCancelSessions() {
    cron.schedule('0 0 * * *', async () => { // 00:00 UTC
        console.log("🕛 CRON: setez end_time = 17:00 ora RO (DST-aware) pentru ieri...");
        const sql = `
            UPDATE sesiuni_de_lucru
            SET
                status     = 'cancelled',
                end_time   = CONVERT_TZ(TIMESTAMP(session_date,'17:00:00'),'Europe/Bucharest','UTC'),
                updated_at = NOW()
            WHERE status = 'active'
                AND end_time IS NULL
                AND session_date < UTC_DATE() 
            `;
        await global.db.query(sql);
    }, { timezone: 'UTC' });

    console.log("📅 CRON scheduled: Resetare sesiuni expirate");
}

module.exports = scheduleCancelSessions;