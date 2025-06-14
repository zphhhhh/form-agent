import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { entrySystemPrompt, systemPrompt } from "./prompt";

const openai = createOpenAI({
  baseURL: process.env.BASE_URL,
  apiKey: process.env.API_KEY,
});

const model = openai(process.env.MODEL_NAME);

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

app.get("/", (c) => {
  console.log(`[${new Date().toLocaleString()}]`, c.req.url);

  return c.text("Hello Hono!");
});

// 第三步：对单个 form field 进行处理
app.post("/api/chat/form", async (c) => {
  console.log(c.req.url);

  const { messages } = await c.req.json();

  const result = streamText({
    model,
    system: systemPrompt,
    messages: messages,
    maxSteps: 50,
    temperature: 0,
    tools: {
      getHtmlContext: {
        description:
          "get current HTML form field context, such as current DOM tree",
        parameters: z.object({}),
      },
      actionClick: {
        description:
          "trigger click event based on the current html context by css selector",
        parameters: z.object({
          selector: z.string(),
          userRawInput: z.string(),
        }),
      },
      actionInput: {
        description:
          "trigger input event based on the current html context by css selector, should pass the value for input",
        parameters: z.object({
          selector: z.string(),
          value: z.string(),
          userRawInput: z.string(),
        }),
      },
    },
  });

  const stream = result.toDataStreamResponse();

  stream.headers.set("Content-Type", "text/event-stream");

  return stream;
});

app.post("/api/chat/entry", async (c) => {
  console.log(c.req.url);

  const { messages } = await c.req.json();

  const result = streamText({
    model,
    system: entrySystemPrompt,
    messages,
    maxSteps: 50,
    temperature: 0,
    tools: {
      getFormInfo: {
        description: "get current HTML form information.",
        parameters: z.object({}),
      },
    },
  });

  const stream = result.toDataStreamResponse();

  stream.headers.set("Content-Type", "text/event-stream");

  return stream;
});

app.post("/api/chat/common", async (c) => {
  console.log(c.req.url);

  const { messages } = await c.req.json();

  const result = streamText({
    model,
    messages,
    maxSteps: 50,
    temperature: 0,
  });

  const stream = result.toDataStreamResponse();

  stream.headers.set("Content-Type", "text/event-stream");

  return stream;
});

export default {
  port: 3333,
  fetch: app.fetch,
  idleTimeout: 30,
} as Bun.ServeOptions;
