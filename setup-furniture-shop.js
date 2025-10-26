#!/usr/bin/env node

/**
 * Setup script to create furniture items in Airtable Shop table
 *
 * This script will create furniture shop items with paint chip costs.
 * Run this script after setting up your Airtable environment variables.
 *
 * Usage: node setup-furniture-shop.js
 */

import Airtable from 'airtable';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_KEY || !AIRTABLE_BASE) {
	console.error(
		'❌ Missing Airtable credentials. Please set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in your .env file'
	);
	process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_KEY }).base(AIRTABLE_BASE);

// Furniture items to create in the shop
const furnitureItems = [
	{
		name: 'White Beanbag',
		type: 'furniture',
		paintchips_cost: 5,
		description: 'A cozy white beanbag for relaxing',
		sort: 1
	},
	{
		name: 'Yellow Beanbag',
		type: 'furniture',
		paintchips_cost: 5,
		description: 'A bright yellow beanbag for relaxing',
		sort: 2
	},
	{
		name: 'Blue Bed',
		type: 'furniture',
		paintchips_cost: 15,
		description: 'A comfortable blue bed for sleeping',
		sort: 3
	},
	{
		name: 'Green Bed',
		type: 'furniture',
		paintchips_cost: 15,
		description: 'A comfortable green bed for sleeping',
		sort: 4
	},
	{
		name: 'Red Bed',
		type: 'furniture',
		paintchips_cost: 15,
		description: 'A comfortable red bed for sleeping',
		sort: 5
	},
	{
		name: 'Yellow Bed',
		type: 'furniture',
		paintchips_cost: 15,
		description: 'A comfortable yellow bed for sleeping',
		sort: 6
	},
	{
		name: 'Round Bedside Table',
		type: 'furniture',
		paintchips_cost: 8,
		description: 'A round bedside table for your room',
		sort: 7
	},
	{
		name: 'White Bedside Table',
		type: 'furniture',
		paintchips_cost: 8,
		description: 'A white bedside table for your room',
		sort: 8
	},
	{
		name: 'Wooden Bedside Table',
		type: 'furniture',
		paintchips_cost: 8,
		description: 'A wooden bedside table for your room',
		sort: 9
	},
	{
		name: 'Blue Sofa',
		type: 'furniture',
		paintchips_cost: 12,
		description: 'A comfortable blue sofa for sitting',
		sort: 10
	},
	{
		name: 'Red Sofa',
		type: 'furniture',
		paintchips_cost: 12,
		description: 'A comfortable red sofa for sitting',
		sort: 11
	},
	{
		name: 'Cow Statue',
		type: 'furniture',
		paintchips_cost: 10,
		description: 'A decorative cow statue for your room',
		sort: 12
	},
	{
		name: 'Art Easel',
		type: 'furniture',
		paintchips_cost: 40,
		description: 'Show your drawings to the world!',
		sort: 13
	}
];

async function createFurnitureItems() {
	console.log('🚀 Setting up furniture shop items in Airtable...\n');

	try {
		// Check if items already exist
		console.log('📋 Checking existing shop items...');
		const existingRecords = await base('Shop')
			.select({
				filterByFormula: "{type} = 'furniture'"
			})
			.all();

		const existingNames = existingRecords.map((record) => record.fields.name);
		console.log(
			`Found ${existingRecords.length} existing furniture items: ${existingNames.join(', ')}\n`
		);

		// Filter out items that already exist
		const newItems = furnitureItems.filter((item) => !existingNames.includes(item.name));

		if (newItems.length === 0) {
			console.log('✅ All furniture items already exist in Airtable!');
			return;
		}

		console.log(`📦 Creating ${newItems.length} new furniture items...\n`);

		// Create items in batches (Airtable allows up to 10 records per batch)
		const batchSize = 10;
		for (let i = 0; i < newItems.length; i += batchSize) {
			const batch = newItems.slice(i, i + batchSize);

			console.log(`Creating batch ${Math.floor(i / batchSize) + 1} (${batch.length} items)...`);

			const records = await base('Shop').create(
				batch.map((item) => ({
					fields: {
						name: item.name,
						type: item.type,
						paintchips_cost: item.paintchips_cost,
						description: item.description,
						sort: item.sort,
						coins_cost: 0,
						stellarships_cost: 0,
						'one-time': false
					}
				}))
			);

			console.log(`✅ Created ${records.length} items:`);
			records.forEach((record) => {
				console.log(`   - ${record.fields.name} (${record.fields.paintchips_cost} paint chips)`);
			});
			console.log('');
		}

		console.log('🎉 Successfully set up all furniture shop items!');
		console.log('\n📝 Next steps:');
		console.log('1. Go to your Airtable Shop table');
		console.log('2. Add images for each furniture item (optional)');
		console.log('3. Test the furniture purchase system in your app');
	} catch (error) {
		console.error('❌ Error setting up furniture items:', error);
		process.exit(1);
	}
}

// Run the setup
createFurnitureItems();
