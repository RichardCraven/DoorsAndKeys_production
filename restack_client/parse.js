const fs = require('fs');
const babel = require('@babel/core');

const code = fs.readFileSync('src/pages/DungeonPage.js', 'utf8');

try {
  babel.parseSync(code, {
    presets: ['@babel/preset-react'],
    filename: 'src/pages/DungeonPage.js'
  });
  console.log("Success");
} catch (e) {
  console.error(e.message);
}
