const fs = require('fs');
const path = require('path');

const source = 'C:\\Users\\statu\\.gemini\\antigravity-ide\\brain\\fb3809ff-c66d-4833-88ed-95643882f592\\salchicha_app_icon_1789068479114.jpg';
const baseRes = path.resolve(__dirname, '../android-app/android/app/src/main/res');

const mipmaps = [
  'mipmap-mdpi',
  'mipmap-hdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi'
];

mipmaps.forEach(m => {
  const dir = path.join(baseRes, m);
  if (fs.existsSync(dir)) {
    fs.copyFileSync(source, path.join(dir, 'ic_launcher.png'));
    fs.copyFileSync(source, path.join(dir, 'ic_launcher_round.png'));
    fs.copyFileSync(source, path.join(dir, 'ic_launcher_foreground.png'));
    console.log(`Copied icon to ${m}`);
  }
});
