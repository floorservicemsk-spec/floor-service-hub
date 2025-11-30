import { createClient } from 'npm:@base44/sdk@0.1.0';

Deno.serve(async (req) => {
  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), { status: 400 });
    }

    const response = await fetch(url);

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch URL: ${response.statusText}` }), { status: response.status });
    }

    const text = await response.text();
    
    return new Response(text, {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});