import { getCollection } from 'astro:content';

export async function GET(context) {
    const posts = await getCollection('blog');
    const searchList = posts.map((post) => ({
        title: post.data.title,
        description: post.data.description,
        date: post.data.date,
        slug: `/blog/${post.id}/`,
    }));

    return new Response(JSON.stringify(searchList), {
        headers: {
            'content-type': 'application/json',
        },
    });
}
