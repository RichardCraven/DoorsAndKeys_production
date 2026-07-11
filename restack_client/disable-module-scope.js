const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'node_modules', 'react-scripts', 'config', 'webpack.config.js');

if (fs.existsSync(configPath)) {
  console.log('Disabling ModuleScopePlugin to allow symlinked monorepo resolution...');
  let content = fs.readFileSync(configPath, 'utf8');
  
  // Replace the ModuleScopePlugin instantiation with an empty comment
  const target = /new ModuleScopePlugin\([\s\S]*?\),?/;
  if (target.test(content)) {
    content = content.replace(target, '/* disabled ModuleScopePlugin */');
    fs.writeFileSync(configPath, content, 'utf8');
    console.log('Successfully disabled ModuleScopePlugin.');
  } else {
    console.log('ModuleScopePlugin was already disabled or not found.');
  }
} else {
  console.log('webpack.config.js not found at standard path.');
}
