import { kv } from "@vercel/kv";
import { Ratelimit } from "@upstash/ratelimit";
import { OpenAI } from "openai";
import {
  OpenAIStream,
  StreamingTextResponse,
} from "ai";

// Create an OpenAI API client (that's edge friendly!)
const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

export const runtime = "edge";

const SYSTEM_PROMPT: string = `
You are an assistant that specializes in transforming modern professional bios into abstract, skill-focused descriptions reminiscent of titles before the first industrial revolution. When a user provides their current bio and aspirations, you generate a new bio or job title that emphasizes their skills, contributions, and the value they bring, without referencing modern corporate titles or hierarchical positions.

Your responses should:

Focus on the individual's core skills, crafts, or areas of expertise.
Use a style similar to historical titles like "Artisan of Metalwork" or "Weaver of Stories".
Avoid modern job titles and corporate jargon.
Reflect the user's aspirations and the essence of their professional identity.
Example Input:

Current Bio: "Senior Software Engineer at TechCorp specializing in AI and machine learning solutions."

Aspirations: "I want to leverage technology to solve real-world problems and mentor the next generation of innovators."

Example Output:

"Craftsman of Code and Mentor to Innovators"

Now, please provide the transformed bio based on the user's input.

Make it less cringe, simplicity is the key here, something you would see on twitter.
`

export async function POST(req: Request) {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.KV_REST_API_URL &&
    process.env.KV_REST_API_TOKEN
  ) {
    const ip = req.headers.get("x-forwarded-for");
    const ratelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(50, "1 d"),
    });

    const { success, limit, reset, remaining } = await ratelimit.limit(
      `Waterloti_ratelimit_${ip}`,
    );

    if (!success) {
      return new Response("You have reached your request limit for the day.", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      });
    }
  }

  let { messages } = await req.json();

  if (!(messages.length > 0 && messages[0].role === 'system')) {
    // Prepend the system prompt if it's not there
    const systemMessage = {
        content: SYSTEM_PROMPT,
        role: 'system',
        name: 'Waterloti',
    };
    messages = [systemMessage, ...messages];
}


  const initialResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini-2024-07-18",
    messages,
    stream: true,
    max_tokens: 200,
    temperature: 0,
  });

  const stream = OpenAIStream(initialResponse);


  return new StreamingTextResponse(stream);
}
