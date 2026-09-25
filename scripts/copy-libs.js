const fs = require('fs');
const path = require('path');

const libsDir = path.join(__dirname, '..', 'deploy', 'libs');
const fontsDir = path.join(__dirname, '..', 'deploy', 'fonts');

// Criar estrutura de diretórios
const dirs = [
  path.join(libsDir, 'bootstrap', 'css'),
  path.join(libsDir, 'bootstrap', 'js'),
  path.join(libsDir, 'bootstrap-icons', 'font'),
  path.join(libsDir, 'jszip'),
  path.join(libsDir, 'choices.js', 'css'),
  path.join(libsDir, 'choices.js', 'js'),
  path.join(libsDir, 'handlebars'),
  path.join(fontsDir, 'dm-sans'),
  path.join(fontsDir, 'jetbrains-mono')
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${path.relative(process.cwd(), dir)}`);
  }
});

// Copiar arquivos
const filesToCopy = [
  {
    from: path.join(__dirname, '..', 'node_modules', 'bootstrap', 'dist', 'css', 'bootstrap.min.css'),
    to: path.join(libsDir, 'bootstrap', 'css', 'bootstrap.min.css')
  },
  {
    from: path.join(__dirname, '..', 'node_modules', 'bootstrap', 'dist', 'js', 'bootstrap.bundle.min.js'),
    to: path.join(libsDir, 'bootstrap', 'js', 'bootstrap.bundle.min.js')
  },
  {
    from: path.join(__dirname, '..', 'node_modules', 'bootstrap-icons', 'font', 'bootstrap-icons.css'),
    to: path.join(libsDir, 'bootstrap-icons', 'font', 'bootstrap-icons.css')
  },
  {
    from: path.join(__dirname, '..', 'node_modules', 'bootstrap-icons', 'font', 'fonts'),
    to: path.join(libsDir, 'bootstrap-icons', 'font', 'fonts')
  },
  {
    from: path.join(__dirname, '..', 'node_modules', 'jszip', 'dist', 'jszip.min.js'),
    to: path.join(libsDir, 'jszip', 'jszip.min.js')
  },
  {
    from: path.join(__dirname, '..', 'node_modules', 'choices.js', 'public', 'assets', 'styles', 'choices.min.css'),
    to: path.join(libsDir, 'choices.js', 'css', 'choices.min.css')
  },
  {
    from: path.join(__dirname, '..', 'node_modules', 'choices.js', 'public', 'assets', 'scripts', 'choices.min.js'),
    to: path.join(libsDir, 'choices.js', 'js', 'choices.min.js')
  },
  {
    from: path.join(__dirname, '..', 'node_modules', 'handlebars', 'dist', 'handlebars.min.js'),
    to: path.join(libsDir, 'handlebars', 'handlebars.min.js')
  },
  // Fonts - DM Sans (variable)
  {
    from: path.join(__dirname, '..', 'node_modules', '@fontsource-variable', 'dm-sans', 'files'),
    to: path.join(fontsDir, 'dm-sans')
  },
  // Fontes - JetBrains Mono - Monospace
  {
    from: path.join(__dirname, '..', 'node_modules', '@fontsource', 'jetbrains-mono', 'files'),
    to: path.join(fontsDir, 'jetbrains-mono')
  }
];

filesToCopy.forEach(({ from, to }) => {
  try {
    if (fs.existsSync(from)) {
      if (fs.statSync(from).isDirectory()) {
        // Copiar diretório recursivamente
        copyRecursiveSync(from, to);
        console.log(`✓ Copied directory: ${path.relative(libsDir, to)}`);
      } else {
        // Copiar arquivo
        fs.copyFileSync(from, to);
        console.log(`✓ Copied: ${path.relative(libsDir, to)}`);
      }
    } else {
      console.warn(`⚠ File not found: ${from}`);
    }
  } catch (error) {
    console.error(`✗ Error copying ${from}:`, error.message);
    process.exit(1);
  }
});

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('\n✅ Libraries copied successfully!');
