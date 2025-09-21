import { db } from '@/lib/db';
import { gpsCanonicalMetric } from '@/db/schema/gpsCanonicalMetric';

async function getCanonicalMetrics() {
  try {
    console.log('Fetching all canonical metrics from database...');
    
    const metrics = await db.select().from(gpsCanonicalMetric);
    
    console.log(`Found ${metrics.length} canonical metrics:`);
    console.log('\n=== CANONICAL METRICS ===\n');
    
    metrics.forEach((metric, index) => {
      console.log(`${index + 1}. ${metric.code}`);
      console.log(`   Name: ${metric.name}`);
      console.log(`   Description: ${metric.description || 'N/A'}`);
      console.log(`   Category: ${metric.category || 'N/A'}`);
      console.log(`   Dimension: ${metric.dimension}`);
      console.log(`   Canonical Unit: ${metric.canonicalUnit}`);
      console.log(`   Supported Units: ${JSON.stringify(metric.supportedUnits) || 'N/A'}`);
      console.log(`   Is Derived: ${metric.isDerived}`);
      console.log(`   Formula: ${metric.formula || 'N/A'}`);
      console.log(`   Is Active: ${metric.isActive}`);
      console.log(`   Created: ${metric.createdAt}`);
      console.log('   ---');
    });
    
    // Группировка по категориям
    const groupedByCategory = metrics.reduce((acc, metric) => {
      const category = metric.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(metric);
      return acc;
    }, {} as Record<string, typeof metrics>);
    
    console.log('\n=== GROUPED BY CATEGORY ===\n');
    Object.entries(groupedByCategory).forEach(([category, categoryMetrics]) => {
      console.log(`${category} (${categoryMetrics.length} metrics):`);
      categoryMetrics.forEach(metric => {
        console.log(`  - ${metric.code}: ${metric.name} (${metric.dimension})`);
      });
      console.log('');
    });
    
    // Группировка по измерениям
    const groupedByDimension = metrics.reduce((acc, metric) => {
      if (!acc[metric.dimension]) {
        acc[metric.dimension] = [];
      }
      acc[metric.dimension].push(metric);
      return acc;
    }, {} as Record<string, typeof metrics>);
    
    console.log('\n=== GROUPED BY DIMENSION ===\n');
    Object.entries(groupedByDimension).forEach(([dimension, dimensionMetrics]) => {
      console.log(`${dimension} (${dimensionMetrics.length} metrics):`);
      dimensionMetrics.forEach(metric => {
        console.log(`  - ${metric.code}: ${metric.name} (${metric.canonicalUnit})`);
      });
      console.log('');
    });
    
    return metrics;
  } catch (error) {
    console.error('Error fetching canonical metrics:', error);
    throw error;
  }
}

// Запускаем функцию
getCanonicalMetrics()
  .then(() => {
    console.log('\nScript completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
