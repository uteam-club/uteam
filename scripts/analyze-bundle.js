#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Analyzing bundle size...\n');

try {
  // Создаем production build
  console.log('📦 Creating production build...');
  execSync('npm run build', { stdio: 'inherit' });

  // Анализируем bundle size
  console.log('\n📊 Bundle analysis:');
  
  const buildDir = path.join(__dirname, '..', '.next', 'static', 'chunks');
  
  if (fs.existsSync(buildDir)) {
    const files = fs.readdirSync(buildDir);
    const jsFiles = files.filter(file => file.endsWith('.js'));
    
    console.log(`\n📁 Found ${jsFiles.length} JavaScript chunks:`);
    
    let totalSize = 0;
    const fileSizes = jsFiles.map(file => {
      const filePath = path.join(buildDir, file);
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      totalSize += stats.size;
      
      return {
        file,
        size: stats.size,
        sizeKB: parseFloat(sizeKB)
      };
    }).sort((a, b) => b.size - a.size);

    fileSizes.forEach(({ file, sizeKB }) => {
      const size = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(2)} MB` : `${sizeKB} KB`;
      console.log(`  ${file}: ${size}`);
    });

    const totalSizeKB = (totalSize / 1024).toFixed(2);
    const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
    
    console.log(`\n📈 Total bundle size: ${totalSizeKB} KB (${totalSizeMB} MB)`);
    
    // Анализируем GPS компоненты
    const gpsFiles = fileSizes.filter(({ file }) => 
      file.includes('gps') || file.includes('GPS')
    );
    
    if (gpsFiles.length > 0) {
      console.log('\n🎯 GPS-related chunks:');
      gpsFiles.forEach(({ file, sizeKB }) => {
        const size = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(2)} MB` : `${sizeKB} KB`;
        console.log(`  ${file}: ${size}`);
      });
    }

    // Рекомендации по оптимизации
    console.log('\n💡 Optimization recommendations:');
    
    const largeFiles = fileSizes.filter(({ sizeKB }) => sizeKB > 100);
    if (largeFiles.length > 0) {
      console.log('  ⚠️  Large files detected:');
      largeFiles.forEach(({ file, sizeKB }) => {
        console.log(`    - ${file}: ${sizeKB} KB`);
      });
      console.log('    Consider code splitting or lazy loading');
    }

    const totalSizeMB = parseFloat(totalSizeMB);
    if (totalSizeMB > 5) {
      console.log('  ⚠️  Total bundle size is large (>5MB)');
      console.log('    Consider tree shaking and removing unused code');
    }

    if (totalSizeMB < 2) {
      console.log('  ✅ Bundle size is optimized (<2MB)');
    }

  } else {
    console.log('❌ Build directory not found');
  }

} catch (error) {
  console.error('❌ Error analyzing bundle:', error.message);
  process.exit(1);
}

console.log('\n✅ Bundle analysis complete!');
