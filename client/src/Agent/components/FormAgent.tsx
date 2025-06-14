import { useChat } from "@ai-sdk/react";
import { Toast } from "@douyinfe/semi-ui";
import { useLatest, useMount } from "ahooks";
import { useEffect, useState } from "react";
import { getCurrentForm, getTextContentWithSpace } from "../tools/utils";
import { FieldAgent } from "./FieldAgent";

interface FormAgentProps {
  input?: string;
  onCancel?: () => void;
}

interface FieldInfo {
  field: string;
  text: string;
}

function generateSplitFormPrompt(input: string, fieldsInfo: FieldInfo[]) {
  return `
你是一个表单填写助手，现在表单的每个字段都有提示信息。请根据提示信息帮用户给出要填写的表单项。

## 限制

1. 你只需要输出表单项的填写信息，不需要输出其他内容。
2. 输入内容为 JSON 格式。
3. 不要输出 \`\`\` 等任何其他内容。

## 提示

- 日期类型的字段，格式可以转换为 YYYY-MM-DD。根据当前日期 ${new Date().toUTCString()} 来转换。

## 任务

现在用户给出要输入的表单信息：
${input || ""}

当前表单的提示信息：
${JSON.stringify(fieldsInfo)}

请输出需要填写的表单项。
`.trim();
}

export function FormAgent({ input, onCancel }: FormAgentProps) {
  const [fields, setFields] = useState<
    {
      field: string;
      value: string;
      status?: "runnning" | "done" | "error";
    }[]
  >([]);
  const [doneCount, setDoneCount] = useState(0);
  const [fieldsCache, setFieldsCache] = useState<string[]>([]);
  const latestFields = useLatest(fields);
  const latestFieldsCacheRef = useLatest(fieldsCache);

  const { setMessages, reload } = useChat({
    api: "https://boe-api.bytedance.net/api/chat/common",
    async onFinish(message, options) {
      // {field, value}[]
      const raw = message.content.replaceAll(/\`\`\`.*/g, "").trim();
      try {
        const fieldAction = JSON.parse(raw);
        console.log("🚀 [zph] ~ onFinish ~ raw:", raw, fieldAction);

        if (Array.isArray(fieldAction) && fieldAction.length > 0) {
          const newFields = fieldAction.map((field) => ({
            field: field.field,
            value: field.value,
          }));

          setFields((pre) => [...pre, ...newFields]);
        } else {
        }
      } catch (error) {
        console.error("Failed to parse response:", error);
      }
    },
  });

  useEffect(() => {
    const handleCancel = () => {
      if (fields.length === 0) {
        return;
      }

      setFields([]);
      Toast.info("表单助手已关闭");
      onCancel?.();
    };

    document.addEventListener("mousedown", handleCancel);

    return () => {
      document.removeEventListener("mousedown", handleCancel);
    };
  }, [onCancel, fields]);

  const plan = () => {
    if (!input) {
      return;
    }

    const form = getCurrentForm();
    if (!form) {
      return;
    }

    const fieldsInfo = Array.from(form.querySelectorAll("[x-field-id]")).map(
      (element) => {
        return {
          field: element.getAttribute("x-field-id") || "",
          text: getTextContentWithSpace(element),
        };
      }
    );

    const newFieldsInfo = fieldsInfo.filter((item) =>
      latestFieldsCacheRef.current.every((field) => field !== item.field)
    );

    if (newFieldsInfo.length > 0) {
      console.log("🚀 [zph] ~ plan ~ newFieldsInfo:", newFieldsInfo, fields);

      void setMessages([
        {
          content: generateSplitFormPrompt(input, newFieldsInfo),
          role: "user",
          id: Date.now().toString(),
        },
      ]);

      setFieldsCache([
        ...latestFieldsCacheRef.current,
        ...newFieldsInfo.map((item) => item.field),
      ]);

      setTimeout(reload);

      return;
    }

    setDoneCount((preDoneCount) => {
      const newDoneCount = preDoneCount + 1;

      console.log(
        "🚀 [zph] ~ newDoneCount:",
        newDoneCount,
        latestFields.current.length,
        latestFields.current
      );

      if (newDoneCount === latestFields.current.length) {
        Toast.success("表单助手填写完成!");
        console.log("🚀 [zph] Form Agent end at", new Date().toLocaleString());
      }
      return newDoneCount;
    });
  };

  useMount(() => {
    plan();
    console.log("🚀 [zph] Form Agent start at", new Date().toLocaleString());
  });

  const handleFieldDone = (field: string) => {
    setFields((prevFields) => {
      const nextFields: {
        field: string;
        value: string;
        status?: "runnning" | "done" | "error";
      }[] = prevFields.map((f) =>
        f.field === field ? { ...f, status: "done" } : f
      );

      console.log(
        "🚀 [zph] ~ handleFieldDone:",
        field,
        nextFields,
        nextFields.filter((f) => f.status !== "done").length
      );

      if (nextFields.every((f) => f.status === "done")) {
        console.log("🚀 [zph] ~ handleFieldDone ~ data:", nextFields);

        setTimeout(() => {
          document
            .querySelectorAll("[data-popupid][aria-expanded=true]")
            .forEach((el) => {
              el.dispatchEvent(
                new KeyboardEvent("keydown", {
                  key: "Escape",
                  code: "Escape",
                  keyCode: 27,
                  bubbles: true,
                  cancelable: true,
                })
              );
            });

          plan();
        }, 0);
      }

      return nextFields;
    });

    plan();
  };

  return fields.map((field) => (
    <FieldAgent
      key={field.field}
      field={field.field}
      value={field.value}
      onDone={handleFieldDone}
    />
  ));
}
