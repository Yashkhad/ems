const https = require('https');
const fs = require('fs');

const url = 'https://104.18.2.161/all_commits/605197351a3c8bdd595af2d2a9bc3025bca48ea2/windows/query_engine.dll.node.gz';
const dest = './query_engine.dll.node.gz';

const options = {
    hostname: '104.18.2.161',
    port: 443,
    path: '/all_commits/605197351a3c8bdd595af2d2a9bc3025bca48ea2/windows/query_engine.dll.node.gz',
    method: 'GET',
    headers: {
        'Host': 'binaries.prisma.sh'
    },
    servername: 'binaries.prisma.sh'
};

const req = https.request(options, (res) => {
    console.log('Status Code:', res.statusCode);
    if (res.statusCode === 200) {
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log('Download complete.');
        });
    } else {
        console.error('Failed to download:', res.statusCode);
    }
});

req.on('error', (e) => {
    console.error('Request error:', e.message);
});

req.end();
