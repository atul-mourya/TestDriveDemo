// vite.config.js
import { splitVendorChunkPlugin } from 'vite';
import { defineConfig } from 'vite';
export default defineConfig( {
	base: '/',
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					'three': [ 'three' ],
					'three/examples/jsm/libs/stats.module': [ 'three/examples/jsm/libs/stats.module' ],
					'three/examples/jsm/loaders/GLTFLoader': [ 'three/examples/jsm/loaders/GLTFLoader' ],
					'three/examples/jsm/loaders/RGBELoader': [ 'three/examples/jsm/loaders/RGBELoader' ],
					'three/examples/jsm/objects/Water2': [ 'three/examples/jsm/objects/Water2' ],
				}
			}
		}
	},
	// optimizeDeps: {
	// 	exclude: [
	// 		'three'
	// 	]
	// },
	plugins: [ splitVendorChunkPlugin() ],
} );
