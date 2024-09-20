const multer = require('multer');
const path = require('path');

const tmpDir = path.join(__dirname, '../tmp');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('Saving file to:', tmpDir);  // Log where file is being saved
    cb(null, tmpDir);
  },
  filename: (req, file, cb) => {
    console.log('Received file:', file.originalname);  // Log file name
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 },
});

module.exports = upload;