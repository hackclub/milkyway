/**
 * Centralized furniture catalog
 * Single source of truth for all furniture types, names, costs, and availability
 */

/**
 * @typedef {Object} FurnitureType
 * @property {string} type - Furniture type identifier (matches asset filenames)
 * @property {string} name - Display name
 * @property {number} cost - Cost in paintchips
 * @property {boolean} purchasable - Whether item can be purchased (false = reward-only)
 * @property {boolean} isInteractable - Whether item has interactive functionality
 * @property {import('svelte').SvelteComponent} component - Optional Svelte component for interactive furniture
 */

import ArtEasel from '$lib/components/furniture/ArtEasel.svelte';
import ArcadeCabinet from '$lib/components/furniture/ArcadeCabinet.svelte';
import BulletinBoard from '$lib/components/furniture/BulletinBoard.svelte';

/** @type {FurnitureType[]} */
export const FURNITURE_TYPES = [
	{ type: 'beanbag_white', name: 'white beanbag', cost: 12, purchasable: true },
	{ type: 'beanbag_yellow', name: 'yellow beanbag', cost: 12, purchasable: true },
	{ type: 'bed_simple_blue', name: 'blue bed', cost: 15, purchasable: true },
	{ type: 'bed_simple_green', name: 'green bed', cost: 15, purchasable: true },
	{ type: 'bed_simple_red', name: 'red bed', cost: 15, purchasable: true },
	{ type: 'bed_simple_yellow', name: 'yellow bed', cost: 15, purchasable: true },
	{ type: 'bedside_round', name: 'round bedside table', cost: 8, purchasable: true },
	{ type: 'bedside_white', name: 'white bedside table', cost: 8, purchasable: true },
	{ type: 'bedside_wooden', name: 'wooden bedside table', cost: 8, purchasable: true },
	{ type: 'sofa_blue', name: 'blue sofa', cost: 12, purchasable: true },
	{ type: 'sofa_red', name: 'red sofa', cost: 12, purchasable: true },
	{ type: 'cow_statue', name: 'cow statue', cost: 0, purchasable: false },
	{ type: 'flower_cushion', name: 'flower cushion', cost: 0, purchasable: false },
	{
		type: 'art_easel',
		name: 'art easel',
		cost: 40,
		isInteractable: true,
		component: ArtEasel,
		purchasable: true
	},
	{
		type: 'arcade_cabinet',
		name: 'arcade cabinet',
		cost: 60,
		isInteractable: true,
		component: ArcadeCabinet,
		purchasable: true
	},
	{
		type: 'bulletin_board',
		name: 'bulletin board',
		cost: 30,
		isInteractable: true,
		component: BulletinBoard,
		purchasable: true
	}
];

/** @type {Record<string, FurnitureType>} */
export const FURNITURE_CATALOG = FURNITURE_TYPES.reduce((acc, item) => {
	acc[item.type] = item;
	return acc;
}, {});

/** @type {string[]} */
export const VALID_FURNITURE_TYPES = FURNITURE_TYPES.map((f) => f.type);
