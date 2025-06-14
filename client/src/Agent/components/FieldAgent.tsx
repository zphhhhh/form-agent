import { useChat } from "@ai-sdk/react";
import { useMount } from "ahooks";
import { ToolCall } from "ai";
import { actionClick, actionInput, getHtmlContext } from "../tools";
import { getCurrentForm } from "../tools/utils";

interface FieldAgentProps {
  field: string;
  value?: string;
  onDone?: (field: string) => void;
}

export function FieldAgent({ field, value, onDone }: FieldAgentProps) {
  const { append } = useChat({
    api: "https://boe-api.bytedance.net/api/chat/form",
    maxSteps: 15,
    async onFinish(message, options) {
      const raw = message.content;

      if (raw.includes("DONE")) {
        onDone?.(field);
      }
    },
    async onToolCall({ toolCall }: { toolCall: ToolCall<string, unknown> }) {
      const container = document.querySelector(
        `[x-field-id="${field}"]`
      ) as HTMLElement;

      if (toolCall.toolName === "getHtmlContext") {
        const form = getCurrentForm();
        const result = await getHtmlContext(`[x-field-id="${field}"]`);

        return result;
      }

      if (toolCall.toolName === "actionClick") {
        const result = await actionClick({
          selector: (toolCall.args as { selector: string }).selector as string,
          container,
        });

        return {
          result: result,
        };
      }

      if (toolCall.toolName === "actionInput") {
        const result = await actionInput({
          selector: (toolCall.args as { selector: string }).selector as string,
          value: (toolCall.args as { value: string }).value as string,
          container,
        });

        return {
          result: result,
        };
      }

      return null;
    },
  });

  useMount(() => {
    console.log("FieldAgent mounted", field, value);

    const html = getHtmlContext(`[x-field-id="${field}"]`);

    void append({
      content: `${field} 表单项对应的值是 ${value}\n\n当前 html 是：\n\n${html}`,
      role: "user",
      id: Date.now().toString(),
    });
  });

  return null;
}
