#!/usr/bin/env node

const { execSync } = require('child_process')

async function seedData() {
  try {
    console.log('🌱 Seeding database with mock data...')

    // Run the seed mutation
    const result = execSync('bunx convex run seedDatabase --no-verify', {
      stdio: 'inherit',
      cwd: process.cwd(),
    })

    console.log('✅ Database seeded successfully!')
  } catch (error) {
    console.error('❌ Error seeding database:', error.message)
    process.exit(1)
  }
}

async function clearData() {
  try {
    console.log('🧹 Clearing database...')

    // Run the clear mutation
    const result = execSync('bunx convex run clearDatabase --no-verify', {
      stdio: 'inherit',
      cwd: process.cwd(),
    })

    console.log('✅ Database cleared successfully!')
  } catch (error) {
    console.error('❌ Error clearing database:', error.message)
    process.exit(1)
  }
}

// Command line interface
const command = process.argv[2]

if (command === 'clear') {
  clearData()
} else if (command === 'seed' || !command) {
  seedData()
} else {
  console.log('Usage:')
  console.log('  node scripts/seed-data.js [seed|clear]')
  console.log('  seed - Populate database with mock data (default)')
  console.log('  clear - Clear all data from database')
  process.exit(1)
}
