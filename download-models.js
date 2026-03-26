const fs = require('fs');
const https = require('https');
const path = require('path');

const modelsDir = path.join(__dirname, 'public', 'models');

if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const filesToDownload = [
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model-shard1',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1'
];

filesToDownload.forEach(file => {
    const dest = path.join(modelsDir, file);
    const fileStream = fs.createWriteStream(dest);

    https.get(baseUrl + file, (response) => {
        response.pipe(fileStream);
        fileStream.on('finish', () => {
            console.log(`Downloaded ${file}`);
            fileStream.close();
        });
    }).on('error', (err) => {
        console.error(`Error downloading ${file}: ${err.message}`);
    });
});
