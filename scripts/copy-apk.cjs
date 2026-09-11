const fs = require('fs');
const path = require('path');

const src = 'c:\\Users\\statu\\Desktop\\LA-PALMERA\\android-app\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk';
const destFolder = 'c:\\Users\\statu\\Desktop\\apk android';

if (!fs.existsSync(destFolder)) {
  fs.mkdirSync(destFolder, { recursive: true });
}

fs.copyFileSync(src, path.join(destFolder, 'LaPalmera_v4.apk'));
fs.copyFileSync(src, path.join(destFolder, 'LaPalmera.apk'));

const stats = fs.statSync(path.join(destFolder, 'LaPalmera_v4.apk'));
console.log(`Copied LaPalmera_v4.apk successfully! Size: ${stats.size} bytes`);
