#!/usr/bin/env node

/**
 * Script to fetch all supported chains from LiFi API and save to JSON
 * Run this once to update the chain list
 */

const fs = require('fs')
const path = require('path')

const LIFI_API_BASE = 'https://li.quest/v1'
const OUTPUT_FILE = path.join(__dirname, 'lifi-chains.json')

async function fetchChains() {
  try {
    console.log('Fetching chains from LiFi API...')
    const response = await fetch(`${LIFI_API_BASE}/chains`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch chains: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // The API returns { chains: [...] }, extract just the chains array
    const chains = data.chains || data
    
    // Save raw data
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(chains, null, 2))
    console.log(`✅ Saved ${chains.length} chains to ${OUTPUT_FILE}`)
    
    return chains
  } catch (error) {
    console.error('Error fetching chains:', error)
    process.exit(1)
  }
}

fetchChains()
