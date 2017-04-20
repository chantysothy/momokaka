module.exports = {
    // link to your database
    // 'url': 'mongodb://momokaka:momokaka1234@ds013926.mlab.com:13926/momokaka',
    // 'options': {
    //     server : { socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 } },
    //     replset : {
    //         socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 }
    //     }
    // }

    // Development mode    
    // link to your database
    'url': 'mongodb://momokaka:momokaka1234@ds149059.mlab.com:49059/test_momokaka',
    'options': {
        server: { socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 } },
        replset: {
            socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 }
        }
    }
}