const got = require('got');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const {fromEnv} = require('@aws-sdk/credential-provider-env');

// a client can be shared by difference commands.
const client = new S3Client({
    region: 'eu-north-1',
    credentials: fromEnv(),
});

let cachedData = false;

module.exports = {
    get: async () => {
        if(cachedData){
            return cachedData;
        }

        try {
            const remoteDataResponse = await got('https://tarkov-data.s3.eu-north-1.amazonaws.com/data.json', {
                responseType: 'json',
            });
            cachedData = remoteDataResponse.body;
        } catch (gotError){
            console.error(gotError);

            return false;
        }

        return cachedData;
    },
    update: async (newData) => {
        const uploadParams = {
            Bucket: 'tarkov-data',
            Key: 'data.json',
            Body: JSON.stringify(newData, null, 4),
            ContentType: 'application/json',
        };

        try {
            const data = await client.send(new PutObjectCommand(uploadParams));
            console.log('Success', data);
        } catch (err) {
            console.log('Error', err);
        }
    },
};