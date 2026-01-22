import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: z.object({
		title: z.string(),
		description: z.string(),
		// Transformer for compatibility with Jekyll date format if needed, 
		// but standard Date is best.
		// Jekyll dates: "2025-06-27 00:00:00 +0800"
		date: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		heroImage: z.string().optional(),
		// Map Jekyll 'image' object to heroImage if simple string, or keep structure
		image: z.union([
			z.string(),
			z.object({
				path: z.string(),
				alt: z.string().optional()
			})
		]).optional(),
		categories: z.array(z.string()).optional(),
		tags: z.array(z.string()).optional(),
	}),
});

export const collections = { blog };
