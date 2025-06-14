import { Message } from "ai";

export function generateNextMessages(messages: Message[]) {
  return messages.map((message) => {
    if (message.role === "assistant" && Array.isArray(message.parts)) {
      return {
        ...message,
        parts: message.parts.slice(-2).map((part) => {
          if (part.type === "tool-invocation") {
            return {
              ...part,
              toolInvocation: {
                ...part.toolInvocation,
                step: 0,
              },
            };
          }
          return part;
        }),
        toolInvocations: message.toolInvocations
          ?.slice(-1)
          .map((toolInvocation) => {
            return {
              ...toolInvocation,
              step: 0,
            };
          }),
      };
    }

    return message;
  });
}
