import { useChat } from "@ai-sdk/react";
import { Chat, DragMove, Space, Tag } from "@douyinfe/semi-ui";
import { useSetState } from "ahooks";
import { ToolCall, UIMessage } from "ai";
import { FormAgent } from "./components";
import { roleInfo } from "./const";
import { getCurrentFormInfo, setCurrentForm } from "./tools/utils";

interface State {
  showFormAgent: boolean;
  input?: string;
}

export function Agent() {
  const [state, setState] = useSetState<State>({
    showFormAgent: false,
    input: "",
  });
  const { messages, setMessages, reload, append } = useChat({
    api: "http://localhost:3333/api/chat/entry",
    maxSteps: 50,
    onResponse() {
      setState({ showFormAgent: false });
    },
    async onFinish(message) {
      const raw = message.content.replaceAll("```", "").trim();

      if (raw === "true") {
        setState({ showFormAgent: true });
      }
    },
    async onToolCall({ toolCall }: { toolCall: ToolCall<string, unknown> }) {
      if (toolCall.toolName === "getFormInfo") {
        const formInfo = getCurrentFormInfo();
        return formInfo;
      }

      return null;
    },
  });

  return (
    <div style={{ position: "relative", zIndex: 1001, background: "white" }}>
      <DragMove>
        <div>
          <Chat
            align={"leftRight"}
            mode={"bubble"}
            showClearContext
            showStopGenerate
            onClear={() => {
              setMessages([]);
              setState({ showFormAgent: false });
            }}
            style={{
              border: "1px solid var(--semi-color-border)",
              borderRadius: "16px",
              margin: "8px 16px",
              width: 600,
              height: 500,
              background: "white",
              boxShadow: "0 0 32px rgba(0, 0, 0, 0.1)",
            }}
            chats={messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              createAt: m.createdAt?.getTime(),
              message: m,
            }))}
            onMessageReset={() => reload()}
            chatBoxRenderConfig={{
              renderChatBoxContent(props) {
                const message: UIMessage | undefined = props.message?.message;

                if (!message) return null;

                return (
                  <div style={{ wordBreak: "break-word" }}>
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case "step-start":
                          return (
                            <div
                              key={i}
                              style={{ wordBreak: "break-word" }}
                            ></div>
                          );
                        case "text":
                          return (
                            <div key={i} style={{ wordBreak: "break-word" }}>
                              {part.text === "true" && "稍等，正在处理..."}
                              {part.text === "false" &&
                                "您的输入看起来不包含表单信息"}
                              {part.text !== "true" &&
                                part.text !== "false" &&
                                part.text}
                            </div>
                          );
                        case "tool-invocation":
                          return (
                            <Space
                              key={i}
                              style={{
                                display: "flex",
                                wordBreak: "break-word",
                                margin: "4px 0",
                              }}
                            >
                              {part.toolInvocation.toolName ===
                                "getFormInfo" && (
                                <Tag color="blue">
                                  {part.toolInvocation.toolName}
                                </Tag>
                              )}
                              <div>{part.toolInvocation.args?.selector}</div>
                              <Space>
                                {part.toolInvocation.state === "call" && (
                                  <div style={{ color: "" }}>调用中...</div>
                                )}
                                {part.toolInvocation.state === "result" && (
                                  <div style={{ color: "" }}>调用成功</div>
                                )}
                              </Space>
                            </Space>
                          );
                        default:
                          return (
                            <div key={i} style={{ wordBreak: "break-word" }}>
                              - {JSON.stringify(part)}
                            </div>
                          );
                      }
                    })}
                  </div>
                );
              },
            }}
            roleConfig={roleInfo}
            onMessageDelete={(deletingMessage) => {
              if (!deletingMessage) return;

              const updatedMessages = messages.filter(
                (message) => message.id !== deletingMessage.id
              );

              const lastInput = messages.findLast(
                (message) => message.role === "user"
              );

              setState({ input: lastInput?.content, showFormAgent: false });

              setMessages(updatedMessages);
            }}
            onMessageSend={(content) => {
              setCurrentForm();
              setState({ input: content });
              void append({
                content: content,
                role: "user",
                id: Date.now().toString(),
              });
            }}
          />
        </div>
      </DragMove>

      {state.showFormAgent && (
        <>
          <div style={{ position: "absolute" }}>show form agent</div>
          <FormAgent input={state.input} />
        </>
      )}
    </div>
  );
}
