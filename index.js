const http = require('http');
const crypto = require('crypto');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

let addr = process.argv[2];
if (!addr) {
    addr = '0.0.0.0:8080';
}
addr = addr.split(':');
const host = addr[0];
const port = addr[1];

function md5(str) {
    return crypto.createHash('md5').update(str).digest("hex");
}

function formatDateNum(num) {
    if (num < 10) {
        num = '0' + num;
    }

    return num;
}

function currentTime() {
    const dt = new Date();

    let timezone = dt.getTimezoneOffset();
    let sign = '-';
    if (timezone < 0) {
        sign = '+';
    }
    timezone = Math.abs(timezone);
    let timezoneHours = Math.trunc(timezone / 60);
    let timezoneMinutes = timezone % 60;

    timezone = sign + formatDateNum(timezoneHours) +
                      formatDateNum(timezoneMinutes)
    ;
    

    return dt.getFullYear() + '-' +
           formatDateNum(dt.getMonth() + 1) + '-' +
           formatDateNum(dt.getDate()) + ' ' +
           formatDateNum(dt.getHours()) + ':' +
           formatDateNum(dt.getMinutes()) + ':' +
           formatDateNum(dt.getSeconds()) + ' ' +
           timezone
    ;
}

function startWorker(cb) {
    http.createServer(function(request, response) {
        if (request.url !== '/') {
            response.statusCode = 404;
            response.end();
            return;
        }
    
        if (request.method !== 'POST') {
            response.statusCode = 405;
            response.end();
            return;
        }
    
        let bodyRaw = '';
        request.on('readable', function() {
            var chunk;

            while (null !== (chunk = request.read())) {
                bodyRaw += chunk.toString();
            }
        });
    
        request.on('end', function() {
            let body;
            try {
                body = JSON.parse(bodyRaw);
            } catch (e) {
                response.statusCode = 400;
                response.end();
                return;
            }
    
            let responseBody = {
                first_name: body.first_name + md5(body.first_name),
                last_name: body.last_name + md5(body.last_name),
                id: body.id,
                say: 'JS is best',
                current_time: currentTime(),
            };
    
            let responseBodyRaw = JSON.stringify(responseBody);
    
            response.setHeader('Content-Type', 'application/json');
            response.setHeader('Content-Length', responseBodyRaw.length);

            response.end(responseBodyRaw);
            return;
    
        });
    }).listen({ host, port });

    cb();
}

if (cluster.isMaster) {
    console.log('Server listen on ' + addr.join(':'));

    console.log(`Master ${process.pid} is running`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker) => {
        console.log(`worker ${worker.process.pid} died`);
    });
} else {
    startWorker(function() {
        console.log(`Worker ${process.pid} started`);
    });
}
