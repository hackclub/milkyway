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
 * @property {boolean} wallOnly - Whether item can only be placed on walls
 * @property {boolean} ownerOnly - Whether item is only visible to the owner (default: false)
 * @property {import('svelte').SvelteComponent} component - Optional Svelte component for interactive furniture
 */

import ArtEasel from '$lib/components/furniture/ArtEasel.svelte';
import ArcadeCabinet from '$lib/components/furniture/ArcadeCabinet.svelte';
import BulletinBoard from '$lib/components/furniture/BulletinBoard.svelte';
import StickyNote from '$lib/components/furniture/StickyNote.svelte';
import Tamagotchi from '$lib/components/furniture/Tamagotchi.svelte';

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
		wallOnly: true,
		purchasable: true
	},
	{
		type: 'sticky_note',
		name: 'sticky note',
		cost: 0,
		isInteractable: true,
		component: StickyNote,
		wallOnly: true,
		purchasable: false
	},
	{
		type: 'tamagotchi',
		name: 'tamagotchi',
		cost: 0,
		isInteractable: true,
		component: Tamagotchi,
		purchasable: false,
		ownerOnly: true
	},
	{ type: 'clock_brown', name: 'brown clock', cost: 0, purchasable: false, wallOnly: true },
	{ type: 'floor_lamp', name: 'floor lamp', cost: 0, purchasable: false },
	{ type: 'teddybear', name: 'teddy bear', cost: 0, purchasable: false },
	{ type: 'shelf', name: 'short shelf', cost: 0, purchasable: false },
	{ type: 'fireplace', name: 'fireplace', cost: 0, purchasable: false },
	{ type: 'plant', name: 'plant', cost: 25, purchasable: true },
	{ type: 'table', name: 'table', cost: 15, purchasable: true },
	{ type: 'tall_shelf', name: 'tall shelf', cost: 20, purchasable: true },
	{ type: 'wall_lamp', name: 'wall lamp', cost: 20, purchasable: true, wallOnly: true },
	{ type: 'galaxy_bed', name: 'galaxy bed', cost: 0, purchasable: false },
	{ type: 'galaxy_fishbowl', name: 'galaxy fishbowl', cost: 0, purchasable: false },
	{ type: 'galaxy_window', name: 'galaxy', cost: 0, purchasable: false },
	{ type: 'chair_glitched', name: 'glitched chair', cost: 10, purchasable: true },
	{ type: 'chair_glitched_blue', name: 'glitched chair blue', cost: 10, purchasable: true },
	{ type: 'chair_glitched_green', name: 'glitched chair green', cost: 10, purchasable: true },
	{ type: 'chair_glitched_red', name: 'glitched chair red', cost: 10, purchasable: true },
	{ type: 'bed_glitched', name: 'bed glitched', cost: 20, purchasable: true },
	{ type: 'bed_glitched_blue', name: 'bed glitched blue', cost: 20, purchasable: true },
	{ type: 'bed_glitched_green', name: 'bed glitched green', cost: 20, purchasable: true },
	{ type: 'bed_glitched_red', name: 'bed glitched red', cost: 20, purchasable: true },
	{ type: 'desk_glitched', name: 'desk glitched', cost: 20, purchasable: true },
	{ type: 'desk_glitched_blue', name: 'desk glitched blue', cost: 20, purchasable: true },
	{ type: 'desk_glitched_green', name: 'desk glitched green', cost: 20, purchasable: true },
	{ type: 'desk_glitched_red', name: 'desk glitched red', cost: 20, purchasable: true }
];

/** @type {Record<string, FurnitureType>} */
export const FURNITURE_CATALOG = FURNITURE_TYPES.reduce((acc, item) => {
	acc[item.type] = item;
	return acc;
}, {});

/** @type {string[]} */
export const VALID_FURNITURE_TYPES = FURNITURE_TYPES.map((f) => f.type);
