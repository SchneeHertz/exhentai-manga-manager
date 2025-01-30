const path = require('path');
const JSON5 = require('json5');

async function createAndPopulateHashTable(db, mainWindow) {
    /*
     *  assume db is connected to "api_dump.sqlite".
     *  Check whether a hash table exists; if not, create one and extract hash from thumb column in gallery table.
     *  But since 2024-07, hash is no longer encoded in the thumb column
     *  db: created inside import-sqlite
     */
    let createTable = false;
    const tableExistsResult = await db.get(`
        SELECT COUNT(*) AS table_exists
        FROM sqlite_master
        WHERE type = 'table'
          AND name = 'coverhash';
    `)
    if (tableExistsResult.table_exists === 0) {
        createTable = true;
    } else {
        // Check if the table has empty rows
        const rowCountResult = await db.get(`
            SELECT COUNT(*) AS row_count
            FROM coverhash;
        `)

        if (rowCountResult.row_count === 0) {
            createTable = true;
        }
    }
    // create coverhash table if it doesn't exist
    if (createTable) {
        console.log('Creating coverhash table');
        // create table
        await db.run(`
            CREATE TABLE IF NOT EXISTS coverhash
            (
                gid  INTEGER NOT NULL,
                hash TEXT    NOT NULL
            );
        `)
        // extract hash from thumb
        const rows = await db.all('SELECT gid, thumb FROM gallery WHERE thumb IS NOT NULL AND gid IS NOT NULL');
        const totalRows = rows.length;

        const processedHash = rows.map((row, index) => {
            setDbProgressBar(index / totalRows, mainWindow);
            const thumbParts = row.thumb.split('/');
            const lastPart = thumbParts[thumbParts.length - 1];
            const result = lastPart.split('-')[0];
            if (result) {
                return {
                    gid: row.gid,
                    hash: result
                };
            }
            return null;
        }).filter(Boolean);

        await db.exec('BEGIN TRANSACTION');

        try {
            const insertStmt = await db.prepare(`
                INSERT INTO coverhash (gid, hash)
                VALUES (?, ?)
            `);

            for (const item of processedHash) {
                await insertStmt.run(item.gid, item.hash);
            }
            await insertStmt.finalize();
            await db.exec('CREATE INDEX IF NOT EXISTS idx_coverhash_hash ON coverhash (hash)');
            await db.exec('COMMIT');
            setDbProgressBar(-1, mainWindow);
            console.log('Done creating coverhash table');

        } catch (err) {
            console.log(err);
            await db.exec('ROLLBACK');
        }

    }
}

const setDbProgressBar = (progress, mainWindow) => {
    mainWindow.setProgressBar(progress)
    mainWindow.webContents.send('send-action', {
        action: 'send-progress',
        progress
    })
}

const sanitizeTitle = (title) => {
    // Remove spaces and file extension
    title = title.replace(/\s+/g, '')
    return path.parse(title).name;
    // return title;
}

async function createAndPopulateTitleTable(db, mainWindow) {
    /*
     *  assume db is connected to "api_dump.sqlite".
     *  Check whether a title table exists; if not, create one .
     *  use title to match files; all file names are removed of spaces and file extension
     *  db: created inside import-sqlite-filename
     */
    let createTable = false;
    const tableExistsResult = await db.get(`
        SELECT COUNT(*) AS table_exists
        FROM sqlite_master
        WHERE type = 'table'
          AND name = 'filename';
    `)
    if (tableExistsResult.table_exists === 0) {
        createTable = true;
    } else {
        // Check if the table has empty rows
        const rowCountResult = await db.get(`
            SELECT COUNT(*) AS row_count
            FROM filename;
        `)

        if (rowCountResult.row_count === 0) {
            createTable = true;
        }
    }
    // create filename table if it doesn't exist
    if (createTable) {
        console.log('Creating filename table');
        // remove empty spaces and bad characters; same as the jsonlike


        await db.exec('BEGIN TRANSACTION');

        try {
            // create table
            await db.run(`
                CREATE TABLE IF NOT EXISTS filename
                (
                    gid    INTEGER,
                    title  TEXT,
                    source TEXT,
                    PRIMARY KEY (gid, title)
                );
            `)
            // extract title from gallery
            await db.run(`
                INSERT OR IGNORE INTO filename (gid, title, source)
                SELECT gid, REPLACE(title, ' ', ''), 'title'
                FROM gallery
                WHERE title IS NOT NULL`);

            // extract title_jpn from gallery
            await db.run(`
                INSERT OR IGNORE INTO filename (gid, title, source)
                SELECT gid, REPLACE(title_jpn, ' ', ''), 'title_jpn'
                FROM gallery
                WHERE title_jpn IS NOT NULL;
            `);

            // extract titles from torrents column
            const rows = await db.all(`
                SELECT gid, torrents
                FROM gallery
                WHERE torrents IS NOT NULL
                  AND torrents != '[]'
            `);
            const totalRows = rows.length;

            // this step takes a while, so we use the progress bar
            const torrentList = rows.map((row, index) => {
                setDbProgressBar(index / totalRows, mainWindow);
                const {gid, torrents} = row;
                let parsedTorrents = [];
                try {
                    const cleanedString = torrents
                        .replace(/\bTrue\b/g, 'true')
                        .replace(/\bFalse\b/g, 'false')
                        .replace(/\bNone\b/g, 'null');

                    parsedTorrents = JSON5.parse(cleanedString);
                } catch (parseErr) {
                    console.log(parseErr)
                    console.log(`gid: ${gid}, parsedData: ${torrents}`);
                    return [];
                }

                // Extract valid names and sanitize
                return parsedTorrents.map(torrent => {
                    let title = torrent.name || false;
                    if (title) {
                        //  Remove spaces and file extension
                        title = sanitizeTitle(title);
                        return [gid, title];
                    }
                    return null;  // Filter this out later if name is missing
                }).filter(Boolean);  // Remove null/undefined entries
            }).flat();  // Flatten nested arrays
            const stmt = await db.prepare('INSERT OR IGNORE INTO filename (gid, title, source) VALUES (?, ?, "torrent")');
            for (const item of torrentList) {
                await stmt.run(item);
            }
            await stmt.finalize();

            await db.exec('CREATE INDEX IF NOT EXISTS idx_filename_title ON filename (title)');
            await db.exec('COMMIT');
            console.log('Done creating filename table');
            setDbProgressBar(-1, mainWindow);
        } catch (err) {
            console.log(err);
            await db.exec('ROLLBACK');
        }

    }
}

module.exports = {
    createAndPopulateHashTable,
    createAndPopulateTitleTable,
    sanitizeTitle
};