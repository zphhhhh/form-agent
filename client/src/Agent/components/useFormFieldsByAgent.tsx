import { useChat } from "@ai-sdk/react";
import { Toast } from "@douyinfe/semi-ui";
import { useMount } from "ahooks";
import { useEffect, useState } from "react";
import { getCurrentForm, getTextContentWithSpace } from "../tools/utils";
import { FieldAgent } from "./FieldAgent";

interface FormAgentProps {
  input: string;
  onCancel?: () => void;
}

interface FieldInfo {
  field: string;
  text: string;
}

function generateSplitFormPrompt(input: string, fieldsInfo: FieldInfo[]) {
  return `
你是一个表单填写助手，现在表单的每个字段都有提示信息。请根据提示信息帮用户给出要填写的表单项。

## 示例

用户要填写的表单原始数据：
\`\`\`
公会维度
\`\`\`

当前表单的提示信息：
\`\`\`
[
    {
        "field": "IndicatorTarget",
        "text": "面向目标 公会 主播 经纪人"
    },
    {
        "field": "ApplicationScene",
        "text": "应用场景 人群条件 任务条件"
    }
]
\`\`\`

你需要输出 JSON 数组格式的表单项填写信息：
\`\`\`
[
    {
        "field": "IndicatorTarget",
        "value": "公会"
    }
]
\`\`\`

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

interface Field {
  field: string;
  value: string;
  status?: "running" | "done" | "error";
}

export function useFormFieldsByAgent({ input, onCancel }: FormAgentProps) {
  const [fields, setFields] = useState<Field[]>([]);

  const [isStop, setStop] = useState(false);

  const stop = () => setStop(true);

  const { messages, setMessages, reload, append } = useChat({
    api: "https://boe-api.bytedance.net/api/chat/common",
    async onFinish(message, options) {
      if (isStop) return;

      const raw = message.content.replaceAll(/\`\`\`.*/g, "").trim();
      const fieldAction: Field[] = JSON.parse(raw);

      console.log("🚀 [zph] ~ onFinish ~ raw:", raw, fieldAction);

      if (!Array.isArray(fieldAction)) {
        return;
      }

      const nextFields = fields.slice();

      for (const field of fieldAction) {
        if (nextFields.every((f) => f.field !== field.field)) {
          nextFields.push(field);
          continue;
        }
      }

      setFields(nextFields);
    },
  });

  const recognise = () => {
    if (!input) {
      return;
    }

    const form = getCurrentForm();

    if (!form) {
      return;
    }

    const fieldElements = Array.from(form.querySelectorAll("[x-field-id]"));

    const fieldsInfo = fieldElements
      .map((element) => {
        return {
          field: element.getAttribute("x-field-id") || "",
          text: getTextContentWithSpace(element),
        };
      })
      .filter((field) => fields.every((f) => f.field !== field.field));

    console.log("🚀🚀🚀 [zph] ~ recognise:", fieldsInfo);

    setMessages([
      {
        content: generateSplitFormPrompt(input, fieldsInfo),
        role: "user",
        id: Date.now().toString(),
      },
    ]);

    setTimeout(reload);
  };

  useEffect(() => {
    const handleCancel = () => {
      if (isStop) {
        return;
      }

      setFields([]);
      stop();
      Toast.info("表单助手已关闭");
      onCancel?.();
    };

    document.addEventListener("mousedown", handleCancel);

    return () => {
      document.removeEventListener("mousedown", handleCancel);
    };
  }, [onCancel, fields]);

  useMount(() => {
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

    void append({
      content: generateSplitFormPrompt(input, fieldsInfo),
      role: "user",
      id: Date.now().toString(),
    });
  });

  const handleFieldDone = (field: string) => {
    setFields((prevFields) => {
      const nextFields: Field[] = prevFields.map((f) =>
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

          Toast.success("表单填写完成!");

          setFields([]);
        }, 0);
      }

      return nextFields;
    });
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
